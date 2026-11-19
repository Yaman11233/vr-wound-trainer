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
};

// Armbordet: från britsens kant (z = -0.91) ut mot användaren.
export const ARM_BOARD = {
  x: -0.17,
  zNear: -0.34,              // änden närmast användaren
  zFar: BED.center[1] + BED.width / 2, // britsens kant
  width: 0.2,
  topHeight: BED.topHeight,
};

// Patientens högra arm på armbordet (punkter i världen, y = armens mittlinje).
export const RIGHT_ARM = {
  shoulder: [-0.17, BED.topHeight + 0.09, -1.06],
  elbow: [-0.17, BED.topHeight + 0.045, -0.77],
  wrist: [-0.17, BED.topHeight + 0.035, -0.50],
  fingertips: [-0.17, BED.topHeight + 0.025, -0.31],
};

// Sårets mittpunkt: volarsidan, distala underarmen, ca 6 cm proximalt om handleden.
export const WOUND = {
  position: [-0.17, BED.topHeight + 0.065, -0.56],
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
