# Steg 3c: glTF-kompatibla material för alla delar + Cycles-detaljer (riktig SSS, porer som bump).
# Kopierar och bearbetar MakeHumans CC0-texturer till <WORK>/tex.
# Kör: blender -b <WORK>/step3a.blend --python tools/blender/step3c_materials.py
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy, bmesh
from common import WORK

TEX = os.path.join(WORK, 'tex')
INFO = json.load(open(os.path.join(TEX, 'tex_info.json')))
MH = os.path.join(os.environ['APPDATA'], r'Blender Foundation\Blender\5.1\extensions\.user\blender_org\mpfb\data')
obj = lambda part: next(o for o in bpy.data.objects if o.type == 'MESH' and part in o.name)

# ------------------------------------------------------------------ bildhjälp
def img_np(path):
    im = bpy.data.images.load(path, check_existing=False)
    W, H = im.size; a = np.array(im.pixels[:], np.float32).reshape(H, W, 4)
    bpy.data.images.remove(im); return a

def np_save(arr, name, size=None):
    H, W = arr.shape[:2]
    im = bpy.data.images.new(name, W, H, alpha=True, float_buffer=False)
    im.pixels.foreach_set(np.clip(arr, 0, 1).astype(np.float32).ravel())
    if size and size != W: im.scale(size, size)
    im.filepath_raw = os.path.join(TEX, name + '.png'); im.file_format = 'PNG'; im.save()
    bpy.data.images.remove(im)
    return os.path.join(TEX, name + '.png')

def remove_logos(a):
    """T-tröjans textur har MakeHuman-loggor (bröst, rygg, ärm). De målas över med tygets egen
    färg, och tröjan får en lite mindre bländande vit ton."""
    H, W = a.shape[:2]
    rgb = a[..., :3]
    boxes = [(0.17, 0.09, 0.33, 0.18), (0.43, 0.09, 0.65, 0.21), (0.71, 0.13, 0.79, 0.19)]  # x0, y0, x1, y1 uppifrån
    lum = rgb @ np.array([0.3, 0.59, 0.11]); sat = rgb.max(-1) - rgb.min(-1)
    for x0, y0, x1, y1 in boxes:
        r0, r1 = int((1 - y1) * H), int((1 - y0) * H); c0, c1 = int(x0 * W), int(x1 * W)
        reg = rgb[r0:r1, c0:c1]
        bad = (sat[r0:r1, c0:c1] > 0.08) | (lum[r0:r1, c0:c1] < np.median(lum[r0:r1, c0:c1]) - 0.08)
        # växa masken några pixlar
        for _ in range(4):
            bad = bad | np.roll(bad, 1, 0) | np.roll(bad, -1, 0) | np.roll(bad, 1, 1) | np.roll(bad, -1, 1)
        good = ~bad
        fill = np.median(reg[good], axis=0) if good.any() else np.array([0.85, 0.85, 0.85])
        noise = (np.random.default_rng(3).random(reg.shape[:2]) - 0.5)[..., None] * 0.02
        reg[bad] = (fill + noise)[bad]
    shirt = np.zeros(lum.shape, bool); shirt[int(0.58 * H):, :] = True
    rgb[shirt] = rgb[shirt] * np.array([0.93, 0.93, 0.94])
    a[..., :3] = rgb
    return a

def soften_alpha_card(a, iters=16):
    """Hårkort: fyll färgen ut i de genomskinliga delarna (annars ljusa kanter när texturen
    filtreras och mipmappas) och mjuka upp alfakanten en aning."""
    rgb, al = a[..., :3].copy(), a[..., 3].copy()
    cov = al > 0.5
    for _ in range(iters):
        acc = np.zeros_like(rgb); cnt = np.zeros(cov.shape, np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            acc += np.roll(np.roll(rgb * cov[..., None], dy, 0), dx, 1)
            cnt += np.roll(np.roll(cov, dy, 0), dx, 1)
        grow = (~cov) & (cnt > 0)
        rgb[grow] = acc[grow] / cnt[grow][:, None]
        cov = cov | grow
    blur = sum(np.roll(np.roll(al, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)) / 9.0
    a[..., :3] = rgb; a[..., 3] = np.clip(blur * 1.15, 0, 1)
    return a

def prep_assets():
    out = {}
    c = MH + r'\clothes\male_casualsuit06\male_casualsuit06_'
    out['cloth_albedo'] = np_save(remove_logos(img_np(c + 'diffuse.png')), 'cloth_albedo')
    out['cloth_normal'] = np_save(img_np(c + 'normal.png'), 'cloth_normal')
    ao = img_np(c + 'ao.png'); orm = np.zeros_like(ao); orm[..., 0] = ao[..., 0]; orm[..., 1] = 0.82; orm[..., 3] = 1
    out['cloth_orm'] = np_save(orm, 'cloth_orm')
    out['shoes_albedo'] = np_save(img_np(MH + r'\clothes\shoes06\shoes06_diffuse.png'), 'shoes_albedo')
    out['socks_albedo'] = np_save(img_np(MH + r'\clothes\joepal_crude_low_socks\CrudeLowSocksDiffuse.png'), 'socks_albedo', 512)
    hair = img_np(MH + r'\hair\short01\short01_diffuse.png')
    hair[..., :3] *= np.array([1.0, 0.92, 0.85]) * 0.95       # varmare mörkbrun
    hair = soften_alpha_card(hair)
    out['hair_albedo'] = np_save(hair, 'hair_albedo', 1024)
    out['brow_albedo'] = np_save(img_np(MH + r'\eyebrows\eyebrow001\eyebrow001.png'), 'brow_albedo')
    out['lash_albedo'] = np_save(img_np(MH + r'\eyelashes\eyelashes02\eyelashes02.png'), 'lash_albedo')
    out['teeth_albedo'] = np_save(img_np(MH + r'\teeth\teeth_base\teeth.png'), 'teeth_albedo', 512)
    # Ögon: ljusbrun iris, lite nedtonad; ögonvitan inte helt vit (grå-rosa ton finns redan i texturen)
    eye = img_np(MH + r'\eyes\materials\brownlight_eye.png')
    rgb = eye[..., :3]; lum = rgb @ np.array([0.3, 0.59, 0.11])
    sat = rgb - lum[..., None]
    iris = (np.abs(sat).sum(-1) > 0.12) & (lum < 0.6)
    rgb[iris] = (lum[..., None] + sat * 0.7)[iris] * 0.82
    rgb[~iris] = rgb[~iris] * np.array([1.0, 0.985, 0.96])
    eye[..., :3] = rgb
    out['eye_albedo'] = np_save(eye, 'eye_albedo')
    return out

A = prep_assets()

# ------------------------------------------------------------------ materialbyggare
def tex_node(nt, path, non_color=False, uv=None, loc=(0, 0)):
    t = nt.nodes.new('ShaderNodeTexImage'); t.location = loc
    t.image = bpy.data.images.load(path, check_existing=True)
    if non_color: t.image.colorspace_settings.name = 'Non-Color'
    if uv:
        m = nt.nodes.new('ShaderNodeUVMap'); m.uv_map = uv; m.location = (loc[0] - 200, loc[1])
        nt.links.new(m.outputs[0], t.inputs[0])
    return t

def gltf_output_group():
    g = bpy.data.node_groups.get('glTF Material Output')
    if g: return g
    g = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
    g.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    g.nodes.new('NodeGroupInput')
    return g

def pbr(name, albedo=None, normal=None, orm=None, rough=0.5, alpha=False, uv='UVMap', sss=None, detail=None, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); out.location = (600, 0)
    b = nt.nodes.new('ShaderNodeBsdfPrincipled'); b.location = (200, 0)
    nt.links.new(b.outputs[0], out.inputs[0])
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if albedo:
        t = tex_node(nt, albedo, uv=uv, loc=(-500, 300))
        nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
        if alpha:
            nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
            m.surface_render_method = 'DITHERED'
    if orm:
        t = tex_node(nt, orm, True, uv=uv, loc=(-500, 0))
        sep = nt.nodes.new('ShaderNodeSeparateColor'); sep.location = (-200, 0)
        nt.links.new(t.outputs['Color'], sep.inputs[0])
        nt.links.new(sep.outputs['Green'], b.inputs['Roughness'])
        g = nt.nodes.new('ShaderNodeGroup'); g.node_tree = gltf_output_group(); g.location = (200, -500)
        nt.links.new(sep.outputs['Red'], g.inputs['Occlusion'])
    if normal:
        t = tex_node(nt, normal, True, uv=uv, loc=(-500, -300))
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.location = (-200, -300); nm.uv_map = uv
        nt.links.new(t.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
        if detail:
            # Porer: kakelbar höjdkarta som bump ovanpå normalkartan (bara Cycles; tas bort vid export).
            tc = nt.nodes.new('ShaderNodeTexCoord'); tc.location = (-900, -600)
            mp = nt.nodes.new('ShaderNodeMapping'); mp.location = (-700, -600)
            mp.inputs['Scale'].default_value = (detail, detail, 1)
            dh = tex_node(nt, os.path.join(TEX, 'skin_detail_height.png'), True, loc=(-500, -600))
            nt.links.new(tc.outputs['UV'], mp.inputs[0]); nt.links.new(mp.outputs[0], dh.inputs[0])
            bump = nt.nodes.new('ShaderNodeBump'); bump.location = (0, -400); bump.name = 'DetailBump'
            bump.inputs['Strength'].default_value = 0.35; bump.inputs['Distance'].default_value = 0.00015
            nt.links.new(dh.outputs['Color'], bump.inputs['Height'])
            nt.links.new(nm.outputs['Normal'], bump.inputs['Normal'])
            nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    if sss:
        b.inputs['Subsurface Weight'].default_value = 1.0
        b.inputs['Subsurface Radius'].default_value = (1.0, 0.32, 0.16)
        b.inputs['IOR'].default_value = 1.4
        t = tex_node(nt, sss, True, uv=uv, loc=(-500, -900))
        sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(t.outputs['Color'], sep.inputs[0])
        ma = nt.nodes.new('ShaderNodeMath'); ma.operation = 'MULTIPLY_ADD'
        ma.inputs[1].default_value = 0.0035; ma.inputs[2].default_value = 0.0012
        nt.links.new(sep.outputs['Red'], ma.inputs[0]); nt.links.new(ma.outputs[0], b.inputs['Subsurface Scale'])
    return m

T = lambda n: os.path.join(TEX, n + '.png')
TILE = 0.012   # porkaklets storlek i meter
mb = pbr('Skin_Body', T('body_albedo'), T('body_normal'), T('body_orm'), uv='UVMap', sss=T('body_masks'), detail=INFO['body_m_per_uv'] / TILE)
ma = pbr('Skin_Arm', T('arm_albedo'), T('arm_normal'), T('arm_orm'), uv='UVArm', sss=T('arm_masks'), detail=INFO['arm_m_per_uv'] / TILE)
body = obj('Patient.body')
body.data.materials[0] = mb; body.data.materials[1] = ma

def assign(o, m):
    o.data.materials.clear(); o.data.materials.append(m)
assign(obj('casualsuit'), pbr('Clothes', A['cloth_albedo'], A['cloth_normal'], A['cloth_orm']))
assign(obj('shoes'), pbr('Shoes', A['shoes_albedo'], rough=0.55))
assign(obj('socks'), pbr('Socks', A['socks_albedo'], rough=0.9))
assign(obj('short01'), pbr('Hair', A['hair_albedo'], rough=0.55, alpha=True))
assign(obj('eyebrow'), pbr('Brows', A['brow_albedo'], rough=0.6, alpha=True))
assign(obj('eyelashes'), pbr('Lashes', A['lash_albedo'], rough=0.6, alpha=True))
assign(obj('teeth'), pbr('Teeth', A['teeth_albedo'], rough=0.3))

# Ögon: glob (iris + ögonvita) och hornhinna (genomskinlig, blank, "fuktig")
eye_ball = pbr('Eye', A['eye_albedo'], rough=0.3)
eb = eye_ball.node_tree.nodes['Principled BSDF']
eb.inputs['Subsurface Weight'].default_value = 0.3; eb.inputs['Subsurface Scale'].default_value = 0.002
cornea = pbr('Cornea', rough=0.0)
cb = cornea.node_tree.nodes['Principled BSDF']
cb.inputs['Transmission Weight'].default_value = 1.0; cb.inputs['IOR'].default_value = 1.376
cb.inputs['Base Color'].default_value = (1, 1, 1, 1)
cornea.surface_render_method = 'BLENDED'
for e in ('Eye_L', 'Eye_R'):
    o = bpy.data.objects[e]
    o.data.materials.clear(); o.data.materials.append(eye_ball); o.data.materials.append(cornea)
    bm = bmesh.new(); bm.from_mesh(o.data)
    uvl = bm.loops.layers.uv.active
    for f in bm.faces:
        u = sum(l[uvl].uv.x for l in f.loops) / len(f.loops); v = sum(l[uvl].uv.y for l in f.loops) / len(f.loops)
        f.material_index = 1 if (u > 0.86 and v < 0.14) else 0
    bm.to_mesh(o.data); bm.free()

for o in bpy.data.objects:
    if o.type == 'MESH':
        for p in o.data.polygons: p.use_smooth = True
# kudden (pillow.py) har ett enkelt material med textil råhet; behåll det
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, 'step3c.blend'))
print('STEP3C OK')
