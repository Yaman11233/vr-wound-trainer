# Tillgångar och licenser

Allt grafiskt innehåll i appen är antingen CC0, MIT eller gjort i det här repot. Ingen tillgång kräver
namngivning, men källorna står här så att du kan kontrollera dem.

## Patienten (`assets/models/patient/`)

Patienten byggs med skripten i `tools/blender/` i Blender 5.1 med tillägget MPFB 2.0.18. MPFB:s
programkod är GPL-3.0 men följer inte med appen. Det som följer med är MakeHumans data, som är CC0.

| Del | Tillgång | Upphov | Licens | Källa |
|---|---|---|---|---|
| Basnät, fenotyp- och ansiktsmål (targets) | MakeHuman basnät `base.obj` och targets | MakeHuman-projektet | CC0 (släppt september 2020) | MPFB 2 (extensions.blender.org), `data/3dobjs`, `data/targets` |
| Skelett och vikter | `game_engine`-riggen | MakeHuman/MPFB | CC0 | MPFB 2, `data/rigs/standard` |
| Ansiktsuttryck (ARKit-enheter) | faceunits01 | Mika Suominen | CC0 | https://static.makehumancommunity.org/assets/assetpacks/faceunits01.html |
| Hud (grund) | `young_caucasian_male2` | makehuman_system | CC0 | makehuman_system_assets, https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html |
| Ögon | `high-poly` (nät), `brownlight` (iris) | makehuman_system | CC0 | makehuman_system_assets |
| Ögonbryn | `eyebrow001` | makehuman_system | CC0 | makehuman_system_assets |
| Ögonfransar | `eyelashes02` | makehuman_system | CC0 | makehuman_system_assets |
| Tänder | `teeth_base` | makehuman_system | CC0 | makehuman_system_assets |
| Hår | `short01` | makehuman_system | CC0 | makehuman_system_assets |
| T-tröja och jeans | `male_casualsuit06` | makehuman_system | CC0 | makehuman_system_assets |
| Skor | `shoes06` | makehuman_system | CC0 | makehuman_system_assets |
| Strumpor | `joepal_crude_low_socks` | Joel Palmius | CC0 | underwear04, http://www.makehumancommunity.org/node/32 |

### Bearbetning i det här repot (samma licens som ovan, CC0)

- **Hud:** färgvariation, rodnad (näsa, kinder, öron, knogar, fingertoppar), skäggstubb, vener, senor vid
  handleden, handflatans och fingrarnas veck, fint hår på underarmen, nagelband och födelsemärken räknas fram
  i `tools/blender/step3b_textures.py`. Normalkartor, råhet, AO och maskerna för SSS, blekhet och svett
  bakas och räknas i samma steg. Porerna är en egen kakelbar karta (`skin_detail_normal.ktx2`).
- **T-tröjan:** MakeHuman-loggan på bröst, rygg och ärm är bortmålad, och tygets vita ton är något dämpad.
- **Ögon:** irisen är nedtonad och ögonvitan har fått en svagt varm ton.
- **Hår:** färgen är justerad till mörkbrun.
- **Ställning, uttryck och andning:** halvsittande ställning, `blink_L`, `blink_R`, `worried`, `pain`
  (sammansatta av ARKit-enheterna ovan) och `breath_chest`, `breath_abd` (gjorda i `step2_pose.py`).

## Övrigt

| Tillgång | Licens | Fil |
|---|---|---|
| three.js r187 | MIT | `vendor/three/LICENSE` |
| Immersive Web Emulation Runtime 2.8 | MIT | `vendor/iwer/LICENSE` |
| Generiska handmodeller (W3C webxr-input-profiles) | MIT | `assets/models/hands/LICENSE-webxr-input-profiles.md` |
| Rummets texturer | Gjorda i koden (procedurella) | `src/assets/proctex.js` |

## Verktyg som används för att bygga tillgångarna (följer inte med appen)

- Blender 5.1 och MPFB 2.0.18 (GPL-3.0)
- KTX-Software 4.4.2 (`toktx`, Apache-2.0), från https://github.com/KhronosGroup/KTX-Software
- glTF Transform 4.5 (`@gltf-transform/cli`, MIT) för KTX2- och meshopt-komprimering
