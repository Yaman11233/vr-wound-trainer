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

## Att diskutera

- **ATLS 11th ed. (2025):** jag har inte kunnat kontrollera om tabellen över blödningsklasser har ändrats. Om den har det bör fysiologin i etapp 3 följa den nya versionen.
- **Blödningshastighet (#7):** värdet styr hur snabbt patienten försämras om man inte trycker. Det är ett pedagogiskt val lika mycket som ett medicinskt. Vilken försämringstakt vill du ha för 1A?
