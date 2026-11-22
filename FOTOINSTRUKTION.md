# Fotografera underarm och hand för hudtexturen

Bilderna projiceras på modellens högra underarm och hand och ersätter den nuvarande texturen. Ju jämnare
ljus och ju fler överlappande vinklar, desto mindre syns skarvarna. Räkna med cirka 20 minuter.

## Innan du börjar

- **Integritet:** texturen hamnar i det öppna repot och blir offentlig (CC0).
  - Fingeravtryck: i skarpa bilder av fingertopparna syns de. Jag ersätter alltid fingertopparnas
    papillarlinjer med ett påhittat mönster innan något publiceras, och originalfotona lägger jag aldrig
    i repot.
  - Undvik tatueringar, ärr, ringar och klocka i bild om du inte vill att de syns i appen.
- **Huden:** ingen kräm eller handsprit de senaste 30 minuterna. Det ger blanka fläckar som blir fel i
  texturen. Låt håret på underarmen vara som det är.
- **Ärmen:** uppkavlad ovanför armbågen.

## Utrustning

- Mobilkamera, huvudkameran. Använd 2× zoom om telefonen har en riktig telekamera, annars 1×.
  Aldrig vidvinkel (0,5×), som förvränger.
- Stäng av: blixt, porträttläge, skönhetsfilter och HDR-effekter. Spara i högsta upplösning. RAW (DNG/ProRAW) om det går, annars JPEG.
- **Färgreferens: ja.** Bäst är ett ColorChecker-kort eller ett grått kort (18 %). Har du inget av dem
  fungerar ett vitt, omärkt A4-papper och en linjal med millimeterskala.
- **Bakgrund:** en matt, enfärgad yta. Mörkgrå eller mörkblå tygbit, eller ett grönt operationsskynke.
  Inte vitt (överexponerar kanterna) och inte mönstrat.
- **Underlag:** ett bord i ungefär armbågshöjd där armen kan ligga still, gärna på en hoprullad handduk
  under armbågen.

## Ljus

- Jämnt och mjukt ljus från flera håll. Inga hårda skuggor och inga glansiga reflexer.
  - Bäst: dagsljus från ett stort fönster en mulen dag, med armen 1–2 m från fönstret och en vit skiva
    eller ett lakan på motsatt sida som reflektor.
  - Alternativ: två likadana lampor med samma färgtemperatur, en på varje sida av armen och ca 1 m bort,
    riktade mot ett vitt tak eller en vägg (indirekt ljus).
- **Lås exponering och vitbalans** (håll fingret på skärmen tills AE/AF-lås visas). Ljuset får inte
  ändras mellan bilderna i samma serie.
- **Ingen taklampa rakt ovanifrån.**

## Ställningen

Armen ska ligga **som på modellen**: supinerad (handflatan uppåt) och avslappnad på underlaget, armbågen
lätt böjd och fingrarna lätt böjda. **Rör inte armen under en serie.** Fotografen flyttar kameran runt
armen. Vrids armen ändras veck och hud, och då passar bilderna inte ihop.

Om du fotograferar själv med vänster hand: lägg telefonen på självutlösare (3 s) eller använd en
hörlurs volymknapp. Det går också bra att ta hjälp av någon.

## Bilderna (32 stycken)

Håll kameran **vinkelrätt mot huden**, på det avstånd som står. Varje bild ska överlappa nästa med ungefär
en tredjedel. Ta gärna två av varje och välj den skarpaste.

### A. Färgreferens (2 bilder)
1. Hela underarmen och handen med färgkortet (eller det vita papperet) och linjalen bredvid armen, ovanifrån på 50 cm.
2. Samma sak närmare, med kortet bredvid handleden, på 30 cm.

### B. Underarmen runt om (16 bilder)
Dela underarmen i en **proximal halva** (armbågen till mitten) och en **distal halva** (mitten till
handleden). Ta åtta vinklar för varje halva, i 45°-steg runt armen på 30–35 cm avstånd:

| Vinkel | Kameran tittar mot |
|---|---|
| 0° | volarsidan, rakt ovanifrån |
| 45° | mellan volarsidan och tumsidan (radialt) |
| 90° | tumsidan |
| 135° | snett bakifrån på tumsidan (lyft kameran lågt) |
| 180° | dorsalsidan, underifrån (lägg telefonen mot bordet och rikta uppåt, så långt det går) |
| 225° | snett bakifrån på lillfingersidan |
| 270° | lillfingersidan (ulnart) |
| 315° | mellan volarsidan och lillfingersidan |

Klarar du inte 135–225° utan att flytta armen: hoppa över dem. Dorsalsidan ligger mot bordet i appen.

### C. Handen (10 bilder), 25–30 cm
3. Handflatan rakt ovanifrån
4. Handflatan snett från fingertopparna (30°)
5. Handflatan snett från handleden (30°)
6. Tumsidan av handen och tummen
7. Lillfingersidan av handen
8. Fingrarnas handflatssida på nära håll (20 cm), pekfinger och långfinger
9. Samma för ringfinger och lillfinger
10. Vänd handen (handryggen uppåt, ligg still) och ta handryggen rakt ovanifrån
11. Handryggen snett från fingrarna, så att naglar och nagelband syns
12. Naglarna på nära håll (20 cm)

### D. Detaljer (4 bilder), 15–20 cm, skarpt
13. Volara handledsvecken
14. Volarsidan där såret ska sitta (ca 6 cm ovanför handledsvecket) med linjalen i bild
15. Venerna på underarmens volarsida (låt armen hänga en stund först om de inte syns, och lägg den sedan tillbaka)
16. Håret på underarmen i strykljus från sidan (det enda undantaget från det jämna ljuset; en lampa lågt från sidan)

## Skicka

Lägg bilderna i en mapp, döp dem efter numren ovan (t.ex. `B-distal-045.jpg`, `C-03.jpg`) och säg till
var mappen ligger. Komprimera inte bilderna och skicka dem inte via en chattapp som minskar upplösningen.

## Vad jag gör med dem

1. Färgkorrigerar alla bilder mot färgkortet.
2. Placerar en kamera per bild i Blender så att modellens arm sammanfaller med armen på fotot.
3. Projicerar fotona på armens egen UV (2K) och blandar dem efter hur rakt varje bild ser ytan.
4. Tar bort ljus och skuggor som bakats in, och gör nya normal- och råhetskartor från bilderna.
5. Ersätter fingertopparnas papillarlinjer och visar resultatet för dig innan något publiceras.
