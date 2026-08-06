/** All CV template style identifiers (order = templateNumber 1..N). */


export const CV_TEMPLATE_STYLES = [
  "Prism",
  "Hartmann",
  "Rose",
  "Galaxy",
  "Eclipse", "Willow", "Marina", "Aether", "Hyperion", "Lunar", "Stellar",
  "Solar", "Nebula", "Cosmos", "Astra",
  "Meridian", "Classic", "Navy", "Vertex", "Verde",
  "Azure", "Europass", "Pamela", "Liverpool", "Lumiere",
  "Patterson", "Bremen", "Sevilla", "Munich",
  "Horizon"
] as const;

export type CvTemplateStyle = (typeof CV_TEMPLATE_STYLES)[number];
