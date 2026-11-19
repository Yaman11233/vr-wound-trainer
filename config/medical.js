// Medicinska värden. Varje värde har källa och status.
//   status: 'GRANSKA'  = väntar på granskning av ansvarig läkare
//           'BEKRÄFTAD' = granskad (ange vem och datum i `reviewed`)
// Koden läser värden härifrån och hårdkodar dem aldrig. Alla GRANSKA-värden
// listas i MEDICAL_REVIEW.md.
//
// Etapp 1 innehåller bara de värden som redan diskuterats. Fler läggs till
// i etapp 3 (fysiologi), 4 (fas A) och 5 (fas B).

export const MEDICAL = {
  localAnesthetics: {
    lidocaine: {
      // GRANSKA: maxdos lidokain utan adrenalin
      plainMaxMgPerKg: { value: 3, unit: 'mg/kg', status: 'GRANSKA', source: 'FASS, Xylocain (lidokain) produktresumé, avsnitt 4.2' },
      plainMaxMgAbsolute: { value: 200, unit: 'mg', status: 'GRANSKA', source: 'FASS, Xylocain produktresumé, avsnitt 4.2' },
      // GRANSKA: maxdos lidokain med adrenalin
      adrenalineMaxMgPerKg: { value: 7, unit: 'mg/kg', status: 'GRANSKA', source: 'FASS, Xylocain med adrenalin produktresumé, avsnitt 4.2' },
      adrenalineMaxMgAbsolute: { value: 500, unit: 'mg', status: 'GRANSKA', source: 'FASS, Xylocain med adrenalin produktresumé, avsnitt 4.2' },
      concentrationsMgPerMl: { value: [10, 20], unit: 'mg/ml', status: 'GRANSKA', source: 'FASS: Xylocain 1 % = 10 mg/ml, 2 % = 20 mg/ml' },
    },
  },

  hemorrhage: {
    // GRANSKA: blodvolym hos vuxen
    bloodVolumeMlPerKg: { value: 70, unit: 'ml/kg', status: 'GRANSKA', source: 'ATLS 10th ed. (2018), kap. 3 Shock' },
    // GRANSKA: blödningsklasser I–IV (andel av blodvolymen). Kontrollera mot ATLS 11th ed.
    classes: {
      status: 'GRANSKA',
      source: 'ATLS 10th ed. (2018), tabell 3-1. Kontrollera om 11th ed. (2025) ändrat tabellen.',
      I: { lossFraction: [0, 0.15] },
      II: { lossFraction: [0.15, 0.30] },
      III: { lossFraction: [0.30, 0.40] },
      IV: { lossFraction: [0.40, 1.0] },
    },
  },

  hygiene: {
    handRubSeconds: { value: 30, unit: 's', status: 'GRANSKA', source: 'Vårdhandboken, Handhygien; Socialstyrelsen SOSFS 2015:10 Basal hygien i vård och omsorg' },
  },
};
