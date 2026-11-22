# Medicinsk granskning

Alla värden markerade `GRANSKA` i koden eller konfigurationen. Ändra status till `BEKRÄFTAD` i `config/medical.js` (med namn och datum i fältet `reviewed`) när ett värde är granskat. I etapp 1 används inga av värdena ännu; de kopplas in från etapp 3.

| # | Värde | Nu | Källa i koden | Fil |
|---|---|---|---|---|
| 1 | Maxdos lidokain utan adrenalin | 3 mg/kg, högst 200 mg | FASS, Xylocain produktresumé 4.2 | `config/medical.js` |
| 2 | Maxdos lidokain med adrenalin | 7 mg/kg, högst 500 mg | FASS, Xylocain med adrenalin produktresumé 4.2 | `config/medical.js` |
| 3 | Styrkor lidokain | 10 och 20 mg/ml (1 % och 2 %) | FASS | `config/medical.js` |
| 4 | Blodvolym vuxen | 70 ml/kg | ATLS 10th ed., kap. 3 | `config/medical.js` |
| 5 | Blödningsklasser I–IV | <15 %, 15–30 %, 30–40 %, >40 % | ATLS 10th ed., tabell 3-1. Kontrollera mot 11th ed. | `config/medical.js` |
| 6 | Handdesinfektion, tid | 30 s | Vårdhandboken; SOSFS 2015:10 | `config/medical.js` |
| 7 | Initial blödningshastighet, 1A (venös) | 30 ml/min | Uppskattning, ingen källa än | `scenarios/forearm-1a.js` |
| 8 | Tetanus i anamnesen, 1A | Grundvaccinerad, senaste dos för 12 år sedan | Scenarioval; beslutsregeln läggs in i etapp 5 | `scenarios/forearm-1a.js` |

## Anatomi i patientmodellen (granska gärna på bilderna)

Dessa är inga doseringsvärden, men de syns och ska stämma:

| # | Detalj | Nu | Fil |
|---|---|---|---|
| 9 | Senor vid volara handleden | FCR radialt, PL i mitten (finns hos ca 85 %), FCU ulnart; synliga i distala 7 cm | `tools/blender/step3b_textures.py` |
| 10 | Ytliga vener på underarmen | v. cephalica radialt, v. basilica ulnart, v. mediana antebrachii volart i mitten, små vener vid handleden | `tools/blender/step3b_textures.py` |
| 11 | Sårets läge | Volart, distala underarmen, ca 6 cm proximalt om handledsleden (mätt längs underarmsbenet) | `tools/blender/step2_pose.py` |
| 12 | Ställning | Ryggstöd 30°, höger arm abducerad 75° och supinerad på handbord, armbågen böjd ca 14°, handryggen mot bordet, fingrarna i avslappnad kaskad | `tools/blender/step2_pose.py` |
| 13 | Blekhet | Börjar i läppar, ansikte och nagelbäddar; huden blir gulgrå, inte vit | `src/patient/skinShader.js` |
| 14 | Handens proportioner | Ca 20 cm från handledsvecket till långfingertoppen; fingrar ca 1,9 cm breda; pek-, ring- och lillfinger ca 93, 92 och 75 % av långfingret | `tools/blender/step1_human.py`, `step2_pose.py` |

## Att diskutera

- **ATLS 11th ed. (2025):** jag har inte kunnat kontrollera om tabellen över blödningsklasser har ändrats. Om den har det bör fysiologin i etapp 3 följa den nya versionen.
- **Blödningshastighet (#7):** värdet styr hur snabbt patienten försämras om man inte trycker. Det är ett pedagogiskt val lika mycket som ett medicinskt. Vilken försämringstakt vill du ha för 1A?
