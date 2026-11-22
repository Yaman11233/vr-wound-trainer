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

## Etapp: realistisk patient (före händerna)

- **Patienten byggs helt med skript i Blender (`tools/blender/`).** Hela kedjan kan köras om från början, så att ändringar i ålder, vikt, ställning eller sår inte kräver handarbete.
- **Hudbasen är MakeHumans `young_caucasian_male2` (CC0), förbättrad med egna detaljer i stället för att bytas ut.** MakeHumans hudtexturer är de enda CC0-hudarna som passar MPFB:s UV. Detaljerna räknas per texel i 3D, så de bryts inte av UV-skarvar.
- **Höger underarm och hand har en egen 2K-textur och delas upp en gång med Catmull-Clark.** De ses från 30–40 cm. Texeln blir ca 0,3 mm mot 0,5 mm i ansiktet. Skarven mot resten av kroppen ligger under t-tröjans ärm.
- **Huden under kläderna är borttagen.** Det sparar trianglar och hindrar att hud sticker igenom tyget.
- **Ryggstödet står i 30° och patienten är 178 cm lång.** Det är inom 30–45°. En högre vinkel lyfter axeln, och då hamnar armen och såret för högt för att arbeta stående.
- **Armbordet är ett fristående handbord på 1,05 m, vridet längs armen.** Med höjt ryggstöd ligger axeln högt, och en arm abducerad 75° på madrassnivå skulle tvinga axeln i en onaturlig ställning. Såret hamnar på ca 1,10 m, en rimlig arbetshöjd stående. (Ändrat 23 november: 1,10 m och 1,16 m, se nedan.)
- **Armen är abducerad 75° och sluttar 22° från axeln ned till bordet.** Armbågen är lätt böjd, och underarmen är supinerad med handflatan uppåt.
- **Supinationen fördelas på överarm (30 %), underarm (55 %) och hand.** Riggen har inget vridben i underarmen, och en vridning på bara ett ben ger synlig "godispappersvridning".
- **Uttrycken är sammansatta av ARKit-enheter (faceunits01, CC0).** Orolig = inre ögonbryn upp, lätt sänkta mungipor. Smärta = bryn ned, kisande, näsrynkning, överläppen upp. Recepten finns i `step2_pose.py`.
- **Andningen är två morph targets: bröst och buk.** Fysiologin kan då skilja på lugn bukandning och ytlig, snabb bröstandning.
- **Fingrarna styrs ett i taget med skelettet.** Distalt status i etapp 5 behöver det.
- **SSS fejkas i en egen shader.** Shadern använder wrap-belysning, en röd ton i övergången ljus/skugga och svag genomlysning bakifrån, styrt av en mask (öron, näsa, läppar, fingrar). Riktig SSS fungerar inte i Quest-webbläsaren.
- **Blekhet och svett är shader-parametrar, inte texturbyten.** Blekheten börjar i läppar, ansikte och nagelbäddar. Svetten gör pannan, överläppen och handflatorna blankare och lägger på små droppar.
- **Porerna är en kakelbar detaljnormal (12 mm), inte en del av huvudtexturen.** De syns skarpa på alla avstånd utan 8K-texturer.
- **Hornhinnan ritas additivt (bara reflexer).** Den ger det fuktiga ögat utan transmission, som kräver en extra renderingspass.
- **Hud och normalkartor är UASTC, övrigt ETC1S (KTX2), och geometrin är meshopt-komprimerad.** Huden ses på nära håll där ETC1S ger synliga block. Kläder och hår tål den mindre ETC1S.
- **KTX-Software (Khronos) hämtades från deras GitHub-release och packades upp utan installation.** Det behövs för KTX2-texturerna.
- **T-tröjans MakeHuman-logga är bortmålad.** En patient på akuten bär inte en programvarulogga, och vi ska inte visa andras varumärken.
- **Undersökningslampan är sänkt från intensitet 9 till 5.** Med den riktiga huden blev underarmen urblekt i lampans ljus.
- **Patienten har ljusbruna ögon och mörkbrunt kort hår.** Det är ett neutralt val för en vanlig vuxen man. Allt går att ändra i `step1_human.py` och `step3c_materials.py`.

## Rättelser efter granskning av patienten (23 november 2026)

- **Handen är omgjord efter mått.** MakeHumans hand var för stor med kraftiga fingrar och för kort lillfinger. Nu är handen ca 20 cm från handledsvecket till långfingertoppen och fingrarna ca 1,9 cm breda. Lillfingret är förlängt till ca 75 % och pekfingret till ca 93 % av långfingrets längd.
- **Fingrarna ligger samlade i en avslappnad kaskad.** Böjningen ökar från pekfingret (ca 25°) till lillfingret (ca 58°), och tummen vilar längs pekfingret. Spridningen mot långfingret är 5°/0°/-5°/-11°.
- **Armbågen är böjd ca 14°.** Överarmen sluttar 12° och underarmen är vinklad 8° mot fotänden. Armbordet hamnar då på 1,10 m och såret på ca 1,16 m.
- **Underarmen och handryggen vilar på bordet.** Lutningen räknas fram så att undersidan blir plan. Huden plattas till där den ligger mot dynan och sjunker 2,5 mm in i den. En beräknad kontaktskugga ligger på bordet. En realtidsskugga från lampan kan inte ge den mörka linjen där huden möter dynan.
- **Blicken begränsas med vridning och nick var för sig (±70° vridning, 25° ned, 30° upp) i stället för en total vinkel.** Med den totala vinkeln tittade han snett uppåt när man stod vid sidan av honom.
- **Håret ritas i två pass.** Först en tät kärna med alpha-to-coverage, sedan en mjuk kant med alfablandning. Hårets färg är utfylld i de genomskinliga delarna av texturen, så att ljusa fransar inte uppstår.
- **Hårbotten är målad i hårets färg.** MakeHumans hud har blont hår på hårbotten, som syntes som en gul fläck vid hjässan.
- **Kudden är en mjuk superellipsoid med en grop.** Gropen är 4,5 cm djup under bakhuvudet, och kudden är smalare (46 cm) än britsen.
- **Gasuttagen följer färgkoden i SS-EN ISO 9170-1 och ISO 32.** Syrgas är vit, medicinsk luft svart/vit och vakuum gul, och varje uttag har text. Eluttagen är jordade uttag, som i Sverige.
- **Rostfria delar får UV i världsskala.** Utdragna lådor gav randig, utsträckt textur på vagnen.
- **FPS-mätaren visas i datorläget bara i hörnet**, och som skylt i synfältet bara i VR.
- **I datorläget flyttas fokus från startkortet till 3D-vyn.** Om en meny på startkortet hade kvar fokus gick tangenterna dit. Piltangenterna fungerar också, och även korta tryck räknas.
- **Hudtexturen från foto väntar på dina bilder.** Instruktionen finns i `FOTOINSTRUKTION.md`. Fingertopparnas papillarlinjer ersätts alltid innan något publiceras.

## Rättelser 23 november, andra omgången

- **Fingrarna ligger i linje och lätt samlade** (spridning 2,5°/0°/-2,5°/-5°). Mellan- och ytterleden riktas in efter grundleden, så att lillfingret inte viker ut åt sidan.
- **Kudden formas i Blender efter huvud, nacke och tröja och följer med patienten.** Den gamla kudden i rummet skar igenom skuldrorna.
- **T-tröjan dras in mot huden inom 28 cm från höger axelled**, även tröjans sida under armen.
- **Lampan står nästan rakt ovanför fältet.** Skuggan har intensitet 0,5 och liten bias, eftersom en undersökningslampa ger nästan skuggfritt ljus.
- **Borstat stål har svaga, utjämnade streck**, och grovheten kommer helt från kartan. De tidigare ränderna kom från grovhetskartan, inte från någon normalkarta.
- **Handbordet går att ställa i instruktörsläget, 0,95–1,25 m i steg om 2,5 cm (standard 1,10 m).** Överarmen roteras och underarmen behåller sin riktning, och kontaktskuggan räknas om.
