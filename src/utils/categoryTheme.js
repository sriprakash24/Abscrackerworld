// Per-category color identity — used to make each category visually
// distinct (header accents, badges, product-card edges, the quick-nav
// launcher) instead of every section reading as the same dark/orange
// surface. Colors are chosen to still feel premium against the dark
// theme (used as accents/glows, never as full backgrounds) while nodding
// at what the category actually is — gold for sparklers, electric
// yellow-green for bijili, deep red for bombs, a rainbow sweep for
// multi-colour sky shots, etc.
const CATEGORY_THEME = {
  SPARKLERS: { from: '#FFE082', to: '#FFA000', solid: '#FFC107' },
  'GROUND CHAKKARAS': { from: '#CBA6FF', to: '#7C4DFF', solid: '#9575FF' },
  'FLOWER POT': { from: '#FFCC80', to: '#F57C00', solid: '#FFA726' },
  'TWINKLING STAR': { from: '#81D4FA', to: '#0288D1', solid: '#4FC3F7' },
  'ONE SOUND CRACKERS': { from: '#FF8A80', to: '#C62828', solid: '#FF5252' },
  BOMB: { from: '#FF5C7A', to: '#8E0000', solid: '#E5304A' },
  'GIANT & DELUXE': { from: '#FF8FCB', to: '#C2185B', solid: '#FF4FA3' },
  'RED MAGIC CRACKERS': { from: '#FF8A65', to: '#B71C1C', solid: '#F4511E' },
  'MEGA FANCY OUT': { from: '#C29CFF', to: '#6A1B9A', solid: '#9C64F0' },
  'MULTI COLOUR SKY SHOT': { from: '#4DD0E1', to: '#FF4FA3', solid: '#7C4DFF' },
  'FANCY FOUNTAINS': { from: '#64E0EE', to: '#00838F', solid: '#26C6DA' },
  BIJILI: { from: '#F4FF81', to: '#AEEA00', solid: '#D4E600' },
  ROCKET: { from: '#82C4FF', to: '#1565C0', solid: '#42A5F5' },
  'GIFT BOX': { from: '#9CDD9F', to: '#2E7D32', solid: '#66BB6A' },
  'MATCH BOX': { from: '#E4C08C', to: '#8D6E42', solid: '#D7A96B' },
  GUN: { from: '#B0BEC5', to: '#37474F', solid: '#78909C' },
};

const FALLBACK_PALETTE = [
  { from: '#FFE082', to: '#FFA000', solid: '#FFC107' },
  { from: '#81D4FA', to: '#0288D1', solid: '#4FC3F7' },
  { from: '#FF8FCB', to: '#C2185B', solid: '#FF4FA3' },
  { from: '#9CDD9F', to: '#2E7D32', solid: '#66BB6A' },
];

/** Deterministic small hash so unmapped/new category names still get a
 * stable (not random-per-render) color instead of always falling back
 * to the same one. */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getCategoryTheme(categoryName = '') {
  const key = categoryName.trim().toUpperCase();
  if (CATEGORY_THEME[key]) return CATEGORY_THEME[key];
  const idx = hashString(key) % FALLBACK_PALETTE.length;
  return FALLBACK_PALETTE[idx];
}
