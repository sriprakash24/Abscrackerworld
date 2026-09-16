// jsPDF's built-in fonts (Helvetica, etc.) only cover the WinAnsi/Latin-1
// character set. Any text outside that — Tamil most notably, since
// customers can type their name/address in Tamil at checkout — gets
// silently mangled when drawn with doc.text(), even though the exact same
// string displays perfectly in the on-screen "View Bill"/"View Invoice"
// preview modal (that's just normal browser text, rendered with whatever
// font the browser already uses for Tamil).
//
// Rather than bundling a large embedded Unicode font, this reuses that same
// browser font stack: any string containing non-Latin-1 characters is
// rasterised once on an offscreen <canvas> — so it's drawn with a font that
// actually has Tamil glyphs — and dropped into the PDF as a small inline
// image at the position the text would have gone. Plain ASCII/Latin-1 text
// (labels, amounts, English names — the vast majority of these documents)
// is completely untouched and still drawn as real vector text exactly as
// before, so there's no visual or file-size regression for the common case.

const NON_LATIN1_PATTERN = /[^\u0000-\u00FF]/;
const RASTER_SCALE = 4; // supersample for crisp output at print resolution
const MM_PER_PT = 25.4 / 72;
// Any decent system/browser Tamil font works here — this is only ever
// drawn into an offscreen canvas, never shown on a real page, so it just
// needs to be present in the browser's own font fallback list (which is
// exactly what's already rendering Tamil correctly in the preview modal).
const UNICODE_FONT_STACK =
  '"Noto Sans Tamil", "Noto Sans", "Segoe UI", "Latha", Arial, sans-serif';

// Kick off loading the "Noto Sans Tamil" web font (see index.html) the
// moment this module is imported, so it's very likely already cached by
// the time anyone actually clicks Download/View. Best-effort only — the
// canvas font stack above also falls back to whatever Tamil-capable font
// the OS/browser already ships, so nothing breaks if this hasn't finished
// (or the Font Loading API isn't supported) by the time a PDF is built.
if (typeof document !== "undefined" && document.fonts?.load) {
  document.fonts.load('16px "Noto Sans Tamil"').catch(() => {});
  document.fonts.load('bold 16px "Noto Sans Tamil"').catch(() => {});
}

/** True if `value` contains any character outside Latin-1 (e.g. Tamil). */
export function hasNonLatinText(value) {
  return NON_LATIN1_PATTERN.test(String(value ?? ''));
}

function buildCanvasFont(fontSizePt, { bold, italic } = {}) {
  const px = fontSizePt * RASTER_SCALE;
  return `${italic ? "italic " : ""}${bold ? "bold " : ""}${px}px ${UNICODE_FONT_STACK}`;
}

/** Rasterises a single line of text and returns its PNG data URL + real-world (mm) size. */
function rasterizeLine(text, fontSizePt, { bold, italic, color }) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const font = buildCanvasFont(fontSizePt, { bold, italic });
  ctx.font = font;
  const width = Math.max(1, Math.ceil(ctx.measureText(text).width));
  // Generous padding — exact cross-browser ascent/descent metrics aren't
  // reliably available, so pad enough to avoid clipping tall Tamil vowel
  // signs and descenders rather than trying to trim tightly.
  const px = fontSizePt * RASTER_SCALE;
  const height = Math.ceil(px * 1.6);
  const baselinePx = Math.round(px * 1.15);
  canvas.width = width;
  canvas.height = height;
  // Re-set font after resizing — changing canvas dimensions resets context state.
  ctx.font = font;
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, 0, baselinePx);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    widthMm: (width / RASTER_SCALE) * MM_PER_PT,
    heightMm: (height / RASTER_SCALE) * MM_PER_PT,
    baselineMm: (baselinePx / RASTER_SCALE) * MM_PER_PT,
  };
}

/**
 * Drop-in replacement for `doc.text(text, x, y, opts)`. Draws plain
 * ASCII/Latin-1 strings exactly as jsPDF normally would (real vector text —
 * zero behaviour change); anything containing Tamil (or any other
 * non-Latin-1 script) is rendered via the canvas fallback above instead of
 * coming out as corrupted boxes.
 *
 * `color` (an [r,g,b] array) must be passed explicitly for the Unicode
 * path, since jsPDF doesn't expose a reliable cross-version way to read
 * back the currently-set text colour — pass the same constant already
 * used in the preceding `doc.setTextColor(...)` call.
 */
export function drawText(doc, text, x, y, { align = "left", color = [0, 0, 0] } = {}) {
  const str = String(text ?? "");
  if (!hasNonLatinText(str)) {
    doc.text(str, x, y, { align });
    return;
  }
  const fontSizePt = doc.getFontSize();
  const { fontStyle } = doc.getFont();
  const { dataUrl, widthMm, heightMm, baselineMm } = rasterizeLine(str, fontSizePt, {
    bold: fontStyle?.includes("bold"),
    italic: fontStyle?.includes("italic"),
    color,
  });
  let drawX = x;
  if (align === "center") drawX = x - widthMm / 2;
  else if (align === "right") drawX = x - widthMm;
  doc.addImage(dataUrl, "PNG", drawX, y - baselineMm, widthMm, heightMm);
}

/**
 * Drop-in replacement for the common `doc.splitTextToSize(...)` + `doc.text(lines, x, y)`
 * combo used for wrapped address/notes blocks. Behaves identically to that
 * pair for plain ASCII/Latin-1 text; for Tamil (or other non-Latin-1) text
 * it word-wraps against `maxWidthMm` using the same canvas measurement as
 * `drawText` above, then draws each line as its own rasterised image.
 * `maxLines` caps how many wrapped lines are drawn (matching the existing
 * `.slice(0, N)` truncation used at each call site).
 */
export function drawWrappedText(
  doc,
  text,
  x,
  y,
  maxWidthMm,
  { align = "left", color = [0, 0, 0], maxLines = Infinity, lineHeightMm } = {},
) {
  const str = String(text ?? "");
  const fontSizePt = doc.getFontSize();
  const gap = lineHeightMm ?? fontSizePt * MM_PER_PT * 1.15;

  if (!hasNonLatinText(str)) {
    const lines = doc.splitTextToSize(str, maxWidthMm).slice(0, maxLines);
    doc.text(lines, x, y, { align });
    return;
  }

  const { fontStyle } = doc.getFont();
  const bold = fontStyle?.includes("bold");
  const italic = fontStyle?.includes("italic");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = buildCanvasFont(fontSizePt, { bold, italic });
  const maxWidthPx = (maxWidthMm / MM_PER_PT) * RASTER_SCALE;

  const words = str.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidthPx && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  lines.slice(0, maxLines).forEach((line, i) => {
    drawText(doc, line, x, y + gap * i, { align, color });
  });
}
