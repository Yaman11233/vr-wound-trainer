# Britsens mått i Blender-koordinater, speglade från src/env/layout.js.
# App (three.js, Y upp) -> Blender (Z upp): bx = x, by = -z, bz = y.
import math

BED_CENTER_APP = (0.45, -1.25)     # x, z
BED_LENGTH = 1.95
BED_WIDTH = 0.68
BED_TOP = 0.78                     # madrassens ovansida
HEAD_X = BED_CENTER_APP[0] - BED_LENGTH / 2
BACKREST_LEN = 0.85                # ryggstödets längd från huvudändan
BACKREST_DEG = 30.0                # ryggstödets vinkel mot horisontalplanet
HINGE_X = HEAD_X + BACKREST_LEN
BED_Y = -BED_CENTER_APP[1]         # britsens mittlinje i Blender-y (1.25)
EDGE_Y_USER = BED_Y - BED_WIDTH / 2  # kanten mot användaren (patientens högra sida)

def backrest_dirs():
    t = math.radians(BACKREST_DEG)
    up_along = (-math.cos(t), 0.0, math.sin(t))   # längs ryggstödet mot huvudet
    normal = (math.sin(t), 0.0, math.cos(t))      # ut från ryggstödets yta
    return up_along, normal

def app_from_blender(v):
    return [v[0], v[2], -v[1]]
