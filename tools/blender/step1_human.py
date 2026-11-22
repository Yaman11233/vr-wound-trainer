# Steg 1: skapa patienten med MPFB 2 (kropp, ansikte, ögon, hår, kläder, rigg).
# Kör: blender -b --python tools/blender/step1_human.py
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from common import WORK, mpfb, tri_count, write_json

M = mpfb()
HS = M['humanservice'].HumanService

# --- Fenotyp: man, 35 år, ca 178 cm, 75 kg (BMI 23,7) ---------------------------------
# MakeHuman-ålder: 0,5 = 25 år, 1,0 = 90 år, linjärt däremellan -> 35 år = 0,577.
AGE = 0.5 + (35 - 25) / (90 - 25) * 0.5
PHENOTYPE = {
    'gender': 1.0, 'age': AGE, 'muscle': 0.5, 'weight': 0.52,
    'proportions': 0.5, 'height': float(os.environ.get('PH_HEIGHT', '0.665')), 'cupsize': 0.5, 'firmness': 0.5,
    'race': {'caucasian': 0.92, 'asian': 0.04, 'african': 0.04},
}

# --- Ansikte: små, asymmetriska avvikelser från MPFB:s medelansikte ----------------------
# Inga stora värden: målet är en vanlig individ, inte en karikatyr.
FACE = {
    'head-oval': 0.25, 'head-square': 0.18, 'head-scale-depth-incr': 0.08,
    'forehead-trans-backward': 0.12, 'forehead-temple-decr': 0.1,
    'eyebrows-trans-down': 0.15, 'eyebrows-angle-down': 0.08,
    'nose-hump-incr': 0.28, 'nose-point-width-incr': 0.2, 'nose-scale-vert-incr': 0.12,
    'nose-flaring-incr': 0.15, 'nose-nostrils-width-incr': 0.1, 'nose-septumangle-decr': 0.12,
    'nose-width2-incr': 0.1,
    'mouth-lowerlip-volume-incr': 0.15, 'mouth-upperlip-volume-decr': 0.12,
    'mouth-scale-horiz-incr': 0.08, 'mouth-angles-down': 0.1, 'mouth-philtrum-volume-incr': 0.2,
    'mouth-laugh-lines-in': 0.2,
    'chin-prominent-incr': 0.18, 'chin-width-incr': 0.2, 'chin-cleft-incr': 0.08,
    'chin-bones-incr': 0.15,
    'l-cheek-bones-incr': 0.12, 'r-cheek-bones-incr': 0.2,
    'l-cheek-volume-decr': 0.15, 'r-cheek-volume-decr': 0.08, 'l-cheek-inner-decr': 0.1,
    'l-eye-bag-incr': 0.3, 'r-eye-bag-incr': 0.22,
    'l-eye-eyefold-down': 0.2, 'r-eye-eyefold-down': 0.25,
    'r-eye-height2-decr': 0.1, 'l-eye-trans-up': 0.04,
    'r-ear-flap-incr': 0.22, 'l-ear-flap-incr': 0.1, 'l-ear-lobe-incr': 0.15,
    'asym-nose-2-l': 0.3, 'asym-mouth-1-r': 0.25, 'asym-eye-3-l': 0.2,
    'asym-brown-1-r': 0.25, 'asym-jaw-1-l': 0.2, 'asym-cheek-1-r': 0.2, 'asym-temple-1-l': 0.15,
    'neck-scale-horiz-incr': 0.12,
    'stomach-pregnant-incr': 0.12,
    'r-lowerarm-muscle-incr': 0.1, 'l-lowerarm-muscle-incr': 0.08,
    # Händerna: MakeHumans hand är lite stor med kraftiga fingrar. Smalare och något längre fingrar,
    # handen ca 5 % mindre (verklig handlängd för en man på 178 cm: ca 19 cm).
    'r-hand-fingers-diameter-decr': 0.35, 'l-hand-fingers-diameter-decr': 0.35,
    'r-hand-fingers-length-incr': 0.25, 'l-hand-fingers-length-incr': 0.25,
    'r-hand-fingers-distance-decr': 0.3, 'l-hand-fingers-distance-decr': 0.3,
    'r-hand-scale-decr': 0.45, 'l-hand-scale-decr': 0.45,
}

human_info = {
    'name': 'Patient',
    'phenotype': PHENOTYPE,
    'rig': 'game_engine',
    'eyes': 'high-poly/high-poly.mhclo',
    'eyebrows': 'eyebrow001/eyebrow001.mhclo',
    'eyelashes': 'eyelashes02/eyelashes02.mhclo',
    'teeth': 'teeth_base/teeth_base.mhclo',
    'tongue': '',
    'hair': 'short01/short01.mhclo',
    'proxy': '',
    'targets': [{'target': k, 'value': v} for k, v in FACE.items()],
    'clothes': ['male_casualsuit06/male_casualsuit06.mhclo',
                'joepal_crude_low_socks/joepal_crude_low_socks.mhclo',
                'shoes06/shoes06.mhclo'],
    'skin_mhmat': 'young_caucasian_male2/young_caucasian_male2.mhmat',
    'skin_material_type': 'ENHANCED_SSS',
    'eyes_material_type': 'MAKESKIN',
    'skin_material_settings': {},
    'eyes_material_settings': {},
    'alternative_materials': {},
    'expressions': [],
}

# Tom scen
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
settings = HS.get_default_deserialization_settings()
settings['subdiv_levels'] = 0
settings['material_instances'] = 'NEVER'
basemesh = HS.deserialize_from_dict(human_info, settings)

bpy.context.view_layer.update()
report = {'objects': {}}
dims = None
for o in bpy.data.objects:
    entry = {'type': o.type, 'parent': o.parent.name if o.parent else None}
    if o.type == 'MESH':
        entry['tris'] = tri_count(o)
        entry['materials'] = [s.material.name if s.material else None for s in o.material_slots]
        entry['shape_keys'] = len(o.data.shape_keys.key_blocks) if o.data.shape_keys else 0
    if o.type == 'ARMATURE':
        entry['bones'] = [b.name for b in o.data.bones]
    report['objects'][o.name] = entry

# Längd: högsta punkt på kroppen (stående, fötter på golvet)
dg = bpy.context.evaluated_depsgraph_get()
ev = basemesh.evaluated_get(dg)
zs = [(ev.matrix_world @ v.co).z for v in ev.data.vertices]
report['height_m'] = max(zs) - min(zs)
write_json(os.path.join(WORK, 'step1_report.json'), report)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, 'step1_human.blend'))
print('STEP1 OK height', report['height_m'])
