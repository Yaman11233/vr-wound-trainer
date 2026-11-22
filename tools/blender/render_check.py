# Förhandsbilder av den ställda patienten på britsen (Blender-koordinater, se bed.py).
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
from common import arg
import scene_bed
arm = bpy.data.objects['Patient']
scene_bed.build(arm)
B = lambda x, y, z: Vector((x, -z, y))   # app -> blender
views = {
  # namn: (kamera i app-koordinater, mål i app-koordinater, brännvidd)
  'overview': ((0.0, 1.65, 0.0), (-0.1, 0.9, -1.2), 22),
  'work': ((-0.15, 1.62, -0.12), (-0.25, 1.08, -0.6), 30),
  'side': ((0.5, 1.5, 1.2), (0.1, 0.9, -1.25), 28),
  'forearm': ((-0.14, 1.42, -0.42), (-0.25, 1.09, -0.56), 40),
  'portrait': ((-0.05, 1.5, -0.95), (-0.42, 1.36, -1.25), 55),
}
os.environ.setdefault('X', '1')
from importlib import import_module
sc = bpy.context.scene
out = arg('out'); want = arg('views', ','.join(views)).split(',')
pv = import_module('preview')  # sätter upp ljus/kamera; renderar inget när --views är tomt
for nm, loc, tgt, e, size in (('PrevKey', (-0.3, 2.3, -0.6), (-0.3, 1.0, -0.9), 500, 1.2),
                              ('PrevFill', (1.0, 2.2, 0.3), (0, 1.0, -1.0), 250, 2.0),
                              ('PrevRim', (-1.4, 2.0, -2.0), (-0.3, 1.0, -1.0), 200, 1.5)):
    l = bpy.data.objects[nm]; l.location = B(*loc); pv.look_at(l, B(*tgt)); l.data.energy = e; l.data.size = size
for name in want:
    c, t, lens = views[name]
    pv.cam.location = B(*c); pv.look_at(pv.cam, B(*t)); pv.cam.data.lens = lens / 1.0
    pv.cam.data.sensor_width = 36
    sc.render.filepath = f'{out}_{name}.png'
    bpy.ops.render.render(write_still=True)
    print('RENDERED', name)
