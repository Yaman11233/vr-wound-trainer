// Rummets mått och möblernas placering (meter). Origo = där användaren står
// vid start, tittande längs -Z. Användaren står vid patientens HÖGRA sida,
// som en högerhänt läkare normalt gör. Patientens huvud ligger till vänster
// (-X), fötterna till höger (+X). Den skadade högra armen vilar på ett
// armbord (handbord) som går ut från britsen mot användaren.
//
// Ändra här för att flytta saker. Andra moduler läser alltid härifrån.

export const ROOM = {
  minX: -1.6, maxX: 2.4,
  minZ: -2.3, maxZ: 1.7,
  height: 2.7,
};

export const BED = {
  center: [0.45, -1.25],     // x, z
  length: 1.95,              // längs X
  width: 0.68,               // längs Z
  topHeight: 0.78,           // höjd till madrassens ovansida
  headX: 0.45 - 1.95 / 2,    // huvudändans x
  // Höjt ryggstöd: patienten halvsitter. Samma mått används i Blender (tools/blender/bed.py).
  backrest: { length: 0.85, deg: 30 },
};

// Värdena nedan kommer från patientbygget i Blender (tools/blender, bed_fit.json och
// step2_report.json) och måste ändras tillsammans med patientens ställning.

// Kudde på ryggstödet under bakhuvudet (mitt, tjocklek, storlek längs ryggstödet × bredd).
export const PILLOW = { center: [-0.413, 1.241, -1.25], thickness: 0.061, size: [0.36, 0.52] };

// Armbordet (fristående handbord) under höger underarm och hand. Armen är abducerad ca 75°
// och sluttar från axeln, så bordet står högre än madrassen och är vridet längs armen.
export const ARM_BOARD = {
  center: [-0.133, -0.576],  // x, z
  length: 0.655,             // längs armen
  width: 0.2,
  topHeight: 1.049,
  yaw: 0.0556,               // vridning kring Y (rad); bordets längdaxel är lokal +Z
};

// Patientens högra arm (leder i världen) i den ställda modellen.
export const RIGHT_ARM = {
  shoulder: [-0.206, 1.205, -1.048],
  elbow: [-0.145, 1.095, -0.783],
  wrist: [-0.141, 1.070, -0.497],
  fingertips: [-0.119, 1.124, -0.309],
};

// Sårets mittpunkt: volarsidan, distala underarmen, ca 6 cm proximalt om handleden.
// GLB-patienten har ett eget ankare (WoundAnchor) som följer armen; detta värde används
// för undersökningslampans riktning.
export const WOUND = {
  position: [-0.142, 1.104, -0.557],
  lengthCm: 4.0, // standardvärde; scenariofilen anger sårets mått
};

export const CART = { position: [0.62, -0.42], size: [0.6, 0.45], height: 0.9 };          // instrumentvagn
export const WOUND_CART = { position: [1.35, -0.05], size: [0.55, 0.45], height: 0.95 };  // sårvagn med lådor
export const MONITOR = { position: [-0.95, -1.9], screenHeight: 1.45 };                  // vitalparametermonitor
export const SANITIZER = { position: [ROOM.minX, 1.15, 0.25] };                            // väggdispenser, handsprit
export const GLOVE_HOLDER = { position: [ROOM.minX, 1.3, -0.3] };                          // handskhållare (S/M/L)
export const SHARPS = { position: [0.84, CART.height, -0.56] };                            // kanylburk på vagnen
export const BINS = { general: [1.85, -0.75], infectious: [1.85, -0.35] };                 // avfall
export const EXAM_LAMP = { mount: [-0.6, 2.05, ROOM.minZ], head: [-0.5, 1.85, -0.95] };   // undersökningslampa
export const CLOCK = { position: [1.0, 2.0, ROOM.minZ] };
export const SINK = { position: [1.4, ROOM.maxZ] };
export const DOOR = { x: ROOM.maxX, zCenter: -1.25, width: 1.2, height: 2.1 };
