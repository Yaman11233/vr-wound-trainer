# Handoff: Sårvård VR

Senast uppdaterad: 20 november 2026, efter etapp 1.

## Var allt finns

| Vad | Var |
|---|---|
| Live-adress (öppna i Quest) | https://yaman11233.github.io/vr-wound-trainer/ |
| Test på datorn med emulator | https://yaman11233.github.io/vr-wound-trainer/?iwer=1 |
| GitHub-repo (offentligt) | https://github.com/Yaman11233/vr-wound-trainer |
| Publicering | GitHub Pages från `main`, rotmappen |

## Etapper

| # | Innehåll | Status |
|---|---|---|
| 1 | Struktur, XR-start, rum, brits, platshållarpatient, datorläge, Pages | **Klar, ej testad i headset** |
| 2 | Händer: modell, filter, gester med hysteres, kolliderare, handskar | Nästa |
| 3 | Sår, blödning, fysiologi och monitor | |
| 4 | Fas A med scenariomotor och loggning | |
| 5 | Fas B: handsprit, distalt status, sterila handskar, fält, bedövning, spolning, exploration | |
| 6 | Suturering | |
| 7 | Genomgång, lägen, språk, realism och prestanda | |

## Klart i etapp 1

- **XR-start med lärdomarna från mini-vr:** gammal session avslutas först, dubbelklick spärras, koordinatsystem provas i ordningen `local-floor`, `local`, `viewer` (scenen lyfts 1,6 m utan golvnivå), och fel visas med stegnummer 1–4 under knappen. Fixed foveated rendering är på, och `framebufferScaleFactor` kan ändras med `?fbs=`.
- **Behandlingsrummet:** undersökningsbrits med pappersrulle och pappersskydd, armbord, rostfri instrumentvagn, sårvagn med lådor, handspritdispenser och handskhållare (S/M/L, nitril) på vänster vägg, vitalparametermonitor på stativ (visar streck tills givare kopplas), kanylburk, pedalhink och kärl för smittförande avfall, väggmonterad undersökningslampa (den enda realtidsskuggan), gaspanel, väggklocka, tvättställ, dörr och takpaneler.
- **Platshållarpatient:** man i t-shirt och jeans, höger arm supinerad på armbordet, en tunn markering där såret kommer. Patienten andas (bröst och buk), blinkar var 2–6 s och vrider huvud och ögon mot läkaren. Blekhet och svettning finns i koden men styrs först av fysiologin i etapp 3.
- **Händer och kontroller:** W3C:s generiska handmodell följer de 25 lederna. Kontroller visas med modell och stråle.
- **Handledsmeny:** vänd vänster handflata mot ansiktet (eller tryck Y på kontrollen) för *Återställ position*, *Avsluta VR* och, i instruktörsläget, *Bildfrekvens*.
- **Datorläge** (mus och W A S D) och **emulatorläge** (`?iwer=1`).
- **Grunden för senare etapper:** händelsebuss, simulerad tid (paus och snabbspolning), scenarioregister, `config/medical.js` med källor och GRANSKA, och språkstöd för svenska, engelska och arabiska (RTL).
- **Prestanda (mätt på datorn):** cirka 57 draw calls inklusive skuggpass och 32 000 trianglar. Budgeten är 100 draw calls och 300 000 trianglar.

## Testat

- Datorn (Chrome, lokal server): startsidan, datorläget, rummet och patienten renderas utan fel i konsolen.
- Emulatorn (IWER, Quest 3-profil): VR-sessionen startar med `local-floor`. Kontroller och händer ansluter, och handmodellerna laddas från repot. Menyknapparna aktiveras en gång per tryck och kräver att fingret släpps innan nästa tryck. Återställningen placerar huvudet på origo och vänder blicken framåt (kontrollerat med beräkning). *Avsluta VR* tar en tillbaka till startsidan.

## Inte testat

- **Allt i riktigt headset.** Det gäller bildfrekvensen i Quest 3, handledsmenyn med riktig handspårning, Meta-knappens omcentrering och vad som händer om golvnivå saknas.
- Arabiska texter i 3D-panelerna. Bara startsidan är översatt, och arabiskan behöver granskas av någon som har språket som modersmål.

## Kända begränsningar

- Patienten är en platshållare av enkla former. Den riktiga modellen (MPFB2, CC0) tas fram med Blender 5.1 på din dator, troligen tillsammans med etapp 3 när såret byggs in i underarmen.
- Texturerna är procedurella. Riktiga CC0-texturer i KTX2 kommer i etapp 7.
- Handmodellen är vit och generisk. Hud och handskar kommer i etapp 2.
- Kontrollmodellerna hämtas från jsDelivr. Utan nät visas kontrollerna inte, men händerna fungerar.

## Checklista för headsetet (etapp 1)

1. Öppna live-adressen i Quest-webbläsaren. Välj **Instruktör** som läge och tryck **Gå in i VR**. Om knappen står still: titta efter en behörighetsruta och välj Tillåt.
2. **Står du rätt?** Du ska stå vid patientens högra sida med huvudet till vänster och armbordet framför dig. Om inte: håll in Meta-knappen eller använd *Återställ position* i menyn.
3. **Höjd och skala:** britsen ska vara ungefär i höftnivå och armbordet ska kännas lagom att arbeta vid stående. Säg till om något känns för högt, lågt, nära eller långt bort. Allt går att flytta i `src/env/layout.js`.
4. **Händerna:** lägg ner kontrollerna. Händerna ska visas och följa fingrarna. Notera om de darrar eller hackar när du håller dem stilla över armbordet.
5. **Menyn:** vänd vänster handflata mot ansiktet. Menyn ska dyka upp vid handleden. Tryck med höger pekfinger på *Bildfrekvens*. Notera om trycket känns säkert eller om knappen löser ut för tidigt eller för sent.
6. **Bildfrekvens:** läs av mätaren nere till vänster i synfältet medan du rör huvudet. Målet är 72 fps eller mer. Notera siffran, och om bilden någon gång hackar.
7. **Patienten:** se att bröstkorgen rör sig, att ögonen blinkar och att huvudet vänds mot dig när du går runt britsen.
8. **Rummet:** titta på handspriten och handskhållaren på vänster vägg, monitorn, klockan och avfallskärlen. Säg till om något ser fel ut för en svensk akutmottagning.
9. **Kontroller:** ta upp kontrollerna. Strålar ska synas. Tryck Y för menyn och sikta och tryck med höger avtryckare.
10. **Avsluta** via menyn och se att du kommer tillbaka till startsidan.

## Nästa steg (etapp 2)

1. Egen hudfärgad handmodell som följer alla 25 leder, med material för nitrilhandskar och sterila handskar.
2. One Euro-filter mot darrningar, med parametrar i instruktörsläget.
3. Nyp och grepp med hysteres och en diskret indikator när ett grepp är på väg att aktiveras.
4. Kolliderare för fingrar och handflata, och en synlig hand som stannar mot ytor medan en svag kontur visar var den riktiga handen är.
5. Testscen för precision: tryck på en punkt på underarmen och se avvikelsen i millimeter.
