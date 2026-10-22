// Product catalog data — ABS Crackers World
// Flat product list grouped into categories for Home + Category Listing screens.

// Combo packs live in their own pinned category — always the first section
// on the storefront (above SPARKLERS). Products with `isCombo: true` (created
// from Admin → Combos) are grouped under this name.
export const COMBO_CATEGORY_NAME = 'COMBO ABS';

export const CATEGORY_ICONS = {
  [COMBO_CATEGORY_NAME]: '🎁',
  SPARKLERS: '✨',
  'GROUND CHAKKARAS': '🌀',
  'FLOWER POT': '🏺',
  'TWINKLING STAR': '⭐',
  'ONE SOUND CRACKERS': '💥',
  BOMB: '💣',
  'GIANT & DELUXE': '🎊',
  'RED MAGIC CRACKERS': '🧨',
  'MEGA FANCY OUT': '🎆',
  'MULTI COLOUR SKY SHOT': '🎇',
  'FANCY FOUNTAINS': '⛲',
  BIJILI: '⚡',
  ROCKET: '🚀',
  'GIFT BOX': '🎁',
  'MATCH BOX': '📦',
  GUN: '🔫',
};

export const CATEGORY_TAGLINES = {
  [COMBO_CATEGORY_NAME]: 'Ready-made festival packs at the best price',
  SPARKLERS: 'Hand held magic for every celebration',
  'GROUND CHAKKARAS': 'Spinning discs of colour & sound',
  'FLOWER POT': 'Golden fountains that light up the night',
  'TWINKLING STAR': 'Soft glittering showers of light',
  'ONE SOUND CRACKERS': 'Classic single-burst crackers',
  BOMB: 'Loud, powerful, festival-ready bombs',
  'GIANT & DELUXE': 'Big garlands, bigger celebrations',
  'RED MAGIC CRACKERS': 'The iconic string cracker, reimagined',
  'MEGA FANCY OUT': 'Sky-high aerial shows',
  'MULTI COLOUR SKY SHOT': 'Multi-shot colour bursts for the sky',
  'FANCY FOUNTAINS': 'Premium fountains & showpieces',
  BIJILI: 'Rapid-fire crackling strings',
  ROCKET: 'Whistles & bursts that soar',
  'GIFT BOX': 'Curated combo packs, ready to gift',
  'MATCH BOX': 'Assorted crackers in one box',
  GUN: 'Fun cap guns & novelty poppers',
};

export const TRUST_ITEMS = [
  { label: 'Own Warehouse' },
  { label: 'Fast Shipping' },
  { label: '100% Safe' },
  { label: 'Quality Checked' },
  { label: '10,000+ Customers' },
];

export const FOOTER_ITEMS = [
  { label: 'Certified Quality', sub: 'PESO approved crackers' },
  { label: 'Doorstep Delivery', sub: 'Pan-India shipping' },
  { label: 'Easy Returns', sub: 'On damaged items' },
  { label: '24/7 Support', sub: 'We are here to help' },
];


// --- Derived helpers ---
export function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// The live product catalog (CATEGORIES, getCategoryBySlug, groupByCategory)
// is no longer hardcoded here — it now comes from Firestore + Firebase
// Storage via src/services/products.js, shared across the app through
// src/contexts/ProductsContext.jsx. To (re)populate Firestore with the
// original starter catalog, run `npm run seed:products`
// (see scripts/seedProducts.mjs).
