#!/bin/bash
# Kör hela patientbygget i ordning (Git Bash på Windows).
#   tools/blender/build_all.sh [steg]   steg: 1 (allt), 2, 3, 4, 5, 6 (export)
# Arbetsfiler hamnar i ../patient-work (utanför repot), eller i $PATIENT_WORK.
set -e
B="${BLENDER:-/c/Program Files/Blender Foundation/Blender 5.1/blender.exe}"
T="$(cd "$(dirname "$0")" && pwd)"
WU="${PATIENT_WORK:-$T/../../../patient-work}"
mkdir -p "$WU"; WU="$(cd "$WU" && pwd)"
W="$(cygpath -w "$WU")"
run() {
  echo "== $1"
  if [ -n "$2" ]; then "$B" -b "$W\\$2" --python "$T/$1" > "$WU/log_$1.txt" 2>&1
  else "$B" -b --python "$T/$1" > "$WU/log_$1.txt" 2>&1; fi
  grep -E "STEP|rror|Traceback" "$WU/log_$1.txt" || true
}
case "${1:-1}" in
  1) run step1_human.py ;&
  2) run step2_pose.py step1_human.blend ;&
  3) run step3a_prep.py step2_posed.blend ;&
  4) run step3b_textures.py ;&
  5) run step3c_materials.py step3a.blend ;&
  6) run step4_export.py step3c.blend ;;
esac
