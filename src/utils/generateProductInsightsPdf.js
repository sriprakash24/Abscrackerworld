// Builds and downloads the branded "Product Order Insights" report PDF —
// triggered from the Download button on the admin Product Insights page.
// Reuses the same festive header/footer look as the invoice PDF
// (see generateInvoicePdf.js) so every document leaving the admin panel
// feels like part of one family, but keeps its own drawing code since the
// body of this document (a data table, not a bill) is shaped completely
// differently.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SHOP_INFO } from '../constants/invoiceConstants';
import { SHIVA_PARVATI_IMG, MURUGAN_IMG, GANESHA_IMG, ABS_LOGO_IMG } from '../assets/invoiceAssets';

const ORANGE = [255, 122, 0];
const GOLD = [200, 150, 40];
const DEEP_RED = [178, 34, 34];
const DARK_RED = [120, 18, 18];
const INK = [30, 26, 22];
const MUTED = [120, 112, 102];
const CREAM = [255, 251, 245];

const SHIVA_PARVATI_RATIO = 561 / 500;
const MURUGAN_RATIO = 529 / 500;
const GANESHA_RATIO = 557 / 500;
const LOGO_RATIO = 436 / 520;

function drawPageBorder(doc, pageWidth, pageHeight) {
  const outer = 5;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.7);
  doc.rect(outer, outer, pageWidth - outer * 2, pageHeight - outer * 2);

  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.3);
  doc.rect(outer + 1.6, outer + 1.6, pageWidth - (outer + 1.6) * 2, pageHeight - (outer + 1.6) * 2);
}

function drawImageFrame(doc, x, y, w, h) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, h);
}

/** Draws the shared festive header (deity art + ABS logo) and returns the y position just below it. */
function drawBrandedHeader(doc, pageWidth) {
  const margin = 14;
  const sideImgW = 26;
  const sideImgH = sideImgW * SHIVA_PARVATI_RATIO;
  const murImgW = 26;
  const murImgH = murImgW * MURUGAN_RATIO;
  const sideTopY = 8;

  doc.addImage(SHIVA_PARVATI_IMG, 'JPEG', margin - 4, sideTopY, sideImgW, sideImgH, undefined, 'FAST');
  drawImageFrame(doc, margin - 4, sideTopY, sideImgW, sideImgH);

  doc.addImage(MURUGAN_IMG, 'JPEG', pageWidth - margin - murImgW + 4, sideTopY, murImgW, murImgH, undefined, 'FAST');
  drawImageFrame(doc, pageWidth - margin - murImgW + 4, sideTopY, murImgW, murImgH);

  const logoW = 50;
  const logoH = logoW * LOGO_RATIO;
  const logoY = 6;
  doc.addImage(ABS_LOGO_IMG, 'PNG', pageWidth / 2 - logoW / 2, logoY, logoW, logoH, undefined, 'FAST');

  const ganeshaW = 17;
  const ganeshaH = ganeshaW * GANESHA_RATIO;
  const ganeshaY = logoY + logoH + 2;
  doc.addImage(GANESHA_IMG, 'JPEG', pageWidth / 2 - ganeshaW / 2, ganeshaY, ganeshaW, ganeshaH, undefined, 'FAST');
  drawImageFrame(doc, pageWidth / 2 - ganeshaW / 2, ganeshaY, ganeshaW, ganeshaH);

  const headerBottom = Math.max(ganeshaY + ganeshaH, sideTopY + sideImgH, sideTopY + murImgH) + 3;

  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.6);
  doc.line(margin, headerBottom, pageWidth - margin, headerBottom);

  return headerBottom;
}

function drawFooter(doc, pageWidth, pageHeight) {
  const margin = 14;
  const footerBarH = 16;
  const footerBarY = pageHeight - footerBarH - 6;

  doc.setFillColor(...DARK_RED);
  doc.rect(margin - 4, footerBarY, pageWidth - (margin - 4) * 2, footerBarH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(SHOP_INFO.name, margin, footerBarY + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${SHOP_INFO.addressLine1}, ${SHOP_INFO.addressLine2}`, margin, footerBarY + 11);

  doc.setFontSize(8);
  doc.text(`Phone: ${SHOP_INFO.phone}`, pageWidth - margin, footerBarY + 8.5, { align: 'right' });
}

/** Formats today's date for the report header. */
function formatToday() {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Builds the jsPDF doc for a product-insights report.
 * `rows` — the (already filtered/scoped) list of product rows to include,
 * each shaped like the rows built in AdminProductInsights.jsx.
 * `options` — { includeAwaiting, includeConfirmed, includeCancelled, metric }
 * where metric is one of 'both' | 'qty' | 'orders'.
 * `meta` — { scopeLabel, filterLabel } free-text describing what was
 * downloaded, shown under the report title.
 */
function buildProductInsightsDoc(rows, options, meta = {}) {
  const { includeAwaiting = true, includeConfirmed = true, includeCancelled = true, metric = 'both' } = options;
  const showQty = metric === 'both' || metric === 'qty';
  const showOrders = metric === 'both' || metric === 'orders';

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  drawPageBorder(doc, pageWidth, pageHeight);
  const headerBottom = drawBrandedHeader(doc, pageWidth);

  // --- Title banner ---
  const bannerY = headerBottom + 4;
  const bannerW = 92;
  const bannerH = 8;
  doc.setFillColor(...DEEP_RED);
  doc.roundedRect(pageWidth / 2 - bannerW / 2, bannerY, bannerW, bannerH, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('PRODUCT ORDER INSIGHTS', pageWidth / 2, bannerY + bannerH / 2 + 1.3, { align: 'center' });

  let infoY = bannerY + bannerH + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(`Generated: ${formatToday()}`, margin, infoY);
  doc.text(`Products: ${rows.length}`, pageWidth - margin, infoY, { align: 'right' });
  infoY += 5;

  if (meta.scopeLabel) {
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(meta.scopeLabel, margin, infoY);
    infoY += 4;
  }
  if (meta.filterLabel) {
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(meta.filterLabel, margin, infoY);
    infoY += 4;
  }

  // --- Columns, built dynamically from the chosen options ---
  const head = ['S.No', 'Product', 'Category'];
  const columnStyles = {
    0: { cellWidth: 10, halign: 'center' },
    2: { cellWidth: 26 },
  };

  if (includeAwaiting) {
    if (showQty) head.push('Awaiting\nQty');
    if (showOrders) head.push('Awaiting\nOrders');
  }
  if (includeConfirmed) {
    if (showQty) head.push('Confirmed\nQty');
    if (showOrders) head.push('Confirmed\nOrders');
  }
  if (includeCancelled) {
    head.push('Cancelled\nQty');
  }
  if (showQty) head.push('Total\nQty');
  if (showOrders && (includeAwaiting || includeConfirmed)) head.push('Total\nOrders');

  const body = rows.map((r, i) => {
    const line = [String(i + 1), r.name, r.category || 'Uncategorized'];
    if (includeAwaiting) {
      if (showQty) line.push(String(r.awaitingQty));
      if (showOrders) line.push(String(r.awaitingOrders));
    }
    if (includeConfirmed) {
      if (showQty) line.push(String(r.confirmedQty));
      if (showOrders) line.push(String(r.confirmedOrders));
    }
    if (includeCancelled) {
      line.push(String(r.cancelledQty));
    }
    if (showQty) line.push(String(r.totalQty));
    if (showOrders && (includeAwaiting || includeConfirmed)) line.push(String(r.totalOrders));
    return line;
  });

  autoTable(doc, {
    startY: infoY + 2,
    margin: { left: margin, right: margin, bottom: 26 },
    head: [head],
    body,
    styles: { font: 'helvetica', fontSize: 8, textColor: INK, cellPadding: 1.8, valign: 'middle' },
    headStyles: { fillColor: ORANGE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, halign: 'center' },
    columnStyles,
    alternateRowStyles: { fillColor: [250, 246, 240] },
    didDrawPage: () => {
      drawPageBorder(doc, pageWidth, pageHeight);
      drawFooter(doc, pageWidth, pageHeight);
    },
  });

  // Totals summary, right after the table (only if it fits comfortably —
  // otherwise it's fine on its own visual block, autoTable already leaves
  // room via the bottom margin above).
  const afterTableY = doc.lastAutoTable.finalY + 8;
  const totals = rows.reduce(
    (acc, r) => ({
      awaitingQty: acc.awaitingQty + r.awaitingQty,
      confirmedQty: acc.confirmedQty + r.confirmedQty,
      cancelledQty: acc.cancelledQty + r.cancelledQty,
      totalQty: acc.totalQty + r.totalQty,
    }),
    { awaitingQty: 0, confirmedQty: 0, cancelledQty: 0, totalQty: 0 }
  );

  const footerBarY = pageHeight - 16 - 6;
  if (afterTableY + 8 < footerBarY) {
    doc.setFillColor(...CREAM);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    const boxW = pageWidth - margin * 2;
    doc.roundedRect(margin, afterTableY, boxW, 9, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    const parts = [];
    if (includeAwaiting) parts.push(`Awaiting: ${totals.awaitingQty}`);
    if (includeConfirmed) parts.push(`Confirmed: ${totals.confirmedQty}`);
    if (includeCancelled) parts.push(`Cancelled: ${totals.cancelledQty}`);
    parts.push(`Total Units: ${totals.totalQty}`);
    doc.text(parts.join('   ·   '), pageWidth / 2, afterTableY + 5.8, { align: 'center' });
  }

  return doc;
}

/** Renders and downloads the product-insights report as a PDF. */
export function generateProductInsightsPdf(rows, options, meta) {
  const doc = buildProductInsightsDoc(rows, options, meta);
  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`ABS-Product-Insights-${stamp}.pdf`);
}
