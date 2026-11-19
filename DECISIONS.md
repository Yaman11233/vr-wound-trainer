# Beslut

Varje beslut som avviker från eller kompletterar uppdragsbeskrivningen, med en mening om varför.

## Plan (godkänd 20 november 2026)

- **Scenario 1 delas i 1A och 1B.** En djup volar skada med arteriell blödning remitteras i praktiken till handkirurg och sutureras inte i akuten, så suturering hör bara hemma i den ytliga varianten 1A.
- **Höjning av armen är valfri och ger inga minuspoäng.** ERC:s riktlinjer för första hjälpen (2015 och senare) rekommenderar inte längre höjning, eftersom evidensen är svag.
- **Blodtrycksmanschetten ska sitta på den oskadade armen.** Manschetten på den skadade armen ökar blödningen och stör tryckbehandlingen.
- **Handkontroller och halvautomatiska knutar är tillåtna i suturläget.** Handspårningen på Quest 3 har några millimeters brus och ingen haptik, vilket inte räcker för en instrumentknut.
- **Ytor vid handdesinfektion bedöms bara ungefärligt.** Händerna skymmer varandra när man gnider dem mot varandra, och då tappar Quest spårningen. Appen bedömer tid, rörelsemönster och ordning, och genomgången säger det öppet.
- **Instruktörskoppling från en annan dator skjuts upp.** GitHub Pages kan bara servera statiska filer, så det kräver en signaleringsserver.

## Etapp 1

- **Inget byggsteg; three.js r187 ligger i repot (`vendor/`).** Du kan redigera filer direkt på GitHub. Appen kan inte gå sönder av en CDN-uppdatering och laddar snabbare i Quest.
- **Användaren står vid patientens högra sida, med huvudet till vänster.** Det är den vanliga arbetsställningen för en högerhänt läkare vid en skada på höger arm.
- **Patientens högra arm ligger på ett armbord (handbord), supinerad.** Det är standard vid sårvård på hand och underarm och ger fri åtkomst till volarsidan.
- **Patienten bär egna kläder (t-shirt, jeans).** En patient som just skurit sig på glas har inte hunnit byta till patientkläder.
- **Monitorn visar streck tills givare kopplas.** Det är så en riktig monitor ser ut innan man anslutit den, och kopplingen är en del av övningen i fas A.
- **Väggklocka med sekundvisare i rummet.** Scenario 1B kräver att tiden noteras när en tourniquet läggs.
- **Texturerna är procedurella (canvas) i etapp 1.** Riktiga CC0-texturer i KTX2 kräver ett konverteringsverktyg (toktx/basisu) som inte är installerat. Det tas upp i etapp 7 när rummet är färdigt.
- **Den fasta delen av rummet slås ihop per material.** Det håller oss på cirka 57 draw calls (inklusive skuggpass), med marginal mot budgeten på 100.
- **En enda realtidsskugga, från undersökningslampan riktad mot såret.** Det är där skuggor spelar roll (händer över såret), och det håller budgeten.
- **Handmodellen i etapp 1 är W3C:s generiska hand (MIT), lagrad lokalt.** Den visar riktig handform från start. Egen hudfärgad modell med handskar kommer i etapp 2.
- **Kontrollmodellerna hämtas från jsDelivr (webxr-input-profiles).** Det är reservläget, och de laddas bara när kontroller används. De kan läggas lokalt senare.
- **Handledsmenyn öppnas när vänster handflata vänds mot ansiktet (Y-knappen med kontroller).** Det är samma mönster som Quests eget system, och menyn är ur vägen under övningen.
- **Menyknappar aktiveras när fingret är 6 mm in i ytan och släpps först 2 mm framför den.** Hysteresen gör att en knapp inte kan tryckas två gånger av handspårningsbrus.
- **FPS-mätaren visas bara i instruktörsläget,** som i uppdraget. Den visar draw calls och trianglar per öga mot budgeten.
- **`layers` begärs inte i WebXR-sessionen ännu.** Det minskar antalet rörliga delar i etapp 1 och prövas i etapp 7.
- **Emulatorn (IWER 2.8) ligger lokalt och laddas bara med `?iwer=1`.** Vanliga besökare laddar inte de 1,3 MB.
