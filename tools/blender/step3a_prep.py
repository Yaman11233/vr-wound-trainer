# Steg 3a: förbered nät och UV för texturerna.
#  - tänderna förenklas (syns bara vid grimas)
#  - höger underarm och hand delas upp en gång (jämnare siluett på 30–40 cm)
#  - underarm + hand får ett eget UV-lager och eget material (egen 2K-textur)
#  - datakartor bakas per texel: position, normal, AO och masker (läppar, öron, naglar, hårbotten)
# Kör: blender -b <WORK>/step2_posed.blend --python tools/blender/step3a_prep.py
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from mathutils import Vector
from common import WORK, tri_count, write_json, arg

RES = int(arg('res', '2048'))
TEX = os.path.join(WORK, 'tex'); os.makedirs(TEX, exist_ok=True)
arm = bpy.data.objects['Patient']
body = bpy.data.objects['Patient.body']
clothes = next(o for o in bpy.data.objects if 'casualsuit' in o.name)
teeth = next(o for o in bpy.data.objects if 'teeth' in o.name)
upd = lambda: bpy.context.view_layer.update()

def set_active(o):
    bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.object and bpy.context.object.mode != 'OBJECT' else None
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active = o

# ------------------------------------------------------------------ tänder
if teeth.data.shape_keys:
    set_active(teeth); bpy.ops.object.shape_key_remove(all=True)
set_active(teeth)
dec = teeth.modifiers.new('dec', 'DECIMATE'); dec.ratio = 0.22
bpy.ops.object.modifier_move_to_index(modifier='dec', index=0)
bpy.ops.object.modifier_apply(modifier='dec')

# ------------------------------------------------------------------ underarmens område
B = arm.data.bones
S = arm.matrix_world @ B['upperarm_r'].head_local
E = arm.matrix_world @ B['upperarm_r'].tail_local
u_dir = (E - S).normalized()
arm_groups = ['upperarm_r', 'lowerarm_r', 'hand_r'] + [f'{f}_0{i}_r' for f in ('index', 'middle', 'ring', 'pinky', 'thumb') for i in (1, 2, 3)]

def weights(obj, names):
    idx = {obj.vertex_groups[n].index for n in names if n in obj.vertex_groups}
    out = []
    for v in obj.data.vertices:
        out.append(sum(g.weight for g in v.groups if g.group in idx))
    return out

# Ärmens slut: längst ut längs överarmen bland klädernas hörn som följer höger överarm.
wc = weights(clothes, arm_groups)
sleeve_t = max((clothes.matrix_world @ v.co - S).dot(u_dir) for v, w in zip(clothes.data.vertices, wc) if w > 0.5)
t_cut = sleeve_t - 0.035
wb = weights(body, arm_groups)
in_arm = [w > 0.5 and (body.matrix_world @ v.co - S).dot(u_dir) > t_cut for v, w in zip(body.data.vertices, wb)]
print('SLEEVE', sleeve_t, 'CUT', t_cut)

# ------------------------------------------------------------------ dold hud under kläderna
# En yta tas bort om alla dess hörn ligger under tyget (stråle längs normalen träffar kläderna inom
# 7 cm) och hörnet ligger minst 2,5 cm från tygets kanter, så att inga hål syns vid krage och ärm.
from mathutils.bvhtree import BVHTree
dg = bpy.context.evaluated_depsgraph_get()
cover = [o for o in bpy.data.objects if o.type == 'MESH' and any(k in o.name for k in ('casualsuit', 'shoes', 'socks'))]
trees = [BVHTree.FromObject(o, dg) for o in cover]
edge_pts = []
for o in cover:
    bmc = bmesh.new(); bmc.from_object(o, dg)
    edge_pts += [o.matrix_world @ v.co for v in bmc.verts if v.is_boundary]
    bmc.free()
from mathutils.kdtree import KDTree
kde = KDTree(len(edge_pts))
for i, p in enumerate(edge_pts): kde.insert(p, i)
kde.balance()
hidden = []
for v in body.data.vertices:
    p = body.matrix_world @ v.co; n = (body.matrix_world.to_3x3() @ v.normal).normalized()
    hit = any(t.ray_cast(p - n * 0.002, n, 0.07)[0] is not None for t in trees)
    far = kde.find(p)[2] > 0.025
    hidden.append(hit and far and not in_arm[v.index])
bmh = bmesh.new(); bmh.from_mesh(body.data); bmh.verts.ensure_lookup_table()
oid = bmh.verts.layers.int.new('oid')
for v in bmh.verts: v[oid] = v.index
kill = [f for f in bmh.faces if all(hidden[v.index] for v in f.verts)]
bmesh.ops.delete(bmh, geom=kill, context='FACES_ONLY')
loose = [v for v in bmh.verts if not v.link_faces]
bmesh.ops.delete(bmh, geom=loose, context='VERTS')
keep_idx = [v[oid] for v in bmh.verts]
bmh.verts.layers.int.remove(oid)
bmh.to_mesh(body.data); bmh.free()
in_arm = [in_arm[i] for i in keep_idx]
print('HIDDEN faces removed', len(kill), 'body tris now', tri_count(body, False))

# ------------------------------------------------------------------ material: kropp + arm
def ensure_mat(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; return m
mb, ma = ensure_mat('Skin_Body'), ensure_mat('Skin_Arm')
body.data.materials.clear(); body.data.materials.append(mb); body.data.materials.append(ma)

# Armens ytor (material 1) delas med Catmull-Clark på en separat kopia som sedan fogas tillbaka.
# Skarven hamnar under t-tröjans ärm och syns inte.
for p in body.data.polygons:
    p.material_index = 1 if all(in_arm[v] for v in p.vertices) else 0
set_active(body)
bpy.ops.object.duplicate()
armpiece = bpy.context.active_object; armpiece.name = 'ArmPiece'
if armpiece.data.shape_keys:
    bpy.ops.object.shape_key_remove(all=True)
for m in list(armpiece.modifiers): armpiece.modifiers.remove(m)
bm = bmesh.new(); bm.from_mesh(armpiece.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index != 1], context='FACES')
bm.to_mesh(armpiece.data); bm.free()
sub = armpiece.modifiers.new('sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 1
sub.boundary_smooth = 'PRESERVE_CORNERS'; sub.uv_smooth = 'PRESERVE_BOUNDARIES'; sub.use_limit_surface = True
bpy.ops.object.modifier_apply(modifier='sub')
bm = bmesh.new(); bm.from_mesh(body.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index == 1], context='FACES')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
bm.to_mesh(body.data); bm.free()
bpy.ops.object.select_all(action='DESELECT')
armpiece.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
arm_faces = [p.index for p in body.data.polygons if p.material_index == 1]
print('ARM faces', len(arm_faces), 'body tris', tri_count(body, False))

# ------------------------------------------------------------------ UV-lager för armen
uv_arm = body.data.uv_layers.get('UVArm') or body.data.uv_layers.new(name='UVArm')
body.data.uv_layers.active = uv_arm
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='DESELECT')
bpy.ops.object.mode_set(mode='OBJECT')
for i in arm_faces: body.data.polygons[i].select = True
bpy.ops.object.mode_set(mode='EDIT')
bpy.context.scene.tool_settings.use_uv_select_sync = False
bpy.ops.uv.select_all(action='SELECT')
bpy.ops.uv.average_islands_scale()
bpy.ops.uv.pack_islands(shape_method='CONCAVE', rotate=True, rotate_method='ANY', margin_method='FRACTION', margin=0.004)
bpy.ops.object.mode_set(mode='OBJECT')
# Packningen lämnar en tom remsa; sträck ut till hela texturen (texlarna blir lite rektangulära).
uvd = body.data.uv_layers['UVArm'].data
loops = [li for i in arm_faces for li in body.data.polygons[i].loop_indices]
us = [uvd[li].uv.x for li in loops]; vs = [uvd[li].uv.y for li in loops]
u0, u1, v0, v1 = min(us), max(us), min(vs), max(vs)
for li in loops:
    uv = uvd[li].uv
    uvd[li].uv = (0.004 + 0.992 * (uv.x - u0) / (u1 - u0), 0.004 + 0.992 * (uv.y - v0) / (v1 - v0))
print('ARM UV bbox', u0, u1, v0, v1)
# Kroppens synliga hud behåller MakeHumans UV: där har huvudet redan en stor andel av texturen,
# vilket ger fler texlar i ansiktet än en ompackning med jämn täthet.

# ------------------------------------------------------------------ masker som färgattribut
def group_w(obj, name):
    g = obj.vertex_groups.get(name)
    if not g: return [0.0] * len(obj.data.vertices)
    return [next((e.weight for e in v.groups if e.group == g.index), 0.0) for v in obj.data.vertices]
ca = body.data.color_attributes.get('maskA') or body.data.color_attributes.new('maskA', 'FLOAT_COLOR', 'POINT')
cb = body.data.color_attributes.get('maskB') or body.data.color_attributes.new('maskB', 'FLOAT_COLOR', 'POINT')
lips, ears, nails, scalp = (group_w(body, n) for n in ('lips', 'ears', 'fingernails', 'scalp'))
for i in range(len(body.data.vertices)):
    ca.data[i].color = (lips[i], ears[i], nails[i], 1)
    cb.data[i].color = (scalp[i], 0, 0, 1)

# ------------------------------------------------------------------ bakning
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
    for d in prefs.devices: d.use = True
    sc.cycles.device = 'GPU'
except Exception as e: print('GPU', e)
sc.cycles.samples = 1
sc.render.bake.margin = 0

def bake_target(obj, uv, name, kind, builder=None, samples=1, float_buf=True):
    img = bpy.data.images.new(name, RES, RES, alpha=True, float_buffer=float_buf)
    img.generated_color = (0, 0, 0, 0)
    saved = [s.material for s in obj.material_slots]
    tmp = bpy.data.materials.new('bake_' + name); tmp.use_nodes = True
    nt = tmp.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img
    nt.nodes.active = tex
    if builder:
        em = nt.nodes.new('ShaderNodeEmission'); em.inputs[1].default_value = 1.0
        nt.links.new(builder(nt), em.inputs[0]); nt.links.new(em.outputs[0], out.inputs[0])
    else:
        d = nt.nodes.new('ShaderNodeBsdfDiffuse'); nt.links.new(d.outputs[0], out.inputs[0])
    for s in obj.material_slots: s.material = tmp
    obj.data.uv_layers.active = obj.data.uv_layers[uv]
    set_active(obj)
    sc.cycles.samples = samples
    bpy.ops.object.bake(type=kind, margin=0, use_clear=True, target='IMAGE_TEXTURES')
    for s, m in zip(obj.material_slots, saved): s.material = m
    obj.data.uv_layers.active = obj.data.uv_layers['UVMap']
    img.filepath_raw = os.path.join(TEX, name + '.exr'); img.file_format = 'OPEN_EXR'
    img.save()
    print('BAKED', name)
    return img

def geo(socket):
    def b(nt):
        g = nt.nodes.new('ShaderNodeNewGeometry')
        if socket == 'Position':
            add = nt.nodes.new('ShaderNodeVectorMath'); add.operation = 'ADD'
            add.inputs[1].default_value = (10, 10, 10)     # positivt område för säkerhets skull
            nt.links.new(g.outputs['Position'], add.inputs[0]); return add.outputs[0]
        if socket == 'Normal':
            mp = nt.nodes.new('ShaderNodeVectorMath'); mp.operation = 'MULTIPLY_ADD'
            mp.inputs[1].default_value = (0.5, 0.5, 0.5); mp.inputs[2].default_value = (0.5, 0.5, 0.5)
            nt.links.new(g.outputs['Normal'], mp.inputs[0]); return mp.outputs[0]
    return b
def attr(name):
    def b(nt):
        a = nt.nodes.new('ShaderNodeAttribute'); a.attribute_name = name; return a.outputs['Color']
    return b
def src_image(path, uv):
    def b(nt):
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path, check_existing=True)
        m = nt.nodes.new('ShaderNodeUVMap'); m.uv_map = uv
        nt.links.new(m.outputs[0], t.inputs[0]); return t.outputs[0]
    return b

SKIN = os.path.join(os.environ['APPDATA'], r'Blender Foundation\Blender\5.1\extensions\.user\blender_org\mpfb\data\skins\young_caucasian_male2\young_lightskinned_male_diffuse2.png')

# Kropp (UVMap) på en kopia utan armens ytor.
set_active(body)
bpy.ops.object.duplicate()
bodycopy = bpy.context.active_object; bodycopy.name = 'BodyBake'
bm = bmesh.new(); bm.from_mesh(bodycopy.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index != 0], context='FACES')
bm.to_mesh(bodycopy.data); bm.free()
if bodycopy.data.shape_keys:
    set_active(bodycopy); bpy.ops.object.shape_key_remove(all=True)
body.hide_render = True
for n, kind, b, smp in (('body_pos', 'EMIT', geo('Position'), 1), ('body_nrm', 'EMIT', geo('Normal'), 1),
                        ('body_maskA', 'EMIT', attr('maskA'), 1), ('body_maskB', 'EMIT', attr('maskB'), 1),
                        ('body_base', 'EMIT', src_image(SKIN, 'UVMap'), 1), ('body_ao', 'AO', None, 128)):
    bake_target(bodycopy, 'UVMap', n, kind, b, samples=smp)
body.hide_render = False
bpy.data.objects.remove(bodycopy, do_unlink=True)

# Armen (UVArm) på en kopia med bara armens ytor, så att resten inte skriver i armtexturen.
set_active(body)
bpy.ops.object.duplicate()
armcopy = bpy.context.active_object; armcopy.name = 'ArmBake'
bm = bmesh.new(); bm.from_mesh(armcopy.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index != 1], context='FACES')
bm.to_mesh(armcopy.data); bm.free()
if armcopy.data.shape_keys:
    set_active(armcopy); bpy.ops.object.shape_key_remove(all=True)
body.hide_render = True
bake_target(armcopy, 'UVArm', 'arm_pos', 'EMIT', geo('Position'))
bake_target(armcopy, 'UVArm', 'arm_nrm', 'EMIT', geo('Normal'))
bake_target(armcopy, 'UVArm', 'arm_maskA', 'EMIT', attr('maskA'))
bake_target(armcopy, 'UVArm', 'arm_base', 'EMIT', src_image(SKIN, 'UVMap'))
bake_target(armcopy, 'UVArm', 'arm_ao', 'AO', None, samples=128)
body.hide_render = False
bpy.data.objects.remove(armcopy, do_unlink=True)

# Landmärken för texturerna (världskoordinater i Blender, ställd viloställning)
def bw(n, tail=False):
    b = B[n]; return list(arm.matrix_world @ (b.tail_local if tail else b.head_local))
lm = {n: {'head': bw(n), 'tail': bw(n, True)} for n in B.keys()}
for e in ('Eye_L', 'Eye_R'):
    lm[e] = list(bpy.data.objects[e].matrix_world.translation)
write_json(os.path.join(WORK, 'landmarks.json'), lm)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, 'step3a.blend'))
print('STEP3A OK')
