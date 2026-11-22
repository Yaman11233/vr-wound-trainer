# Cycles-renderingar för granskning: helfigur, ansikte och underarm på nära håll.
# blender -b <WORK>/step3c.blend --python tools/blender/render_final.py -- --out <mapp> [--samples 256] [--res 1600] [--views body,face,forearm]
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
from common import arg
import scene_bed
import bed as BED

out = arg('out'); os.makedirs(out, exist_ok=True)
samples = int(arg('samples', '256')); res = int(arg('res', '1600'))
views = arg('views', 'body,face,forearm').split(',')
prefix = arg('prefix', 'blender')

sc = bpy.context.scene
sc.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
    for d in prefs.devices: d.use = True
    sc.cycles.device = 'GPU'
except Exception as e: print('GPU', e)
sc.cycles.samples = samples; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 8; sc.cycles.transparent_max_bounces = 16
sc.render.film_transparent = False
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = arg('look', 'AgX - Medium High Contrast')
sc.view_settings.exposure = float(arg('exposure', '-1.9'))

arm = bpy.data.objects['Patient']
scene_bed.build(arm)

def mat(name, color, rough=0.6):
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']; p.inputs['Base Color'].default_value = (*color, 1); p.inputs['Roughness'].default_value = rough
    return m
def plane(name, size, loc, rot, m):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name; o.scale = (*size, 1); o.data.materials.append(m); return o
# Rum (Blender-koordinater: x = app x, y = -app z, z = app y). App: x -1.6..2.4, z -2.3..1.7, höjd 2.7
wall = mat('Wall', (0.78, 0.77, 0.74), 0.9)
accent = mat('WallAccent', (0.55, 0.62, 0.61), 0.9)
ceil = mat('Ceiling', (0.85, 0.85, 0.83), 0.95)
plane('WallBack', (4.0, 2.7), (0.4, 2.3, 1.35), (math.pi / 2, 0, 0), accent)
plane('WallLeft', (4.0, 2.7), (-1.6, 0.3, 1.35), (math.pi / 2, 0, math.pi / 2), wall)
plane('WallRight', (4.0, 2.7), (2.4, 0.3, 1.35), (math.pi / 2, 0, math.pi / 2), wall)
plane('WallFront', (4.0, 2.7), (0.4, -1.7, 1.35), (math.pi / 2, 0, 0), wall)
plane('Ceiling', (4.0, 4.0), (0.4, 0.3, 2.7), (math.pi, 0, 0), ceil)
bpy.data.objects['Floor'].data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.36, 0.35, 0.32, 1)

def area(name, loc, size, energy, temp_rgb=(1, 0.97, 0.92)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size, ld.size_y = size
    ld.energy = energy; ld.color = temp_rgb
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); o.location = loc; return o
# takpaneler (lysrörsarmaturer) som i appen
for x, y in ((-0.2, 1.25), (0.9, 1.25), (0.3, 0.0)):
    area('Panel', (x, y, 2.68), (1.2, 0.6), float(arg('panel', '40')))
# undersökningslampan riktad mot såret (samma läge som i appen: huvud vid app (-0.5, 1.85, -0.95))
wound = bpy.data.objects['WoundAnchor'].matrix_world.translation.copy()
sp = bpy.data.lights.new('ExamLamp', 'SPOT'); sp.energy = float(arg('lamp', '70')); sp.spot_size = math.radians(40); sp.spot_blend = 0.5
sp.shadow_soft_size = 0.06; sp.color = (1, 0.98, 0.95)
lamp = bpy.data.objects.new('ExamLamp', sp); sc.collection.objects.link(lamp)
lamp.location = Vector((-0.5, 0.95, 1.85))
lamp.rotation_euler = (wound - lamp.location).to_track_quat('-Z', 'Y').to_euler()
# nyckelljus från fönstersidan (användarens sida, högt), ger form åt ansikte och arm
key = area('Key', (0.6, -1.2, 2.2), (1.0, 1.0), float(arg('key', '120')), (1, 0.96, 0.9))
key.rotation_euler = (Vector((-0.2, 1.1, 1.0)) - key.location).to_track_quat('-Z', 'Y').to_euler()
world = bpy.data.worlds.new('W'); world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.5, 0.5, 0.5, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = float(arg('world', '0.08'))
sc.world = world

cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); sc.collection.objects.link(cam); sc.camera = cam
def look(loc, tgt, lens, w=res, h=res):
    cam.location = loc; cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = lens; cam.data.clip_start = 0.01
    sc.render.resolution_x, sc.render.resolution_y = w, h

eyes = (bpy.data.objects['Eye_L'].matrix_world.translation + bpy.data.objects['Eye_R'].matrix_world.translation) / 2
Rh = arm.matrix_world.to_3x3() @ arm.data.bones['head'].matrix_local.to_3x3()
for name in views:
    if name == 'body':
        look((1.25, -0.55, 1.65), (0.25, 1.05, 0.95), 28, res, int(res * 0.7))
    elif name == 'face':
        fa = bpy.data.objects['Eye_L']['fwd']; fwd = Vector((fa[0], -fa[2], fa[1])).normalized()
        look(eyes + fwd * 0.42 + Vector((0.0, -0.08, 0.02)), eyes - Vector((0, 0, 0.035)) + fwd * 0.02, 75)
    elif name == 'forearm':
        look(wound + Vector((0.12, -0.2, 0.3)), wound + Vector((0.0, 0.0, -0.005)), 45, res, int(res * 0.75))
    elif name == 'hand':
        tip = arm.matrix_world @ arm.data.bones['middle_01_r'].head_local
        look(tip + Vector((0.08, -0.14, 0.24)), tip + Vector((-0.0, 0.0, 0.0)), 50)
    sc.render.filepath = os.path.join(out, f'{prefix}_{name}.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERED', name)
