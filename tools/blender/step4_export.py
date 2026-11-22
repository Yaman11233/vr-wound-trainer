# Steg 4: exportera patienten till GLB för appen.
#  - armens UV (UVArm) skrivs in i UVMap för armens ytor (ett UV-lager per nät i glTF)
#  - Cycles-specifika noder (porbump) kopplas bort; porerna läggs på i appens hudshader
#  - GLB:n får skelett, morph targets (blink_L/R, worried, pain, breath_chest/abd) och noderna
#    WoundAnchor, Eye_L, Eye_R med extras (fwd = blickriktning i vila, app-koordinater)
# Kör: blender -b <WORK>/step3c.blend --python tools/blender/step4_export.py
import os, sys, json, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from common import WORK, REPO, tri_count, write_json

body = bpy.data.objects['Patient.body']
uvm, uva = body.data.uv_layers['UVMap'].data, body.data.uv_layers['UVArm'].data
for p in body.data.polygons:
    if p.material_index == 1:
        for li in p.loop_indices: uvm[li].uv = uva[li].uv
body.data.uv_layers.remove(body.data.uv_layers['UVArm'])
for n in ('maskA', 'maskB'):
    a = body.data.color_attributes.get(n)
    if a: body.data.color_attributes.remove(a)

for m in bpy.data.materials:
    if not m.use_nodes: continue
    nt = m.node_tree
    bump = nt.nodes.get('DetailBump')
    if bump:
        src = bump.inputs['Normal'].links[0].from_socket
        dst = [l.to_socket for l in bump.outputs['Normal'].links]
        for d in dst: nt.links.new(src, d)
        nt.nodes.remove(bump)
    p = nt.nodes.get('Principled BSDF')
    if p and m.name.startswith('Skin_'):
        # SSS görs i appens shader; i glTF finns ingen motsvarighet
        p.inputs['Subsurface Weight'].default_value = 0.0
        for l in list(p.inputs['Subsurface Scale'].links): nt.links.remove(l)

# Ta bort sådant som inte ska med
for o in list(bpy.data.objects):
    if o.type in ('LIGHT', 'CAMERA'): bpy.data.objects.remove(o, do_unlink=True)

out_dir = os.path.join(REPO, 'assets', 'models', 'patient')
os.makedirs(out_dir, exist_ok=True)
raw = os.path.join(WORK, 'patient_raw.glb')
bpy.ops.export_scene.gltf(
    filepath=raw, export_format='GLB', use_selection=False,
    export_extras=True, export_tangents=True, export_normals=True,
    export_skins=True, export_morph=True, export_morph_normal=True, export_morph_tangent=False,
    export_animations=False, export_rest_position_armature=True,
    export_image_format='AUTO', export_yup=True, export_apply=False,
    export_all_influences=False, export_def_bones=False,
)
stats = {'tris': {o.name: tri_count(o) for o in bpy.data.objects if o.type == 'MESH'}}
stats['tris_total'] = sum(stats['tris'].values())
stats['materials'] = sorted({s.material.name for o in bpy.data.objects if o.type == 'MESH' for s in o.material_slots if s.material})
stats['bones'] = len(bpy.data.objects['Patient'].data.bones)
write_json(os.path.join(WORK, 'export_stats.json'), stats)
print('STEP4 OK', stats['tris_total'])
