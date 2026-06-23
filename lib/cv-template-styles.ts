/** All CV template style identifiers (order = templateNumber 1..N). */
// export const CV_TEMPLATE_STYLES = [
//   "Galaxy",
//   "Eclipse",
//   "Aether",
//   "Hyperion",
//   "Lunar",
//   "Stellar",
//   "Solar",
//   "Nebula",
//   "Cosmos",
//   "Astra",
//   "Horizon",
//   "Europass",
//   "Prism",
//   "Meridian",
//   "Classic",
//   "Navy",
//   "Vertex",
//   "Verde",
//   "Rose",
//   "Azure",
// ] as const;

export const CV_TEMPLATE_STYLES = [
  "Horizon", "Galaxy", "Eclipse", "Aether", "Hyperion",
  "Lunar", "Stellar", "Solar", "Nebula", "Cosmos",
  "Astra", "Prism", "Meridian", "Classic", "Navy",
  "Vertex", "Verde", "Rose", "Azure", "Europass",
  "Pamela", "Liverpool", "Lumiere", "Hartmann", "Patterson"
] as const;

export type CvTemplateStyle = (typeof CV_TEMPLATE_STYLES)[number];
