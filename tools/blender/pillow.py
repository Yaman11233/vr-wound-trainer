# Kudde på ryggstödet som formas efter patienten (bakhuvud, nacke, skuldror och tröja), så att
# inget skär igenom och kudden får en naturlig grop. Exporteras med patienten (objektet "Pillow").
import math
import bpy, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import bed as BED

def se(v, e):
    return math.copysign(abs(v) ** e, v)

def make_pillow(center_along, length=0.34, width=0.48, thick=0.09, min_thick=0.008):
    up, n = (Vector(v) for v in BED.backrest_dirs())
    lat = Vector((0, 1, 0))
    H = Vector((BED.HINGE_X, BED.BED_Y, BED.BED_TOP))
    dg = bpy.context.evaluated_depsgraph_get()
    patient = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name.startswith('Patient') or o.name.startswith('Eye'))]
    trees = [BVHTree.FromObject(o, dg) for o in patient]

    me = bpy.data.meshes.new('Pillow')
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=1.0)
    for v in bm.verts:
        x, y, z = v.co
        a = se(x, 0.45) * length / 2          # längs ryggstödet (+ = mot fotänden)
        w = se(y, 0.4) * width / 2            # tvärs britsen
        edge = max(abs(a) / (length / 2), abs(w) / (width / 2))
        h = (1 + se(z, 0.75)) / 2 * thick * (1 - 0.25 * edge ** 4)   # 0 = mot ryggstödet
        base = H + up * (center_along - a) + lat * w
        # Forma efter patienten: stråle från ryggstödet utåt; första träffen är patientens undersida.
        if h > min_thick:
            best = None
            for t in trees:
                hit = t.ray_cast(base + n * 0.0005, n, thick + 0.05)
                if hit[0] is not None and (best is None or hit[3] < best): best = hit[3]
            if best is not None and best - 0.002 < h:
                h = max(min_thick, best - 0.002)
        v.co = base + n * h
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('Pillow', me)
    bpy.context.scene.collection.objects.link(o)
    # en jämnare yta efter formningen
    sm = o.modifiers.new('smooth', 'SMOOTH'); sm.factor = 0.5; sm.iterations = 3
    bpy.context.view_layer.objects.active = o
    for ob in bpy.context.selected_objects: ob.select_set(False)
    o.select_set(True)
    bpy.ops.object.modifier_apply(modifier='smooth')
    for p in me.polygons: p.use_smooth = True
    m = bpy.data.materials.get('Pillow') or bpy.data.materials.new('Pillow')
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.80, 0.83, 0.86, 1)
    bsdf.inputs['Roughness'].default_value = 0.92
    me.materials.append(m)
    return o
