// Turns a category name into a URL-safe slug, e.g. "GIANT & DELUXE" -> "giant-and-deluxe".
export function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
