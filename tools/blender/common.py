# Gemensamma sökvägar och hjälpfunktioner för patientbygget i Blender.
# Körs med Blender 5.1 + MPFB 2 (extensions.blender.org) och MakeHumans CC0-paket.
import os, sys, json, math

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
WORK = os.environ.get('PATIENT_WORK') or os.path.abspath(os.path.join(REPO, '..', 'patient-work'))
os.makedirs(WORK, exist_ok=True)

def arg(name, default=None):
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for i, a in enumerate(argv):
        if a == '--' + name and i + 1 < len(argv):
            return argv[i + 1]
    return default

def mpfb():
    import importlib
    base = 'bl_ext.blender_org.mpfb'
    mods = {}
    for n in ['humanservice', 'targetservice', 'faceservice', 'objectservice', 'rigservice', 'assetservice', 'locationservice', 'materialservice']:
        mods[n] = importlib.import_module(base + '.services.' + n)
    return mods

def tri_count(obj, evaluated=True):
    import bpy
    if evaluated:
        dg = bpy.context.evaluated_depsgraph_get()
        o = obj.evaluated_get(dg)
        m = o.to_mesh()
        n = sum(len(p.vertices) - 2 for p in m.polygons)
        o.to_mesh_clear()
        return n
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)

def write_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
