# Brits med höjt ryggstöd, kudde och armbord i Blender, med samma mått som appen.
# Används för renderingar och för att räkna fram armbordets placering, som skrivs till
# <WORK>/armboard.json och förs över till src/env/layout.js.
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix
import bed as BED
from common import WORK, write_json

def mat(name, color, rough=0.5, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    return m

def box(name, size, loc, rot=(0, 0, 0), material=None, bevel=0.01):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        m = o.modifiers.new('bev', 'BEVEL'); m.width = bevel; m.segments = 3
    if material: o.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return o

def arm_board_from_rig(arm):
    """Armbordet läggs under höger underarm och hand, riktat längs underarmen."""
    B = arm.data.bones
    w = arm.matrix_world
    el = w @ B['lowerarm_r'].head_local
    wr = w @ B['hand_r'].head_local
    tip = w @ B['middle_03_r'].tail_local
    body = bpy.data.objects['Patient.body']
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg); m = ev.to_mesh()
    axis = (tip - el); axis.z = 0; axis.normalize()
    # lägsta hudpunkt under underarm och hand (det som vilar mot bordet)
    zs = []
    for v in m.vertices:
        p = body.matrix_world @ v.co
        t = (p - el).dot(axis)
        side = (p - el) - axis * t
        side.z = 0
        if -0.02 < t < (tip - el).length + 0.02 and side.length < 0.06:
            zs.append(p.z)
    ev.to_mesh_clear()
    top = min(zs) + 0.0025         # huden (redan tillplattad i step3a) sjunker ca 2,5 mm in i dynan
    # bordet går från britsens kant ut förbi fingertopparna
    start = el - axis * 0.12
    end = tip + axis * 0.06
    center = (start + end) / 2
    length = (end - start).length
    yaw = math.atan2(axis.y, axis.x)
    return {'top': top, 'center': [center.x, center.y], 'length': length, 'yaw_blender': yaw,
            'axis': [axis.x, axis.y], 'elbow': list(el), 'wrist': list(wr), 'tip': list(tip)}

def fit(arm):
    """Räkna fram armbordets och kuddens placering från den ställda modellen och spara bed_fit.json."""
    up, n = (Vector(v) for v in BED.backrest_dirs())
    out = {'armboard': arm_board_from_rig(arm)}
    head = arm.matrix_world @ arm.data.bones['head'].head_local
    body = bpy.data.objects['Patient.body']
    H = Vector((BED.HINGE_X, BED.BED_Y, BED.BED_TOP))
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh()
    hv = [body.matrix_world @ v.co for v in m.vertices if (body.matrix_world @ v.co - head).length < 0.2 and (body.matrix_world @ v.co).x < head.x + 0.05]
    ev.to_mesh_clear()
    back = min(hv, key=lambda p: n.dot(p - H))      # bakhuvudets lägsta punkt mot ryggstödet
    gap = n.dot(back - H)
    thick = max(0.04, gap + 0.015)                   # huvudet sjunker 1,5 cm in i kudden
    along = (head - H).dot(up)
    pc = H + up * along + n * (thick / 2)
    out['pillow'] = {'center': list(pc), 'thickness': thick, 'along': along,
                     'contact': list(back), 'contact_app': BED.app_from_blender(back)}
    write_json(os.path.join(WORK, 'bed_fit.json'), out)
    return out

def build(arm=None):
    up, n = (Vector(v) for v in BED.backrest_dirs())
    uph = mat('Upholstery', (0.03, 0.06, 0.09), 0.55)
    paper = mat('BedPaper', (0.86, 0.86, 0.83), 0.95)
    steel = mat('Steel', (0.7, 0.72, 0.74), 0.3, 1.0)
    floor = mat('Floor', (0.42, 0.40, 0.37), 0.8)
    pillow_m = mat('Pillow', (0.78, 0.8, 0.82), 0.9)
    T = BED.BED_TOP
    # sittdelen (fotändan)
    seat_len = BED.HEAD_X + BED.BED_LENGTH - BED.HINGE_X
    box('Bed_Seat', (seat_len, BED.BED_WIDTH, 0.08), (BED.HINGE_X + seat_len / 2, BED.BED_Y, T - 0.04), material=uph, bevel=0.02)
    # ryggstödet, roterat kring gångjärnet
    th = math.radians(BED.BACKREST_DEG)
    c = Vector((BED.HINGE_X, BED.BED_Y, T)) + up * (BED.BACKREST_LEN / 2) - n * 0.04
    box('Bed_Back', (BED.BACKREST_LEN, BED.BED_WIDTH, 0.08), c, rot=(0, th, 0), material=uph, bevel=0.02)
    box('Bed_Frame', (BED.BED_LENGTH, BED.BED_WIDTH, 0.05), (BED.HEAD_X + BED.BED_LENGTH / 2, BED.BED_Y, T - 0.12), material=steel)
    box('Floor', (8, 8, 0.02), (0.4, 1.2, -0.01), material=floor, bevel=0)
    out = {}
    if arm is not None:
        out = fit(arm)
        a = out['armboard']
        box('ArmBoard', (a['length'], 0.2, 0.05), (a['center'][0], a['center'][1], a['top'] - 0.025),
            rot=(0, 0, a['yaw_blender']), material=uph, bevel=0.015)
        pl = out['pillow']
        if not bpy.data.objects.get('Pillow'):   # kudden följer annars med patienten (pillow.py)
            box('Pillow', (0.36, 0.48, pl['thickness']), Vector(pl['center']), rot=(0, th, 0), material=pillow_m, bevel=0.03)
    return out
