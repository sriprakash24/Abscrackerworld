// Per-category color identity — used to make each category visually
// distinct (header accents, badges, product-card edges, the quick-nav
// launcher) instead of every section reading as the same dark/orange
// surface. Colors are used as accents (edges, badges, tints) on the light
// Peach theme — `ink` is a darkened variant for readable text while nodding
// at what the category actually is — gold for sparklers, electric
// yellow-green for bijili, deep red for bombs, a rainbow sweep for
// multi-colour sky shots, etc.
const CATEGORY_THEME = {
  'COMBO ABS': { from: '#FF8A65', to: '#F04452', solid: '#FF6F61' },
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

/** Darkens a #rrggbb colour by `amt` (0-1) — used to derive readable text
 * ("ink") colours from each category's bright accent on the light theme. */
function darken(hex, amt = 0.35) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.round(v * (1 - amt)));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function withInk(theme) {
  return { ...theme, ink: darken(theme.to, 0.3) };
}

const THEME_CACHE = new Map();

export function getCategoryTheme(categoryName = '') {
  const key = categoryName.trim().toUpperCase();
  if (THEME_CACHE.has(key)) return THEME_CACHE.get(key);
  const base = CATEGORY_THEME[key] || FALLBACK_PALETTE[hashString(key) % FALLBACK_PALETTE.length];
  const theme = withInk(base);
  THEME_CACHE.set(key, theme);
  return theme;
}
