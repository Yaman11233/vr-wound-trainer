// Scenario 1A: ytlig skärskada på volarsidan av distala underarmen,
// venös blödning. Hela flödet inklusive suturering.
//
// Etapp 1 använder bara `patient` och `wound` för att placera platshållaren.
// Stegen, villkoren och bedömningskriterierna fylls i under etapp 4–6.
// Medicinska värden hämtas från config/medical.js, inte härifrån.

export default {
  id: 'forearm-1a',
  titleKey: 'scenario.1a.title',
  available: true,

  patient: {
    sex: 'male',
    ageYears: 35,
    weightKg: 75,
    heightCm: 180,
    // Sökväg till patientmodellen (GLB). null = platshållare tills MPFB2-modellen finns.
    model: null,
    // Anamnes (ställbar). Används av frågemenyn i etapp 4.
    history: {
      mechanism: 'Skar sig på ett krossat glas när han diskade, för ca 20 minuter sedan.',
      handedness: 'right',
      allergies: [],
      medications: [],          // ingen antikoagulantia
      anticoagulants: false,
      conditions: [],
      tetanus: { lastDoseYearsAgo: 12, completedBasicSeries: true }, // GRANSKA i etapp 5 mot rekommendationerna
      fasting: false,
    },
    // Utgångsvärden innan blödningen påverkar. Fysiologin i etapp 3 räknar vidare.
    baseline: { hr: 92, sys: 132, dia: 84, spo2: 98, rr: 16 },
    affect: 'anxious',          // vaken, orolig, svarar adekvat
  },

  wound: {
    side: 'right',
    region: 'forearm-volar-distal',
    lengthCm: 4.0,
    depth: 'subcutaneous',      // genom dermis, in i subkutant fett; fascian intakt
    orientation: 'oblique-transverse',
    bleeding: { type: 'venous', initialRateMlPerMin: 30 }, // GRANSKA: rimlig nivå för en ytlig venös blödning?
    damagedStructures: [],      // 1A: inga skadade djupa strukturer
    contamination: 'clean',
  },

  // Fylls i etapp 4–6: faser, steg, tillåtna ordningar, bedömning.
  phases: [],
};
