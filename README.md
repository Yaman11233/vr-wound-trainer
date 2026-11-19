# Sårvård VR

En medicinsk träningsapp i VR (WebXR) för Meta Quest 3. Övningen gäller blödningskontroll och sårvård vid en skärskada på underarmen i ett behandlingsrum på en svensk akutmottagning.

**Live:** https://yaman11233.github.io/vr-wound-trainer/

- Öppna adressen i Quest-webbläsaren och tryck på **Gå in i VR**.
- På datorn: **Datorläge**, eller lägg till `?iwer=1` i adressen för att köra VR-flödet i Immersive Web Emulator.

Status: **etapp 1 av 7** (rum, patient som platshållare, XR-start, datorläge). Se `HANDOFF.md`.

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
assets/models/        handmodeller (W3C webxr-input-profiles, MIT); patient kommer hit
```

## Lägga till ett nytt scenario

1. Kopiera `scenarios/forearm-1a.js` till en ny fil, t.ex. `scenarios/hand-2a.js`, och ändra `id`, `titleKey`, `patient` och `wound`.
2. Lägg titeln i `src/i18n/sv.js` (och gärna `en.js`).
3. Lägg till scenariot i listan i `scenarios/index.js`.
4. Medicinska värden som scenariot behöver läggs i `config/medical.js` med källa och status `GRANSKA`, aldrig direkt i scenariofilen.

Fälten `phases` (steg, villkor, tillåtna ordningar, bedömning) fylls i från etapp 4, när scenariomotorn finns. Då utökas det här avsnittet med ett fullständigt exempel.

## Byta patientmodell

Lägg GLB-filen i `assets/models/patient/` och ange sökvägen i scenariofilens `patient.model`. Appen letar efter följande (allt valfritt):

- noden `WoundAnchor`: där såret sätts fast (volarsidan, distala underarmen)
- noden `HeadPivot`: vrids för att följa läkaren med blicken
- morph targets `blink` och `breath`
- ett material vars namn innehåller `skin` eller `body`: färgas vid blekhet och svettning

Saknas filen eller går den inte att ladda används platshållaren.

## Händelsebuss

Moduler kommunicerar via `bus.emit(namn, data)`. Bedömningen (etapp 4) lyssnar med `bus.onAny`. Händelser i etapp 1: `patient.ready`, `session.started`, `session.ended`, `input.connected`, `input.disconnected`, `input.selectstart`, `input.selectend`, `view.recentered`.

## Licenser

- three.js: MIT (`vendor/three/LICENSE`)
- Immersive Web Emulation Runtime: MIT (`vendor/iwer/LICENSE`)
- Generiska handmodeller: MIT (`assets/models/hands/LICENSE-webxr-input-profiles.md`)
