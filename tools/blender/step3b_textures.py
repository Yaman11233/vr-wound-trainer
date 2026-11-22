# Steg 3b: hudtexturer från bakade datakartor (position, normal, AO, masker) + MakeHumans CC0-hud.
# Allt räknas per texel i 3D (världsposition i ställd viloställning), så att mönster inte bryts av UV-skarvar.
# Utdata i <WORK>/tex/: {body,arm}_albedo.png (sRGB), _normal.png, _orm.png (R=AO, G=råhet),
# _masks.png (R=SSS-tjocklek, G=blekhetsprioritet, B=svettområde), samt skin_detail_normal.png (porer, kakel).
# Kör: blender -b --python tools/blender/step3b_textures.py
import os, sys, json, math, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy
from common import WORK, arg

TEX = os.path.join(WORK, 'tex')
LM = json.load(open(os.path.join(WORK, 'landmarks.json')))
REP = json.load(open(os.path.join(WORK, 'step2_report.json')))
rng = np.random.default_rng(35)
T0 = time.time()
def log(*a): print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)

V = lambda a: np.asarray(a, dtype=np.float64)
def bl(app): return V([app[0], -app[2], app[1]])     # app -> blender
def nrm(v): return v / (np.linalg.norm(v, axis=-1, keepdims=True) + 1e-12)
def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
def gauss(d, s): return np.exp(-(d / s) ** 2)

# ------------------------------------------------------------------ brus (vektoriserat)
def _hash(ix, iy, iz, seed=0):
    h = (ix.astype(np.int64) * 73856093) ^ (iy.astype(np.int64) * 19349663) ^ (iz.astype(np.int64) * 83492791) ^ (seed * 2654435761)
    h = h & 0xFFFFFFFF
    h ^= h >> 13; h = (h * 0x5bd1e995) & 0xFFFFFFFF; h ^= h >> 15
    return (h & 0xFFFFFF).astype(np.float64) / float(0x1000000)

def vnoise(P, freq, seed=0):
    Q = P * freq
    i = np.floor(Q); f = Q - i
    i = i.astype(np.int64)
    u = f * f * (3 - 2 * f)
    acc = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (u[:, 0] if dx else 1 - u[:, 0]) * (u[:, 1] if dy else 1 - u[:, 1]) * (u[:, 2] if dz else 1 - u[:, 2])
                acc = acc + w * _hash(i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz, seed)
    return acc * 2 - 1

def fbm(P, freq, octaves=4, seed=0, gain=0.5):
    s, a, f = 0, 1.0, freq
    for o in range(octaves):
        s = s + a * vnoise(P, f, seed + o * 17); a *= gain; f *= 2.03
    return s

# ------------------------------------------------------------------ in/ut
def load(name):
    img = bpy.data.images.load(os.path.join(TEX, name + '.exr'))
    W, H = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)
    bpy.data.images.remove(img)
    return a

def lin2srgb(x):
    x = np.clip(x, 0, 1); return np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(x, 1 / 2.4) - 0.055)

def dilate(img, cov, iters=24):
    img = img.copy(); cov = cov.copy()
    for _ in range(iters):
        acc = np.zeros_like(img); cnt = np.zeros(cov.shape, np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            sh = np.roll(np.roll(img, dy, 0), dx, 1); sc = np.roll(np.roll(cov, dy, 0), dx, 1)
            acc += sh * sc[..., None]; cnt += sc
        grow = (~cov) & (cnt > 0)
        img[grow] = acc[grow] / cnt[grow][:, None]
        cov = cov | grow
    img[~cov] = img[cov].mean(0)
    return img

def save(name, arr, srgb=False):
    H, W, C = arr.shape
    out = np.ones((H, W, 4), np.float32)
    out[..., :C] = lin2srgb(arr) if srgb else np.clip(arr, 0, 1)
    img = bpy.data.images.new(name, W, H, alpha=False, float_buffer=False)
    img.pixels.foreach_set(out.ravel())
    img.filepath_raw = os.path.join(TEX, name + '.png'); img.file_format = 'PNG'
    img.save(); bpy.data.images.remove(img)
    log('sparad', name)

# ------------------------------------------------------------------ landmärken
def bone(n, tail=False): return V(LM[n]['tail' if tail else 'head'])
eyeL, eyeR = V(LM['Eye_L']), V(LM['Eye_R'])
EC = (eyeL + eyeR) / 2
hf = nrm(bl(REP['head_fwd_app'])); hu = bl(REP['head_up_app'])
hl = nrm(eyeL - eyeR)                                # patientens vänster
hu = nrm(hu - hf * hu.dot(hf) - hl * hu.dot(hl))

FINGERS = ('thumb', 'index', 'middle', 'ring', 'pinky')
def hand_frame(s):
    W_ = bone('hand_' + s)
    d = nrm(bone('middle_01_' + s) - W_)
    across = bone('index_01_' + s) - bone('pinky_01_' + s)
    across = nrm(across - d * across.dot(d))          # mot radialsidan (tummen)
    n = nrm(np.cross(d, across))
    # handflatan åt det håll fingrarna böjer sig
    tip = bone('middle_03_' + s, True); mcp = bone('middle_01_' + s)
    if n.dot(tip - mcp - d * (tip - mcp).dot(d)) < 0: n = -n
    Lh = np.linalg.norm(bone('middle_01_' + s) - W_)
    return W_, d, across, n, Lh

def seg_dist(P, A, B):
    """Avstånd till sträckan A–B och parameter t (0..1)."""
    AB = B - A; t = np.clip(((P - A) @ AB) / (AB @ AB), 0, 1)
    C = A + t[:, None] * AB
    return np.linalg.norm(P - C, axis=1), t, C

def poly_dist(P, pts, N=None):
    """Tangentiellt avstånd (längs ytan) till en polylinje i 3D."""
    best = np.full(len(P), 1e9); tt = np.zeros(len(P)); L = len(pts) - 1
    for k in range(L):
        d, t, C = seg_dist(P, pts[k], pts[k + 1])
        if N is not None:
            D = P - C; D = D - N * np.sum(D * N, 1, keepdims=True); d = np.linalg.norm(D, axis=1)
        m = d < best; best[m] = d[m]; tt[m] = (k + t[m]) / L
    return best, tt

def forearm_frame(s):
    E = bone('lowerarm_' + s); Wr = bone('hand_' + s)
    a = nrm(Wr - E); L = np.linalg.norm(Wr - E)
    _, _, across, n, _ = hand_frame(s)
    b1 = nrm(n - a * n.dot(a))                         # volart
    b2 = nrm(np.cross(a, b1))
    if b2.dot(across) < 0: b2 = -b2                    # b2 = radialt
    return E, a, L, b1, b2

def forearm_pt(s, t, phi, r=0.034):
    E, a, L, b1, b2 = forearm_frame(s)
    return E + a * (t * L) + (b1 * math.cos(phi) + b2 * math.sin(phi)) * r

# ------------------------------------------------------------------ hudens detaljer
def synth(kind):
    log('==', kind)
    pos = load(kind + '_pos'); nr = load(kind + '_nrm'); ao = load(kind + '_ao')
    base = load(kind + '_base'); mA = load(kind + '_maskA')
    mB = load('body_maskB') if kind == 'body' else np.zeros_like(mA)
    H, Wd = pos.shape[:2]
    cov = pos[..., :3].sum(-1) > 1.0
    idx = np.nonzero(cov)
    P = pos[..., :3][idx].astype(np.float64) - 10.0
    N = nrm(nr[..., :3][idx].astype(np.float64) * 2 - 1)
    alb = base[..., :3][idx].astype(np.float64)
    lips, ears, nails = mA[..., 0][idx], mA[..., 1][idx], mA[..., 2][idx]
    scalp = mB[..., 0][idx]
    n = len(P); log('texlar', n)
    hgt = np.zeros(n)                                  # höjd i meter (+ = upphöjt)
    rough = np.full(n, 0.5)
    sss = np.full(n, 0.35); pallor = np.full(n, 0.3); sweat = np.full(n, 0.08)

    def tint(w, mul):
        nonlocal alb
        alb = alb * (1 - w[:, None]) + alb * V(mul)[None, :] * w[:, None]

    # --- grundton: lätt varmare och mer mättad än MakeHuman-texturen (som är blek), ojämn färg
    lum = alb @ V([0.2126, 0.7152, 0.0722])
    alb = lum[:, None] + (alb - lum[:, None]) * 1.12
    alb *= V([1.03, 1.0, 0.97])
    if kind == 'arm':
        alb *= V([0.97, 0.92, 0.91])   # armens del av MakeHuman-texturen är ljusare än ansiktet
    m1 = fbm(P, 9.0, 3, seed=1); m2 = fbm(P, 45.0, 3, seed=2); m3 = fbm(P, 160.0, 2, seed=3)
    alb *= (1 + 0.07 * m1 + 0.055 * m2 + 0.03 * m3)[:, None]
    alb *= (1 + V([0.025, -0.01, -0.02])[None, :] * fbm(P, 22.0, 3, seed=4)[:, None])

    # --- ansikte (bara kroppstexturen)
    if kind == 'body':
        R = P - EC
        x, y, z = R @ hl, R @ hu, R @ hf
        nose_tip = EC + hf * 0.035 - hu * 0.045
        w_nose = gauss(np.linalg.norm(P - nose_tip, axis=1), 0.016)
        tint(0.35 * w_nose, [1.07, 0.86, 0.86])
        for sx in (-1, 1):
            cheek = EC + hl * (0.038 * sx) - hu * 0.035 + hf * 0.012
            tint(0.28 * gauss(np.linalg.norm(P - cheek, axis=1), 0.022), [1.06, 0.88, 0.88])
        chin = EC - hu * 0.115 + hf * 0.03
        tint(0.12 * gauss(np.linalg.norm(P - chin, axis=1), 0.02), [1.04, 0.92, 0.92])
        tint(0.3 * ears, [1.08, 0.86, 0.86])
        # mörkare under ögonen (lätt trött)
        for e in (eyeL, eyeR):
            ub = e - hu * 0.018 + hf * 0.006
            tint(0.18 * gauss(np.linalg.norm(P - ub, axis=1), 0.011), [0.9, 0.86, 0.9])
        # skäggstubb: geometriskt område i ansiktets koordinater, utan läppar och öron
        ax = np.abs(x)
        y_top = np.interp(ax, [0.0, 0.02, 0.04, 0.062, 0.08], [-0.052, -0.05, -0.036, -0.004, 0.012])
        front = smooth(-0.095, -0.07, z)
        beard = smooth(0.008, -0.016, y - y_top + 0.004 * fbm(P, 60, 2, seed=9)) * smooth(-0.2, -0.15, y) * front * (1 - smooth(0.15, 0.5, lips)) * (1 - smooth(0.2, 0.5, ears))
        beard *= (0.85 + 0.15 * fbm(P, 30, 2, seed=8))
        dots = smooth(0.25, 0.75, vnoise(P, 1500.0, 21) * 0.5 + 0.5)
        tint(beard * (0.2 + 0.4 * dots), [0.52, 0.48, 0.52])
        hgt += beard * dots * 0.00005
        rough = rough + 0.08 * beard
        # pannan och näsan blankare (talg), läppar
        tz = smooth(0.012, 0.03, y) * smooth(0.09, 0.06, y) * smooth(-0.02, 0.0, z) * smooth(0.06, 0.035, ax)
        rough = rough - 0.08 * tz - 0.08 * w_nose
        rough = rough * (1 - 0.25 * lips) + 0.38 * 0.25 * lips
        tint(0.25 * lips, [1.05, 0.88, 0.9])
        # masker
        sss = np.maximum(sss, ears * 1.0); sss = np.maximum(sss, 0.7 * gauss(np.linalg.norm(P - nose_tip, axis=1), 0.022))
        sss = np.maximum(sss, 0.6 * lips)
        for e in (eyeL, eyeR):
            sss = np.maximum(sss, 0.5 * gauss(np.linalg.norm(P - e - hf * 0.01, axis=1), 0.018))
        face = gauss(np.linalg.norm(P - (EC - hu * 0.04 + hf * 0.02), axis=1), 0.075) * front
        pallor = np.maximum(pallor, 0.8 * face); pallor = np.maximum(pallor, lips); pallor = np.maximum(pallor, 0.6 * ears)
        forehead = smooth(0.015, 0.03, y) * smooth(0.1, 0.075, y) * smooth(-0.03, 0.0, z) * smooth(0.065, 0.045, ax)
        upperlip = smooth(-0.07, -0.062, y) * smooth(-0.048, -0.055, y) * smooth(0.028, 0.018, ax) * smooth(-0.01, 0.01, z)
        temples = smooth(0.0, 0.02, y) * smooth(0.07, 0.05, y) * smooth(0.045, 0.06, ax) * front
        sweat = np.maximum.reduce([sweat, forehead, upperlip, 0.6 * w_nose, 0.5 * temples])
        # hårbotten under håret: lite mörkare, inga porer att tala om
        # MakeHumans hud har blont hår målat på hårbotten, som syns där hårkorten är glesa
        # (en gul fläck på hjässan). Måla hårbotten i hårets mörkbruna ton i stället.
        hs = smooth(0.15, 0.6, scalp)
        hair_col = V([0.075, 0.055, 0.045]) * (1 + 0.25 * fbm(P, 300.0, 2, seed=40))[:, None]
        alb = alb * (1 - 0.88 * hs[:, None]) + hair_col * 0.88 * hs[:, None]
        rough = rough + 0.1 * scalp
        # nevi: ett på halsen, ett på kinden
        for c, r in ((EC - hu * 0.15 + hl * 0.045 + hf * 0.0, 0.0012), (EC - hu * 0.045 - hl * 0.055 + hf * 0.01, 0.0009)):
            tint(0.6 * gauss(np.linalg.norm(P - c, axis=1), r), [0.55, 0.42, 0.36])

    # --- händer och underarmar (båda sidor; vänster finns i kroppstexturen, höger i armtexturen)
    for s in ('r', 'l'):
        W_, d, across, pn, Lh = hand_frame(s)
        E, a, L, b1, b2 = forearm_frame(s)
        near = np.linalg.norm(P - (E + W_) / 2, axis=1) < 0.35
        if not near.any(): continue
        volar_h = np.clip(N @ pn, -1, 1)
        # knogar och fingerleder: rodnad och mörkare på dorsalsidan
        for f in FINGERS:
            for j in ('01', '02', '03'):
                J = bone(f'{f}_{j}_{s}')
                dj = np.linalg.norm(P - J, axis=1)
                dors = smooth(0.1, 0.5, -volar_h)
                wj = gauss(dj, 0.011 if j == '01' else 0.008) * dors
                tint(0.3 * wj, [1.0, 0.86, 0.85]); tint(0.25 * wj, [0.9, 0.88, 0.88])
                rough = rough + 0.06 * wj
                # dorsala knogveck (PIP och DIP): koncentriska rynkor
                if j in ('02', '03'):
                    fd = nrm(bone(f'{f}_{j}_{s}', True) - J)
                    sax = (P - J) @ fd
                    rad = np.linalg.norm((P - J) - np.outer(sax, fd), axis=1)
                    inside = smooth(0.014, 0.009, rad) * dors * smooth(0.008, 0.004, np.abs(sax))
                    wr = 0.5 + 0.5 * np.cos(sax / 0.0016 * math.pi)
                    hgt -= inside * wr * 0.00009
                    tint(0.12 * inside * wr, [0.85, 0.82, 0.82])
                # volara fingerveck vid PIP, DIP och fingrets bas
                if f != 'thumb' or j != '01':
                    fd = nrm(bone(f'{f}_{j}_{s}', True) - J)
                    off = -0.004 if j == '01' else 0.0
                    sax = (P - J) @ fd - off
                    rad = np.linalg.norm((P - J) - np.outer((P - J) @ fd, fd), axis=1)
                    vol = smooth(0.2, 0.55, volar_h) * smooth(0.013, 0.008, rad)
                    c = gauss(sax - 0.001, 0.00045) + gauss(sax + 0.0012, 0.00045) * 0.7
                    hgt -= vol * c * 0.00038
                    tint(0.4 * vol * c, [0.75, 0.66, 0.66])
            # fingertoppar rosa, SSS i fingrarna
            tip = bone(f'{f}_03_{s}', True)
            tint(0.22 * gauss(np.linalg.norm(P - tip, axis=1), 0.012), [1.05, 0.87, 0.88])
            dfin, _, _ = seg_dist(P, bone(f'{f}_01_{s}'), tip)
            sss = np.maximum(sss, 0.8 * smooth(0.016, 0.009, dfin))
            pallor = np.maximum(pallor, 0.5 * smooth(0.016, 0.009, dfin))
        # handflatans veck i handens koordinater (a längs handen, c radialt)
        def hp(aa, cc, lift=0.0): return W_ + d * (aa * Lh) + across * cc + pn * lift
        creases = [
            [hp(0.80, -0.042), hp(0.83, -0.02), hp(0.87, 0.0), hp(0.93, 0.016)],          # distala tvärfåran
            [hp(0.74, 0.036), hp(0.70, 0.015), hp(0.66, -0.005), hp(0.62, -0.022)],        # proximala tvärfåran
            [hp(0.72, 0.03), hp(0.6, 0.02), hp(0.42, 0.014), hp(0.22, 0.006), hp(0.06, 0.0)],  # thenarfåran
        ]
        palm = smooth(0.3, 0.6, volar_h) * smooth(0.07, 0.05, np.linalg.norm(P - (W_ + d * Lh * 0.5), axis=1))
        for cr in creases:
            dc, tc = poly_dist(P, [V(p) for p in cr], N)
            w = gauss(dc, 0.0006) * palm * (0.6 + 0.4 * np.sin(tc * math.pi))
            hgt -= w * 0.0005; tint(0.45 * w, [0.74, 0.62, 0.62])
        tint(0.12 * palm, [1.04, 0.92, 0.9]); rough = rough + 0.05 * palm
        pallor = np.maximum(pallor, 0.55 * palm); sweat = np.maximum(sweat, 0.4 * palm)
        # underarmens cylinderkoordinater
        rel = P - E; t = (rel @ a) / L
        rv = rel - np.outer(rel @ a, a)
        phi = np.arctan2(rv @ b2, rv @ b1)                  # 0 = volart, + = radialt
        rr = np.linalg.norm(rv, axis=1)
        onarm = smooth(-0.15, 0.0, t) * smooth(1.08, 1.0, t) * smooth(0.06, 0.045, rr)
        # handledsveck (volart)
        vol = smooth(0.15, 0.5, np.cos(phi)) * onarm
        for k, (tc, dep) in enumerate(((0.985, 0.00032), (0.955, 0.00026), (0.925, 0.00016))):
            tt = t - tc - 0.006 * np.sin(phi * 2.0 + k)
            c = gauss(tt * L, 0.00055)
            hgt -= vol * c * dep; tint(0.28 * vol * c * dep / 0.0003, [0.8, 0.72, 0.72])
        # senor vid volara handleden: FCR (radialt), PL (mitten), FCU (ulnart), distala ~7 cm
        for ph0, amp, wdt in ((0.42, 0.0009, 0.0035), (-0.05, 0.0007, 0.003), (-1.2, 0.0007, 0.004)):
            ph_t = ph0 + 0.25 * (1 - t) * np.sign(ph0) * (abs(ph0) > 0.1)
            dd = (phi - ph_t) * rr
            w = gauss(dd, wdt) * smooth(0.62, 0.78, t) * smooth(1.0, 0.93, t) * onarm
            hgt += w * amp
        # ytliga vener
        veins = [
            (s, [(0.05, 1.25), (0.3, 1.32), (0.55, 1.2), (0.8, 1.05), (1.0, 0.95)], 0.0028, 0.5),     # v. cephalica
            (s, [(0.1, -1.35), (0.4, -1.4), (0.7, -1.55), (1.0, -1.7)], 0.003, 0.45),                  # v. basilica
            (s, [(0.1, 0.25), (0.35, 0.05), (0.6, -0.12), (0.85, 0.05), (1.0, 0.18)], 0.0022, 0.35),   # v. mediana antebrachii
            (s, [(0.45, 0.05), (0.65, 0.55), (0.9, 0.85)], 0.0016, 0.25),                               # gren
            (s, [(0.75, -0.6), (0.9, -0.35), (1.0, -0.1)], 0.0012, 0.25),                               # små vener vid handleden
        ]
        for side, ctrl, wd, strength in veins:
            pts = [forearm_pt(side, tt_, ph_ + 0.08 * math.sin(tt_ * 9 + len(ctrl))) for tt_, ph_ in ctrl]
            dv, tv = poly_dist(P, pts, N)
            w = gauss(dv, wd) * onarm * (0.7 + 0.3 * tv)
            tint(min(1.0, strength * 1.4) * w, [0.8, 0.86, 1.02]); hgt += w * 0.0005 * strength / 0.5
        # handryggens vennät
        dors_h = smooth(0.15, 0.5, -volar_h)
        for f in ('index', 'middle', 'ring', 'pinky'):
            pass
        mids = [(bone('index_01_' + s) + bone('middle_01_' + s)) / 2, (bone('middle_01_' + s) + bone('ring_01_' + s)) / 2,
                (bone('ring_01_' + s) + bone('pinky_01_' + s)) / 2]
        for k, m0 in enumerate(mids):
            pts = [m0 - pn * 0.01, W_ + d * (Lh * (0.55 - 0.08 * k)) + across * (0.012 * (1 - k)) - pn * 0.012, W_ + across * (0.018 - 0.02 * k) - pn * 0.014]
            dv, tv = poly_dist(P, pts, N)
            w = gauss(dv, 0.0022) * dors_h * smooth(0.06, 0.04, np.linalg.norm(P - (W_ + d * Lh * 0.5), axis=1))
            tint(0.45 * w, [0.82, 0.88, 1.02]); hgt += w * 0.0007
        # fint hår på underarmen: strån längs armen mot handleden, tätare dorsalt/ulnart
        aa = t * L; bb = phi * 0.034
        dens = 0.25 + 0.75 * smooth(0.3, -0.6, np.cos(phi + 0.4))
        dens *= smooth(0.05, 0.2, t) * smooth(1.02, 0.9, t) * onarm
        hair = np.zeros(n)
        CA, CB = 0.0035, 0.0016
        ia = np.floor(aa / CA).astype(np.int64); ib = np.floor(bb / CB).astype(np.int64)
        for da in (-2, -1, 0):
            for db in (-1, 0, 1):
                ca_, cb_ = ia + da, ib + db
                hr = _hash(ca_, cb_, np.full_like(ca_, 7), 3 if s == 'r' else 4)
                keep = hr < dens
                oa = _hash(ca_, cb_, np.full_like(ca_, 11)) * CA; ob = _hash(ca_, cb_, np.full_like(ca_, 13)) * CB
                ln = 0.004 + 0.003 * _hash(ca_, cb_, np.full_like(ca_, 17))
                ang = (_hash(ca_, cb_, np.full_like(ca_, 19)) - 0.5) * 0.5 - 0.25
                sa, sb = ca_ * CA + oa, cb_ * CB + ob
                ea, eb = sa + np.cos(ang) * ln, sb + np.sin(ang) * ln
                pa, pb = aa - sa, bb - sb; qa, qb = ea - sa, eb - sb
                tq = np.clip((pa * qa + pb * qb) / (qa * qa + qb * qb), 0, 1)
                dd = np.hypot(pa - tq * qa, pb - tq * qb)
                hair = np.maximum(hair, keep * gauss(dd, 0.00011) * (1 - 0.6 * tq))
        tint(0.6 * hair, [0.38, 0.3, 0.26])
        # naglar: nagelband (proximal kant), vitare fri kant, liten variation per nagel
        if nails.max() > 0.1:
            for f in FINGERS:
                tip = bone(f'{f}_03_{s}', True); J = bone(f'{f}_03_{s}')
                fd = nrm(tip - J)
                close = np.linalg.norm(P - tip, axis=1) < 0.02
                w = nails * close
                if w.max() < 0.1: continue
                sax = (P - J) @ fd / np.linalg.norm(tip - J)
                v = rng.uniform(-0.03, 0.03, 3)
                tint(w, [1.0 + v[0], 0.93 + v[1], 0.92 + v[2]])
                edge = smooth(0.15, 0.4, nails) * smooth(0.75, 0.4, nails) * close
                cut = edge * smooth(0.65, 0.45, sax)
                tint(0.45 * cut, [0.92, 0.78, 0.74]); rough = rough + 0.2 * cut
                free = w * smooth(0.82, 0.95, sax)
                tint(0.5 * free, [1.12, 1.1, 1.08])
                rough = rough * (1 - 0.7 * w) + 0.22 * 0.7 * w
                pallor = np.maximum(pallor, w)
                sss = np.maximum(sss, 0.5 * w)
                hgt += w * 0.00012
        # nevi på underarmen (inte i sårområdet distalt volart)
        for tt_, ph_, rad in ((0.35, -2.2, 0.0011), (0.22, 0.9, 0.0008), (0.5, 2.6, 0.001)) if s == 'r' else ((0.4, 2.0, 0.0012),):
            c = forearm_pt(s, tt_, ph_, 0.036)
            dn = np.linalg.norm(P - c, axis=1)
            tint(0.65 * gauss(dn, rad), [0.5, 0.38, 0.32]); hgt += gauss(dn, rad) * 0.0001
        # armbåge (vänster syns): lite mörkare och strävare
        el = gauss(np.linalg.norm(P - (E - b1 * 0.035), axis=1), 0.03)
        tint(0.2 * el, [0.9, 0.86, 0.85]); rough = rough + 0.08 * el

    # --- skrynkligare hud i lederna (handleden volart redan); allmän mikrovariation i råhet
    rough = rough + 0.06 * fbm(P, 70.0, 2, seed=30)
    rough = np.clip(rough, 0.2, 0.75)

    # ------------------------------------------------------------- normalkarta från höjden
    Hmap = np.zeros((H, Wd)); Hmap[idx] = hgt
    Pm = np.zeros((H, Wd, 3)); Pm[idx] = P
    def diff(arr, axis):
        fwd = np.roll(arr, -1, axis); bwd = np.roll(arr, 1, axis)
        cf = np.roll(cov, -1, axis); cb = np.roll(cov, 1, axis)
        both = cf & cb
        num = np.where(both[..., None] if arr.ndim == 3 else both, (fwd - bwd) / 2,
                       np.where((cf[..., None] if arr.ndim == 3 else cf), fwd - arr, np.where((cb[..., None] if arr.ndim == 3 else cb), arr - bwd, 0)))
        return num
    dHu, dHv = diff(Hmap, 1), diff(Hmap, 0)
    dPu, dPv = diff(Pm, 1), diff(Pm, 0)
    su = np.linalg.norm(dPu, axis=-1) + 1e-6; sv = np.linalg.norm(dPv, axis=-1) + 1e-6
    nx, ny = -dHu / su, -dHv / sv
    nz = np.ones_like(nx)
    NT = np.stack([nx, ny, nz], -1); NT = NT / np.linalg.norm(NT, axis=-1, keepdims=True)
    mpu = float(np.median(su[cov])) * Wd                 # meter per UV-enhet (för detaljkaklet)
    log('meter per UV-enhet', mpu)

    def grid(vals, ch):
        g = np.zeros((H, Wd, ch), np.float32); g[idx] = vals.reshape(len(P), ch); return g
    albedo = dilate(grid(np.clip(alb, 0, 1), 3), cov)
    normal = dilate((NT * 0.5 + 0.5).astype(np.float32), cov)
    aoc = np.power(np.clip(ao[..., 0], 0, 1), 0.6)
    orm = dilate(np.stack([aoc, np.zeros((H, Wd)), np.zeros((H, Wd))], -1).astype(np.float32), cov)
    orm[..., 1] = dilate(grid(rough, 1), cov)[..., 0]
    masks = dilate(grid(np.stack([sss, pallor, sweat], -1), 3), cov)
    save(kind + '_albedo', albedo, srgb=True)
    save(kind + '_normal', normal)
    save(kind + '_orm', orm)
    save(kind + '_masks', masks)
    return mpu

def detail_tile(S=512):
    """Kakelbar mikronormal: porer (celler) och fina hudlinjer i två riktningar."""
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float64) / S
    h = np.zeros((S, S))
    # porer: slumpade små gropar, periodiska
    cells = 70
    pts = rng.uniform(0, 1, (cells * cells // 2, 2))
    for (px, py) in pts:
        dx = (xx - px + 0.5) % 1 - 0.5; dy = (yy - py + 0.5) % 1 - 0.5
        r2 = (dx * dx + dy * dy) * (S * S)
        h -= np.exp(-r2 / 2.2) * rng.uniform(0.5, 1.0)
    # hudlinjer (rombmönster)
    for ang, freq, amp in ((0.5, 9, 0.35), (-0.7, 11, 0.3), (1.4, 23, 0.15)):
        u = xx * math.cos(ang) + yy * math.sin(ang)
        k = round(freq * (abs(math.cos(ang)) + abs(math.sin(ang))))
        h -= amp * np.power(np.abs(np.sin(math.pi * (xx * round(freq * math.cos(ang)) + yy * round(freq * math.sin(ang))))), 6)
    h = (h - h.mean()) / h.std()
    save('skin_detail_height', np.repeat(((h - h.min()) / (h.max() - h.min()))[..., None], 3, -1).astype(np.float32))
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / 2; gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / 2
    k = 0.35
    NT = np.stack([-gx * k, -gy * k, np.ones_like(h)], -1); NT /= np.linalg.norm(NT, axis=-1, keepdims=True)
    save('skin_detail_normal', (NT * 0.5 + 0.5).astype(np.float32))

which = arg('only', 'body,arm,detail').split(',')
info = {}
if 'detail' in which: detail_tile()
for k in ('body', 'arm'):
    if k in which: info[k + '_m_per_uv'] = synth(k)
p = os.path.join(TEX, 'tex_info.json')
old = json.load(open(p)) if os.path.exists(p) else {}
old.update(info); json.dump(old, open(p, 'w'), indent=2)
log('STEP3B OK', info)
