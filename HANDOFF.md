# Handoff: Sårvård VR

Senast uppdaterad: 22 november 2026, efter etappen med den realistiska patienten.

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
| P | Realistisk patient (MPFB2), halvsittande, uttryck, andning, hudshader | **Klar, ej testad i headset** |
| 2 | Händer: modell, filter, gester med hysteres, kolliderare, handskar | Nästa |
| 3 | Sår, blödning, fysiologi och monitor | |
| 4 | Fas A med scenariomotor och loggning | |
| 5 | Fas B: handsprit, distalt status, sterila handskar, fält, bedövning, spolning, exploration | |
| 6 | Suturering | |
| 7 | Genomgång, lägen, språk, realism och prestanda | |

## Klart i patientetappen

- **Patienten** är byggd med MPFB 2 i Blender 5.1. Hela kedjan körs med skript (`tools/blender/`).
  - Kropp: man, 35 år, 178 cm, ca 75 kg, normal byggnad. Ansiktet har egna drag och små asymmetrier.
  - Ögon och hår: ljusbruna ögon med blank hornhinna, ögonbryn, ögonfransar, kort mörkbrunt hår och skäggstubb.
  - Kläder: t-tröja (MakeHuman-loggan bortmålad), jeans, strumpor och skor.
- **Ställning:**
  - Halvsittande med ryggstödet i 30°, huvudet på en kudde.
  - Höger arm abducerad 75°, supinerad på ett fristående handbord med lätt böjd armbåge och avslappnade fingrar.
  - Vänster arm längs kroppen.
- **Hud:**
  - MakeHumans CC0-hud är grunden, med egna detaljer ovanpå: ojämn färg, rodnad på näsa, kinder, öron, knogar och fingertoppar, samt mörkare leder.
  - Ytstruktur: porer (kakelbar detaljnormal), ytliga vener, senor vid volara handleden, handleds- och handflatsveck, och fint hår på underarmen.
  - Naglar och märken: nagelband och några små födelsemärken.
  - Underarm och hand har egen 2K-textur (ca 0,3 mm per texel) och tätare nät.
- **Liv:**
  - Andning: bröst och buk var för sig, frekvens och djup styrbara.
  - Blinkning: oregelbunden, ibland dubbel.
  - Huvud och blick följer läkaren med mjuka rörelser och små pauser.
  - Uttryck: neutral, orolig och smärta, plus en kort grimas via `patient.flinch()`.
  - Fingrarna böjs och sträcks var för sig (`patient.setFinger`).
- **Hudshadern i appen:**
  - Fejkad SSS: wrap-belysning, röd ton i skuggövergången och genomlysning i öron och fingrar.
  - Blekhet: börjar i läppar, ansikte och nagelbäddar.
  - Svett: blank panna, överläpp och handflator, med droppar.
  - Blekhet och svett är shader-parametrar (`patient.setSkinState`).
- **Rummet:**
  - Britsen har nu höjt ryggstöd med stag, och kudden ligger på ryggstödet.
  - Handbordet står på en pelare med fot och följer armen.
  - Undersökningslampan är sänkt till intensitet 5.
- **Dokumentation:** `ASSETS.md` listar källa och licens för varje tillgång.

### Siffror (mätta i datorläget)

| | Värde | Mål |
|---|---|---|
| Patientens trianglar | **47 176** (hud 28 604, varav arm 15 664; kläder 7 168; hår 3 678; skor 3 064; tänder 1 566; ögon 2 040; övrigt 1 056) | 40 000–60 000 |
| Patientens nät / material | 13 nät, 11 material, 53 ben | |
| Hela scenen, översiktsvy | **59 draw calls, 99 188 trianglar** (inklusive skuggpasset) | < 100, < 300 000 |
| Nedladdning | patient.glb 9,3 MB + hudkartor 0,9 MB (KTX2 + meshopt) | |
| Texturminne (GPU) | ca 55 MB (nio 2K-texturer, resten 1K och mindre) | |

### Bilder

`screenshots/patient/`: `blender_*.jpg` är Cycles-renderingar i full kvalitet och `app_*.jpg` är skärmbilder ur appen (datorläget, samma renderare som i Quest men utan headsetets upplösning och linser). Jämförelsen står i avsnittet nedan.

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

- **Patienten i datorläget (Chrome, lokal server):** modellen laddas utan fel i konsolen, med KTX2-texturer och meshopt-geometri. Huvud och ögon vänds mot kameran, och blinkning och andning går.
- **Patientens tillstånd:** blekhet, svett, smärtgrimas och fingerböjning är provade via `window.__app.patient` och ser rätt ut i skärmbilderna.
- **Cycles-renderingar:** helfigur, ansikte, underarm och hand är gjorda från den slutliga modellen.

- Datorn (Chrome, lokal server): startsidan, datorläget, rummet och patienten renderas utan fel i konsolen.
- Emulatorn (IWER, Quest 3-profil): VR-sessionen startar med `local-floor`. Kontroller och händer ansluter, och handmodellerna laddas från repot. Menyknapparna aktiveras en gång per tryck och kräver att fingret släpps innan nästa tryck. Återställningen placerar huvudet på origo och vänder blicken framåt (kontrollerat med beräkning). *Avsluta VR* tar en tillbaka till startsidan.

## Inte testat

- **Allt i riktigt headset.** Det gäller bildfrekvensen i Quest 3, handledsmenyn med riktig handspårning, Meta-knappens omcentrering och vad som händer om golvnivå saknas.
- Arabiska texter i 3D-panelerna. Bara startsidan är översatt, och arabiskan behöver granskas av någon som har språket som modersmål.

## Kända begränsningar

- Platshållarpatienten (reserv om GLB:n inte laddas) ligger platt och stämmer inte med det höjda ryggstödet.
- Inget i patienten är testat i headset: bildfrekvens, hudshaderns kostnad, alpha-to-coverage på håret och nedladdningstiden (ca 10 MB).
- Senorna rör sig inte med fingrarna (se ovan).
- Rummets texturer är procedurella. Riktiga CC0-texturer i KTX2 kommer i etapp 7.
- Handmodellen är vit och generisk. Hud och handskar kommer i etapp 2.
- Kontrollmodellerna hämtas från jsDelivr. Utan nät visas kontrollerna inte, men händerna fungerar.

## Checklista för headsetet (patienten)

1. Öppna live-adressen, välj **Instruktör** och tryck **Gå in i VR**. Det kan ta några sekunder längre än tidigare, eftersom patienten (ca 10 MB) laddas.
2. **Bildfrekvens:** slå på mätaren i handledsmenyn. Notera siffran när du står vid armen och tittar på patienten. Målet är 72 fps eller mer.
3. **Helheten:** ser patienten ut som en verklig människa, eller som en docka? Notera vad som stör mest.
4. **Ansiktet (gå till huvudändan):** följer blicken dig? Ser blinkningar, andning och den lätt oroliga minen naturliga ut? Ser huden ut som hud eller som plast?
5. **Underarmen från 30–40 cm:** syns vener, senor, handledsveck och hår? Ser huden levande ut i lampans ljus?
6. **Ställningen:** vilar patienten tungt på britsen? Är handbordets höjd (såret på ca 1,10 m) bekväm att arbeta vid stående?
7. **Håret och ögonfransarna:** flimrar kanterna när du rör huvudet?

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

## Blender jämfört med appen (ärlig bedömning)

**Det som försvinner i Quest-versionen:**

- **Riktig SSS.** I Cycles sprids ljuset under huden, så att öron, näsvingar och fingrar lyser rött i motljus och skuggkanterna blir mjuka. Shadern i appen härmar det med wrap-belysning och en röd ton. Den gör huden mindre gipsartad, men saknar djupet i Cycles-bilden. Mest syns det i ansiktet i sidoljus.
- **Indirekt ljus och mjuka skuggor.** Cycles ger kontaktskuggor (armen mot handbordet, huvudet mot kudden) och färgat studsljus. Appen har bara bakad AO och en realtidsskugga från lampan, så patienten ser lite mer "utklippt" ut mot britsen.
- **Ytdetaljer.** Fina hudveck, vener och fint hår syns i närbilderna från Cycles men blir svaga i appen. Det beror på texturkomprimering, filtrering och skarpare ljus. I headsetet syns troligen ännu mindre på grund av upplösningen per grad.
- **Hår och ögonfransar.** Kortkorten med alpha-to-coverage blir hårdare i kanterna än i Cycles.
- **Ögonen.** Hornhinnan ger reflexer men ingen brytning, och irisens djup saknas.

**Det som går att förbättra:**

1. **Bättre hudbas.** MakeHumans hudtextur är 2K för hela kroppen och ganska slät. En skannad CC0-hud fanns inte att få tag på. En högupplöst hand-/underarmstextur målad från fotoreferenser (egna eller CC0) skulle ge mest.
2. **Rörliga senor.** Senorna vid handleden är bara en normalkarta i dag och rör sig inte med fingrarna. Det går att lösa med morph targets (korrigeringsformer) som styrs av fingrarnas böjning, men kräver modellering i Blender.
3. **Tygets veck.** Kläderna har MakeHumans normalkarta men inga veck som följer ställningen. En sculpt-pass i Blender eller tygsimulering i ställningen och sedan bakning skulle göra t-tröjan och jeansen trovärdigare.
4. **Kontaktdeformation.** Kroppen trycks in ca 1 cm i madrassen, men varken huden eller madrassen formas efter varandra. En korrigerande form för rygg och skinkor plus en intryckt kudde skulle få patienten att se tyngre ut.
5. **Ansiktet på nära håll.** Ögonlocksranden, tårvätskan i ögonvrån och fuktiga läppar saknas. Det är små modelleringsjobb.
6. **Budget att flytta.** Benen har nu få trianglar (jeans 7 000 totalt). Det finns utrymme att lägga ca 10 000 trianglar till på ansiktet och händerna inom 60 000.

## Nästa steg (etapp 2)

1. Egen hudfärgad handmodell som följer alla 25 leder, med material för nitrilhandskar och sterila handskar.
2. One Euro-filter mot darrningar, med parametrar i instruktörsläget.
3. Nyp och grepp med hysteres och en diskret indikator när ett grepp är på väg att aktiveras.
4. Kolliderare för fingrar och handflata, och en synlig hand som stannar mot ytor medan en svag kontur visar var den riktiga handen är.
5. Testscen för precision: tryck på en punkt på underarmen och se avvikelsen i millimeter.
