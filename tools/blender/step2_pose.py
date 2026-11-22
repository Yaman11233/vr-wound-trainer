# Steg 2: shape keys (blinkning, uttryck, andning), rensning, halvsittande ställning på britsen,
# posen bakas in som ny viloställning, ögon som egna objekt, sårankare.
# Kör: blender -b <WORK>/step1_human.blend --python tools/blender/step2_pose.py
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from mathutils import Vector, Matrix, Quaternion
from mathutils.kdtree import KDTree
from common import WORK, mpfb, tri_count, write_json
import bed as BED

M = mpfb()
TS = M['targetservice'].TargetService
FS = M['faceservice'].FaceService

arm = bpy.data.objects['Patient']
body = bpy.data.objects['Patient.body']
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
children = [o for o in meshes if o is not body]
by = lambda part: next(o for o in meshes if part in o.name)
clothes = by('casualsuit')

def upd():
    bpy.context.view_layer.update()

# ---------------------------------------------------------------- 1. baka fenotypen
TS.bake_targets(body)

def group_center(obj, gname):
    g = obj.vertex_groups.get(gname)
    if g is None: return None
    pts = [obj.data.vertices[i].co for i in range(len(obj.data.vertices))
           if any(e.group == g.index and e.weight > 0.5 for e in obj.data.vertices[i].groups)]
    return sum(pts, Vector()) / len(pts) if pts else None

landmarks_rest = {n: group_center(body, n) for n in ['joint-r-eye', 'joint-l-eye', 'joint-mouth', 'joint-neck', 'joint-head']}

# ---------------------------------------------------------------- 2. ansiktsenheter (ARKit, CC0)
FS.load_targets(body, load_microsoft_visemes=False, load_meta_visemes=False, load_arkit_faceunits=True)
FS.interpolate_targets(body)

RECIPES = {
    'blink_L': {'eyeBlinkLeft': 1.0},
    'blink_R': {'eyeBlinkRight': 1.0},
    # Orolig: inre ögonbrynen upp, lätt sänkta mungipor, lätt pressade läppar.
    'worried': {'browInnerUp': 0.75, 'mouthFrownLeft': 0.25, 'mouthFrownRight': 0.25,
                'eyeWideLeft': 0.12, 'eyeWideRight': 0.12, 'mouthPressLeft': 0.15, 'mouthPressRight': 0.15},
    # Smärta (grimas): bryn ned och ihop, kisande, näsrynkning, överläppen upp, munnen dras ut.
    'pain': {'browDownLeft': 0.8, 'browDownRight': 0.8, 'browInnerUp': 0.3,
             'eyeSquintLeft': 0.7, 'eyeSquintRight': 0.7, 'eyeBlinkLeft': 0.3, 'eyeBlinkRight': 0.3,
             'cheekSquintLeft': 0.6, 'cheekSquintRight': 0.6, 'noseSneerLeft': 0.55, 'noseSneerRight': 0.55,
             'mouthUpperUpLeft': 0.35, 'mouthUpperUpRight': 0.35, 'mouthStretchLeft': 0.45,
             'mouthStretchRight': 0.45, 'jawOpen': 0.08},
}
ARK = set(M['faceservice'].ARKIT_FACEUNITS)

def build_recipes(obj):
    sk = obj.data.shape_keys
    if not sk: return
    kb = sk.key_blocks
    if not any(k.name in ARK for k in kb): return
    for name, rec in RECIPES.items():
        for k in kb: k.value = 0.0
        hit = False
        for unit, w in rec.items():
            if unit in kb:
                kb[unit].value = w; hit = True
        if hit:
            new = obj.shape_key_add(name=name, from_mix=True)
            new.value = 0.0
    for k in list(kb):
        if k.name in ARK:
            obj.shape_key_remove(k)
    for k in obj.data.shape_keys.key_blocks: k.value = 0.0

for o in meshes:
    build_recipes(o)

# ---------------------------------------------------------------- 3. andning (bröst och buk)
# Förskjutningar i viloställning (stående, framåt = -Y). Bröstet lyfts framåt-uppåt och vidgas
# lite i sidled, buken höjs framåt. Amplituden motsvarar ett lugnt andetag (ca 0,5 l).
def smooth(t):
    t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)

nip = group_center(body, 'nipple')
neck = landmarks_rest['joint-neck']
z_nip = nip.z if nip else neck.z - 0.25
z_navel = z_nip - 0.22
basis = [v.co.copy() for v in body.data.vertices]
normals = [v.normal.copy() for v in body.data.vertices]
chest, abd = [], []
for i, co in enumerate(basis):
    n = normals[i]
    front = smooth((-n.y) * 1.5 + 0.2)          # mest framsidan, något på sidorna
    # bröstkorg: från ca 10 cm under bröstvårtan till nyckelbenen
    wc = smooth((co.z - (z_nip - 0.12)) / 0.06) * smooth(((neck.z - 0.06) - co.z) / 0.06)
    wc *= smooth((0.2 - abs(co.x)) / 0.06)
    d_chest = Vector((co.x * 0.02, -0.006 * front, 0.002 * front)) * wc
    # buk: navelregionen
    wa = smooth(1 - abs(co.z - z_navel) / 0.14) * smooth((0.16 - abs(co.x)) / 0.07)
    d_abd = Vector((co.x * 0.015, -0.009 * front, 0.0)) * wa
    chest.append(d_chest); abd.append(d_abd)

def add_key(obj, name, deltas):
    if not obj.data.shape_keys: obj.shape_key_add(name='Basis', from_mix=False)
    k = obj.shape_key_add(name=name, from_mix=False)
    for i, d in enumerate(deltas):
        k.data[i].co = obj.data.shape_keys.key_blocks[0].data[i].co + d
    k.value = 0.0

add_key(body, 'breath_chest', chest)
add_key(body, 'breath_abd', abd)

# T-shirten och jeansens linning följer kroppens andning (närmaste kroppspunkt).
kd = KDTree(len(basis))
for i, co in enumerate(basis): kd.insert(co, i)
kd.balance()
for o in [clothes]:
    dc, da = [], []
    for v in o.data.vertices:
        co, idx, dist = kd.find(v.co)
        w = smooth((0.04 - dist) / 0.03)
        dc.append(chest[idx] * w); da.append(abd[idx] * w)
    add_key(o, 'breath_chest', dc)
    add_key(o, 'breath_abd', da)

# ---------------------------------------------------------------- 4. ta bort hjälpgeometri och dold hud
def delete_hidden(obj):
    keep = obj.vertex_groups.get('body')
    dels = [obj.vertex_groups[m.vertex_group] for m in obj.modifiers
            if m.type == 'MASK' and m.invert_vertex_group and m.vertex_group in obj.vertex_groups]
    bm = bmesh.new(); bm.from_mesh(obj.data)
    dl = bm.verts.layers.deform.active
    kill = []
    for v in bm.verts:
        d = v[dl]
        if keep is not None and d.get(keep.index, 0.0) < 0.5: kill.append(v); continue
        if any(d.get(g.index, 0.0) > 0.5 for g in dels): kill.append(v)
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(obj.data); bm.free()
    for m in list(obj.modifiers):
        if m.type == 'MASK': obj.modifiers.remove(m)
    # ta bort hjälpgrupper (joint-, helper-) som inte behövs i appen
    for g in list(obj.vertex_groups):
        if g.name.startswith(('joint-', 'helper-', 'Delete.', 'JointCubes', 'HelperGeometry')):
            obj.vertex_groups.remove(g)

delete_hidden(body)

# ---------------------------------------------------------------- 5. ställning
PB = arm.pose.bones
for pb in PB:
    pb.rotation_mode = 'QUATERNION'

def rot_world(pb, q, pivot=None):
    Mx = pb.matrix.copy()
    p = Mx.translation.copy() if pivot is None else pivot
    pb.matrix = Matrix.Translation(p) @ q.to_matrix().to_4x4() @ Matrix.Translation(-p) @ Mx
    upd()

def bdir(pb):
    return (pb.tail - pb.head).normalized()

def aim(name, target):
    pb = PB[name]
    q = bdir(pb).rotation_difference(Vector(target).normalized())
    rot_world(pb, q)

def twist(name, deg):
    pb = PB[name]
    rot_world(pb, Quaternion(bdir(pb), math.radians(deg)))

def flex_about(name, axis, deg):
    rot_world(PB[name], Quaternion(Vector(axis).normalized(), math.radians(deg)))

# Handflatans normal i handbenets lokala rum (beräknas i viloställningen).
def palm_local(side):
    h = PB['hand_' + side]
    across = PB['index_01_' + side].head - PB['pinky_01_' + side].head
    n = bdir(h).cross(across).normalized()
    # I viloställningen pekar handflatorna mot låren (medialt). Höger hand: +X, vänster: -X.
    want = Vector((1, 0, 0)) if side == 'r' else Vector((-1, 0, 0))
    if n.dot(want) < 0: n = -n
    return h.matrix.to_3x3().inverted() @ n

palm_r = palm_local('r'); palm_l = palm_local('l')
def palm_world(side, local):
    return (PB['hand_' + side].matrix.to_3x3() @ local).normalized()

th = math.radians(BED.BACKREST_DEG)
u_up, n_back = (Vector(v) for v in BED.backrest_dirs())
d_feet = -u_up
lat_r = Vector((0, -1, 0))   # patientens höger (mot användaren)
lat_l = Vector((0, 1, 0))

# Hela kroppen: liggande på rygg, huvud mot -X, sedan ryggstödets vinkel.
R1 = Matrix(((0, 0, -1), (1, 0, 0), (0, -1, 0)))
Ry = Matrix.Rotation(th, 3, 'Y')
root = PB['Root']
rot_world(root, (Ry @ R1).to_quaternion(), pivot=Vector((0, 0, 0)))

# Bål: lätt kyfos i bröstryggen; nacke och huvud böjs framåt mot kudden.
flex_about('spine_02', (0, 1, 0), 4)
flex_about('spine_03', (0, 1, 0), 5)
flex_about('neck_01', (0, 1, 0), 10)
flex_about('head', (0, 1, 0), 8)
# Huvudet vilar lätt vridet mot höger (mot läkaren); appen styr sedan blicken.
flex_about('head', u_up, -10)

# Ben: raka på madrassen, lätt isär, fötterna faller utåt.
for s, lat in (('r', lat_r), ('l', lat_l)):
    aim('thigh_' + s, Vector((1, 0, -0.07)) + lat * 0.07)
    aim('calf_' + s, Vector((1, 0, -0.035)) + lat * 0.04)
    aim('foot_' + s, Vector((0.62, 0, 0.78)) + lat * 0.2)
    twist('thigh_' + s, 12 if s == 'l' else -12)   # utåtrotation i höften

# Höger arm: abduktion ca 75° från bålen ut på armbordet, armbågen lätt böjd, supinerad.
ABD = math.radians(75)
upper_dir = (d_feet * math.cos(ABD) + lat_r * math.sin(ABD)).normalized()
# Armen sluttar nedåt från axeln (ca 22°) till armbordet, som står lägre än axeln.
upper_dir = (Vector((upper_dir.x, upper_dir.y, 0)).normalized() * math.cos(math.radians(22)) + Vector((0, 0, -math.sin(math.radians(22))))).normalized()
aim('clavicle_r', (PB['clavicle_r'].tail - PB['clavicle_r'].head).normalized() + lat_r * 0.1)
aim('upperarm_r', upper_dir)
fore_dir = Vector((upper_dir.x, upper_dir.y, -0.02)).normalized()
aim('lowerarm_r', fore_dir)
aim('hand_r', fore_dir + Vector((0, 0, 0.03)))
# Supination: vrid tills handflatan pekar uppåt. Fördela vridningen på överarm, underarm och hand.
def twist_needed(side, local, up=Vector((0, 0, 1))):
    hb = PB['hand_' + side]; ax = bdir(hb)
    pw = palm_world(side, local)
    a = pw - ax * pw.dot(ax); b = up - ax * up.dot(ax)
    ang = a.angle(b)
    if a.cross(b).dot(ax) < 0: ang = -ang
    return math.degrees(ang)
total = twist_needed('r', palm_r)
twist('upperarm_r', total * 0.3)
twist('lowerarm_r', total * 0.55)
twist('hand_r', twist_needed('r', palm_r))
# Avslappnade fingrar: lätt böjda leder, tummen vilar.
def curl(side, local, fingers, degs):
    for f in fingers:
        for j, deg in zip(('01', '02', '03'), degs):
            pb = PB[f'{f}_{j}_{side}']
            pn = palm_world(side, local)
            axis = bdir(pb).cross(pn).normalized()
            rot_world(pb, Quaternion(axis, math.radians(deg)))
curl('r', palm_r, ['index'], (10, 18, 8))
curl('r', palm_r, ['middle'], (14, 22, 10))
curl('r', palm_r, ['ring'], (18, 26, 12))
curl('r', palm_r, ['pinky'], (22, 30, 14))
curl('r', palm_r, ['thumb'], (4, 8, 6))

# Vänster arm längs kroppen, underarmen på madrassen bredvid höften, handflatan nedåt-inåt.
aim('upperarm_l', d_feet * math.cos(math.radians(14)) + lat_l * math.sin(math.radians(14)) - n_back * 0.08)
aim('lowerarm_l', Vector((1, 0.12, -0.18)))
aim('hand_l', Vector((1, 0.05, -0.2)))
curl('l', palm_l, ['index', 'middle', 'ring', 'pinky'], (12, 20, 10))

# ---------------------------------------------------------------- 6. placera mot madrass och ryggstöd
def evaluated_coords(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    m = ev.to_mesh()
    pts = [obj.matrix_world @ v.co for v in m.vertices]
    ev.to_mesh_clear()
    return pts

H = Vector((BED.HINGE_X, BED.BED_Y, BED.BED_TOP))
SINK_SEAT, SINK_BACK = 0.012, 0.012
# Grovplacering: bäckenet strax fotänden om ryggstödets gångjärn.
pel = PB['pelvis'].head.copy()
Mx = root.matrix.copy(); Mx.translation += Vector((BED.HINGE_X + 0.06, BED.BED_Y, BED.BED_TOP + 0.12)) - pel
root.matrix = Mx; upd()
for it in range(4):
    pts = evaluated_coords(body)
    seat = [p for p in pts if p.x > BED.HINGE_X + 0.05]
    back = [p for p in pts if p.x < BED.HINGE_X - 0.05]
    z_min = min(p.z for p in seat)
    d_min = min(n_back.dot(p - H) for p in back)
    # Lös: tz + z_min = TOP - sink_seat ; n.t + d_min = -sink_back
    tz = (BED.BED_TOP - SINK_SEAT) - z_min
    # n.x*tx + n.z*tz = -sink_back - d_min
    tx = (-SINK_BACK - d_min - n_back.z * tz) / n_back.x
    # Patienten ska ligga mitt på britsen i sidled.
    ty = BED.BED_Y - PB['pelvis'].head.y if it == 0 else 0.0
    # fötterna får inte gå utanför fotändan
    Mx = root.matrix.copy(); Mx.translation += Vector((tx, ty, tz)); root.matrix = Mx; upd()
    print(f'PLACE it{it} tx={tx:.3f} ty={ty:.3f} tz={tz:.3f}')

# Huvudets blickriktning (framåt) efter ställningen: viloställningens framåt är -Y.
Rh = PB['head'].matrix.to_3x3() @ arm.data.bones['head'].matrix_local.to_3x3().inverted()
head_fwd = (Rh @ Vector((0, -1, 0))).normalized()
head_up = (Rh @ Vector((0, 0, 1))).normalized()

# ---------------------------------------------------------------- 7. baka in ställningen (även shape keys)
def apply_armature_keep_keys(obj):
    mod = next((m for m in obj.modifiers if m.type == 'ARMATURE'), None)
    if mod is None: return
    sk = obj.data.shape_keys
    dg = bpy.context.evaluated_depsgraph_get()
    if sk is None:
        coords = evaluated_coords(obj)
        inv = obj.matrix_world.inverted()
        for v, p in zip(obj.data.vertices, coords): v.co = inv @ p
    else:
        kb = sk.key_blocks
        results = []
        obj.show_only_shape_key = True
        for i in range(len(kb)):
            obj.active_shape_key_index = i
            upd()
            results.append(evaluated_coords(obj))
        obj.show_only_shape_key = False
        inv = obj.matrix_world.inverted()
        for i, k in enumerate(kb):
            for j, p in enumerate(results[i]):
                k.data[j].co = inv @ p
        for v, p in zip(obj.data.vertices, results[0]): v.co = inv @ p
    obj.modifiers.remove(mod)

for o in meshes:
    apply_armature_keep_keys(o)

bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.select_all(action='SELECT')
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')
for o in meshes:
    m = o.modifiers.new('Armature', 'ARMATURE'); m.object = arm
upd()

# ---------------------------------------------------------------- 8. ögonen som egna, roterbara objekt
eyes = by('high-poly')
bpy.ops.object.select_all(action='DESELECT')
eyes.select_set(True); bpy.context.view_layer.objects.active = eyes
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
parts = [o for o in bpy.data.objects if o.type == 'MESH' and 'high-poly' in o.name]
# Varje öga består av ögonglob och hornhinna: slå ihop delarna per sida.
def center(o):
    pts = [o.matrix_world @ v.co for v in o.data.vertices]; return sum(pts, Vector()) / len(pts)
eye_objs = []
cents = [(o, center(o)) for o in parts]
ymid = sorted(c.y for _, c in cents)
ymid = (ymid[1] + ymid[2]) / 2
for side in (lambda c: c.y < ymid, lambda c: c.y >= ymid):
    grp = [o for o, c in cents if side(c)]
    bpy.ops.object.select_all(action='DESELECT')
    for o in grp: o.select_set(True)
    bpy.context.view_layer.objects.active = grp[0]
    bpy.ops.object.join()
    eye_objs.append(grp[0])
head_b = arm.data.bones['head']
for o in eye_objs:
    pts = [o.matrix_world @ v.co for v in o.data.vertices]
    c = sum(pts, Vector()) / len(pts)
    o.name = 'Eye_R' if c.y < ymid else 'Eye_L'
    o.data.name = o.name
    # ursprung i ögats mitt
    o.data.transform(Matrix.Translation(-c)); o.location = c
    for m in list(o.modifiers): o.modifiers.remove(m)
    o.vertex_groups.clear()
    upd()
    mw = o.matrix_world.copy()
    o.parent = arm; o.parent_type = 'BONE'; o.parent_bone = 'head'
    upd(); o.matrix_world = mw
    o['fwd'] = list(BED.app_from_blender(head_fwd))
upd()

# ---------------------------------------------------------------- 9. sårankare (volarsidan, distala underarmen)
lw = arm.data.bones['lowerarm_r']
el = arm.matrix_world @ lw.head_local; wr = arm.matrix_world @ lw.tail_local
axis = (wr - el).normalized()
# ca 6 cm proximalt om handledsvecket (handledsvecket ligger ungefär vid underarmsbenets slut)
p = wr - axis * 0.06
dg = bpy.context.evaluated_depsgraph_get()
hit, loc, nor, idx, ob, _ = bpy.context.scene.ray_cast(dg, p + Vector((0, 0, 0.25)), Vector((0, 0, -1)))
assert hit and ob.name == body.name, ('sårankaret träffade', ob.name if ob else None)
z = nor.normalized(); x = (axis - z * axis.dot(z)).normalized(); y = z.cross(x)
anc = bpy.data.objects.new('WoundAnchor', None)
bpy.context.scene.collection.objects.link(anc)
anc.empty_display_size = 0.03
anc.matrix_world = Matrix.Translation(loc) @ Matrix((x, y, z)).transposed().to_4x4()
mw = anc.matrix_world.copy()
anc.parent = arm; anc.parent_type = 'BONE'; anc.parent_bone = 'lowerarm_r'; upd(); anc.matrix_world = mw

# ---------------------------------------------------------------- 10. rapport
def bone_app(n, tail=False):
    b = arm.data.bones[n]; return BED.app_from_blender(arm.matrix_world @ (b.tail_local if tail else b.head_local))
pts = evaluated_coords(body)
report = {
    'tris': {o.name: tri_count(o) for o in bpy.data.objects if o.type == 'MESH'},
    'shape_keys': {o.name: [k.name for k in o.data.shape_keys.key_blocks] for o in bpy.data.objects if o.type == 'MESH' and o.data.shape_keys},
    'wound_app': BED.app_from_blender(loc), 'wound_normal_app': BED.app_from_blender(z),
    'shoulder_r': bone_app('upperarm_r'), 'elbow_r': bone_app('lowerarm_r'), 'wrist_r': bone_app('hand_r'),
    'fingertip_r': bone_app('middle_03_r', True), 'head': bone_app('head'), 'head_top': bone_app('head', True),
    'forearm_min_z_app': min(p.z for p in pts if (p - (el + wr) / 2).length < 0.2 and p.y < BED.EDGE_Y_USER - 0.05),
    'min_x': min(p.x for p in pts), 'max_x': max(p.x for p in pts),
    'eyes_fwd': {o.name: list(o['fwd']) for o in eye_objs},
    'head_fwd_app': BED.app_from_blender(head_fwd), 'head_up_app': BED.app_from_blender(head_up),
}
write_json(os.path.join(WORK, 'step2_report.json'), report)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, 'step2_posed.blend'))
print('STEP2 OK')
