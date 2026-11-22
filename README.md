# Sårvård VR

En medicinsk träningsapp i VR (WebXR) för Meta Quest 3. Övningen gäller blödningskontroll och sårvård vid en skärskada på underarmen i ett behandlingsrum på en svensk akutmottagning.

**Live:** https://yaman11233.github.io/vr-wound-trainer/

- Öppna adressen i Quest-webbläsaren och tryck på **Gå in i VR**.
- På datorn: **Datorläge**, eller lägg till `?iwer=1` i adressen för att köra VR-flödet i Immersive Web Emulator.

Status: **etapp 1 av 7 + realistisk patient** (rum, MPFB2-patient, XR-start, datorläge). Se `HANDOFF.md`.

## Köra lokalt

Du behöver ingen byggprocess, bara en statisk webbserver i projektmappen:

```bash
python -m http.server 8000
```

Öppna sedan http://localhost:8000. WebXR kräver https eller localhost, så för att testa i Quest används GitHub Pages.

Adressparametrar:

| Parameter | Effekt |
|---|---|
| `?iwer=1` | Installerar Immersive Web Emulator (Quest 3) för test utan headset |
| `?mode=instructor` | Förväljer instruktörsläget (FPS-mätare i menyn) |
| `?fbs=0.8` | Sänker upplösningen i VR om bildfrekvensen inte räcker |

## Filstruktur

```
index.html            startsida och importmap
src/main.js           kopplar ihop allt
src/core/             xr.js (sessionsstart), scene.js (renderare, rigg, omcentrering),
                      bus.js (händelsebuss), time.js (simulerad tid), batch.js (draw calls)
src/env/              layout.js (alla mått och placeringar), room.js, monitor.js, clock.js, materials.js
src/patient/          patient.js (gränssnitt + GLB-laddning), placeholder.js
src/input/            xrinput.js (händer/kontroller), desktop.js (mus/tangentbord)
src/ui/               wristmenu.js, panel3d.js, fps.js, start.css
src/i18n/             sv.js (standard), en.js, ar.js (RTL)
src/assets/           proctex.js (procedurella texturer, ersätts senare)
scenarios/            ett scenario per fil + index.js
config/medical.js     alla medicinska värden med källa och granskningsstatus
vendor/               three.js r187 och IWER 2.8 (MIT)
assets/models/        handmodeller (W3C webxr-input-profiles, MIT) och patienten (CC0, se ASSETS.md)
tools/blender/        skript som bygger patienten i Blender + MPFB2
screenshots/patient/  renderingar (Blender) och skärmbilder (appen) för granskning
```

## Lägga till ett nytt scenario

1. Kopiera `scenarios/forearm-1a.js` till en ny fil, t.ex. `scenarios/hand-2a.js`, och ändra `id`, `titleKey`, `patient` och `wound`.
2. Lägg titeln i `src/i18n/sv.js` (och gärna `en.js`).
3. Lägg till scenariot i listan i `scenarios/index.js`.
4. Medicinska värden som scenariot behöver läggs i `config/medical.js` med källa och status `GRANSKA`, aldrig direkt i scenariofilen.

Fälten `phases` (steg, villkor, tillåtna ordningar, bedömning) fylls i från etapp 4, när scenariomotorn finns. Då utökas det här avsnittet med ett fullständigt exempel.

## Patienten

Patienten (`assets/models/patient/patient.glb`) byggs med skript i Blender från MPFB 2 och MakeHumans
CC0-tillgångar. Källor och licenser finns i `ASSETS.md`.

### Bygga om patienten

Det här behövs:

- Blender 5.1 med tillägget MPFB 2 (Edit → Preferences → Get Extensions → "MPFB")
- MakeHumans CC0-paket uppackade i MPFB:s användarmapp (`%APPDATA%\Blender Foundation\Blender\5.1\extensions\.user\blender_org\mpfb\data`): makehuman_system_assets, skins02, underwear04 och faceunits01
- Node (för `npx @gltf-transform/cli@4`) och `toktx` från KTX-Software 4.4 i PATH

Kör sedan i Git Bash:

```bash
tools/blender/build_all.sh        # steg 1–4: kropp, ställning, texturer, material, export
tools/blender/compress.sh         # KTX2 + meshopt till assets/models/patient/
```

Arbetsfilerna (.blend, bakade kartor, loggar) hamnar i `../patient-work` utanför repot. Varje steg kan köras
för sig, t.ex. `build_all.sh 4` för att börja om från textursteget.

| Skript | Vad det gör |
|---|---|
| `step1_human.py` | Fenotyp (ålder, kön, längd, vikt), ansiktets drag och asymmetrier, ögon, hår, kläder, rigg |
| `step2_pose.py` | Uttryck och andning som shape keys, halvsittande ställning på britsen, ögon som egna noder, sårankare |
| `step3a_prep.py` | Tar bort dold hud, delar upp armen (Catmull-Clark), egen UV för armen, bakar datakartor |
| `step3b_textures.py` | Hudens detaljer och masker (se ASSETS.md) |
| `step3c_materials.py` | Material för glTF och Cycles |
| `step4_export.py` | GLB-export |
| `render_final.py` | Cycles-renderingar för granskning |

Britsens mått finns både i `src/env/layout.js` och i `tools/blender/bed.py`. Ändras ställningen, kopiera
de nya värdena för kudde, armbord och sår från `patient-work/bed_fit.json` och `step2_report.json` till
`layout.js`.

### Vad appen använder i modellen

- **Noder:** `WoundAnchor` (sårets mitt; lokal +Y = hudens normal, +X = mot handen), `Eye_L` och `Eye_R` (extras `fwd` = blickriktning i vila), skelettets ben `head`, `neck_01` och fingrarnas `*_0[123]_r`
- **Morph targets:** `blink_L`, `blink_R`, `worried`, `pain`, `breath_chest`, `breath_abd`
- **Material:** `Skin_Body` och `Skin_Arm` får hudshadern (`src/patient/skinShader.js`) med maskerna `body_masks.ktx2`/`arm_masks.ktx2` och porkaklet `skin_detail_normal.ktx2`. `Hair`, `Brows` och `Lashes` ritas med alpha-to-coverage, och `Cornea` additivt.

Kontaktskuggan under armen på handbordet räknas fram vid start från modellens hudpunkter
(`src/patient/contactShadow.js`).

Hur bilderna för en hudtextur från foto ska tas står i `FOTOINSTRUKTION.md`.

Saknas filen eller går den inte att ladda används en enkel platshållare.

## Händelsebuss

Moduler kommunicerar via `bus.emit(namn, data)`. Bedömningen (etapp 4) lyssnar med `bus.onAny`. Händelser hittills: `patient.ready`, `session.started`, `session.ended`, `input.connected`, `input.disconnected`, `input.selectstart`, `input.selectend`, `view.recentered`.

## Licenser

Se `ASSETS.md`.
