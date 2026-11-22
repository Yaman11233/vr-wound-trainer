#!/bin/bash
# Komprimerar patient_raw.glb till assets/models/patient/patient.glb (KTX2 + meshopt) och
# gör om hudens extra kartor (SSS/blekhet/svett-masker, porkakel) till KTX2.
# Kräver: Node (npx @gltf-transform/cli@4) och toktx (KTX-Software 4.4) i PATH.
set -e
T="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$T/../.." && pwd)"
WU="${PATIENT_WORK:-$T/../../../patient-work}"; WU="$(cd "$WU" && pwd)"
OUT="$REPO/assets/models/patient"; mkdir -p "$OUT"
GT="npx --prefix $WU/node gltf-transform"
cd "$WU"
$GT resize patient_raw.glb s1.glb --width 1024 --height 1024 --pattern "{cloth_normal,cloth_orm,shoes_albedo}"
# Hud och alla normalkartor: UASTC (bäst kvalitet på nära håll). Övrigt: ETC1S (mindre).
$GT uastc s1.glb s2.glb --pattern "{body_*,arm_*,eye_albedo,cloth_normal}" --level 2 --rdo --rdo-lambda 1 --zstd 18
$GT etc1s s2.glb s3.glb --quality 200
$GT meshopt s3.glb "$OUT/patient.glb" --level medium
for n in body_masks arm_masks; do
  toktx --t2 --encode uastc --uastc_quality 2 --zcmp 18 --genmipmap --assign_oetf linear "$OUT/$n.ktx2" "tex/$n.png"
done
toktx --t2 --encode uastc --uastc_quality 2 --zcmp 18 --genmipmap --assign_oetf linear "$OUT/skin_detail_normal.ktx2" tex/skin_detail_normal.png
cp tex/tex_info.json "$OUT/tex_info.json"
rm -f s1.glb s2.glb s3.glb
ls -la "$OUT"
