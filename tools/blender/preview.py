# Snabba förhandsbilder (EEVEE) av en .blend för att granska ansikte och kropp under arbetet.
# blender -b <fil.blend> --python tools/blender/preview.py -- --out <prefix> [--views face,body,arm] [--engine EEVEE|CYCLES]
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
from common import arg

out = arg('out', 'preview')
views = arg('views', 'face,body').split(',')
engine = arg('engine', 'BLENDER_EEVEE')
res = int(arg('res', '900'))
samples = int(arg('samples', '64'))

sc = bpy.context.scene
sc.render.engine = engine
if engine == 'CYCLES':
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'OPTIX'
        prefs.get_devices()
        for d in prefs.devices: d.use = True
        sc.cycles.device = 'GPU'
    except Exception as e:
        print('GPU ej tillgänglig', e)
sc.render.resolution_x = res
sc.render.resolution_y = res
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'None'

world = bpy.data.worlds.get('PreviewWorld') or bpy.data.worlds.new('PreviewWorld')
world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
bg.inputs[0].default_value = (0.55, 0.56, 0.58, 1)
bg.inputs[1].default_value = 0.6
sc.world = world

def ensure_light(name, loc, energy, size, rot):
    l = bpy.data.objects.get(name)
    if not l:
        ld = bpy.data.lights.new(name, 'AREA')
        l = bpy.data.objects.new(name, ld)
        sc.collection.objects.link(l)
    l.location = loc; l.rotation_euler = rot
    l.data.energy = energy; l.data.size = size
    return l

def look_at(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

if not bpy.data.objects.get('PrevKey'):
    k = ensure_light('PrevKey', (1.5, -2.0, 2.4), 600, 1.5, (0, 0, 0)); look_at(k, (0, 0, 1.0))
    f = ensure_light('PrevFill', (-2.0, -1.5, 1.6), 200, 2.5, (0, 0, 0)); look_at(f, (0, 0, 1.0))
    r = ensure_light('PrevRim', (0.0, 2.5, 2.2), 250, 1.5, (0, 0, 0)); look_at(r, (0, 0, 1.4))

cam = bpy.data.objects.get('PrevCam')
if not cam:
    cam = bpy.data.objects.new('PrevCam', bpy.data.cameras.new('PrevCam'))
    sc.collection.objects.link(cam)
sc.camera = cam

def bone_world(name):
    arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
    if not arm or name not in arm.pose.bones: return None
    pb = arm.pose.bones[name]
    return arm.matrix_world @ pb.head, arm.matrix_world @ pb.tail

def eye_center():
    eo = next((o for o in bpy.data.objects if o.type == 'MESH' and ('high-poly' in o.name or 'low-poly' in o.name or o.name.startswith('Eye'))), None)
    if eo is None: return Vector((0, 0, 1.65))
    pts = [eo.matrix_world @ Vector(c) for c in eo.bound_box]
    return sum(pts, Vector()) / 8

def shot(name, loc, target, lens):
    cam.location = loc; look_at(cam, target); cam.data.lens = lens
    cam.data.clip_start = 0.01
    sc.render.filepath = f'{out}_{name}.png'
    bpy.ops.render.render(write_still=True)
    print('RENDERED', sc.render.filepath)

for v in views:
    custom = os.environ.get('PREVIEW_' + v.upper())
    if custom:
        vals = [float(x) for x in custom.split(',')]
        shot(v, vals[0:3], vals[3:6], vals[6]); continue
    if v == 'face':
        c = eye_center()
        shot('face', c + Vector((0.12, -0.6, -0.02)), c + Vector((0, 0, -0.04)), 85)
    elif v == 'profile':
        c = eye_center() + Vector((0, 0.06, 0))
        shot('profile', c + Vector((0.6, -0.05, 0.02)), c, 85)
    elif v == 'body':
        shot('body', (0.6, -3.6, 1.0), (0, 0, 0.88), 50)
    elif v == 'arm':
        h = bone_world('lowerarm_r'); c = (h[0] + h[1]) / 2
        shot('arm', c + Vector((-0.05, -0.35, 0.2)), c, 50)
