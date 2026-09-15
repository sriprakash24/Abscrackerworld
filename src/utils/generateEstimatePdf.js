// Builds and downloads the branded estimate-bill PDF. Mirrors
// generateInvoicePdf.js's layout (same header art, fonts, and table style)
// so an estimate and an invoice look like the same family of document —
// the only real differences are the "ESTIMATE" banner/heading, no payment
// section, and a footer note clarifying it isn't a final bill yet.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SHOP_INFO, ESTIMATE_TERMS_LINE } from '../constants/estimateConstants';
import { SHIVA_PARVATI_IMG, MURUGAN_IMG, GANESHA_IMG, ABS_LOGO_IMG } from '../assets/invoiceAssets';

const ORANGE = [255, 122, 0];
const GOLD = [200, 150, 40];
const DEEP_RED = [178, 34, 34];
const DARK_RED = [120, 18, 18];
const INK = [30, 26, 22];
const MUTED = [120, 112, 102];
const CREAM = [255, 251, 245];
const TOTALS_FILL = [250, 240, 224];

const SHIVA_PARVATI_RATIO = 561 / 500;
const MURUGAN_RATIO = 529 / 500;
const GANESHA_RATIO = 557 / 500;
const LOGO_RATIO = 436 / 520;

function formatDate(date) {
  const d = date?.toDate ? date.toDate() : date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

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

function buildEstimateDoc(estimate) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  drawPageBorder(doc, pageWidth, pageHeight);

  // --- Header: same deity + logo arrangement as the invoice PDF ---
  const sideImgW = 32;
  const sideImgH = sideImgW * SHIVA_PARVATI_RATIO;
  const murImgW = 32;
  const murImgH = murImgW * MURUGAN_RATIO;
  const sideTopY = 9;

  doc.addImage(SHIVA_PARVATI_IMG, 'JPEG', margin - 4, sideTopY, sideImgW, sideImgH, undefined, 'FAST');
  drawImageFrame(doc, margin - 4, sideTopY, sideImgW, sideImgH);

  doc.addImage(MURUGAN_IMG, 'JPEG', pageWidth - margin - murImgW + 4, sideTopY, murImgW, murImgH, undefined, 'FAST');
  drawImageFrame(doc, pageWidth - margin - murImgW + 4, sideTopY, murImgW, murImgH);

  const logoW = 58;
  const logoH = logoW * LOGO_RATIO;
  const logoY = 7;
  doc.addImage(ABS_LOGO_IMG, 'PNG', pageWidth / 2 - logoW / 2, logoY, logoW, logoH, undefined, 'FAST');

  const ganeshaW = 20;
  const ganeshaH = ganeshaW * GANESHA_RATIO;
  const ganeshaY = logoY + logoH + 2;
  doc.addImage(GANESHA_IMG, 'JPEG', pageWidth / 2 - ganeshaW / 2, ganeshaY, ganeshaW, ganeshaH, undefined, 'FAST');
  drawImageFrame(doc, pageWidth / 2 - ganeshaW / 2, ganeshaY, ganeshaW, ganeshaH);

  const headerBottom = Math.max(ganeshaY + ganeshaH, sideTopY + sideImgH, sideTopY + murImgH) + 4;

  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.6);
  doc.line(margin, headerBottom, pageWidth - margin, headerBottom);

  // --- ESTIMATE banner (gold instead of deep red, so it reads distinctly
  // from an invoice at a glance even before anyone reads the word) ---
  const bannerY = headerBottom + 4;
  const bannerW = 56;
  const bannerH = 8.5;
  doc.setFillColor(...GOLD);
  doc.roundedRect(pageWidth / 2 - bannerW / 2, bannerY, bannerW, bannerH, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('ESTIMATE', pageWidth / 2, bannerY + bannerH / 2 + 1.5, { align: 'center' });

  // --- Estimate No / Date ---
  const infoY = bannerY + bannerH + 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(`Estimate No.: ${estimate.estimateNo || '-'}`, margin, infoY);
  doc.text(`Date: ${formatDate(estimate.date)}`, pageWidth - margin, infoY, { align: 'right' });
  const afterInfoY = infoY + 5;

  // --- Customer block ---
  const custTop = afterInfoY + 2;
  doc.setFillColor(...CREAM);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, custTop, pageWidth - margin * 2, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(`Customer Name: ${estimate.customer?.name || '-'}`, margin + 4, custTop + 7);
  doc.text(`Mobile No.: ${estimate.customer?.mobile || '-'}`, pageWidth - margin - 4, custTop + 7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  const addressLines = doc.splitTextToSize(`Address: ${estimate.customer?.address || '-'}`, pageWidth - margin * 2 - 8);
  doc.text(addressLines.slice(0, 2), margin + 4, custTop + 14);

  // --- Items table ---
  const rows = (estimate.items || []).map((item, i) => [
    String(i + 1),
    item.description,
    String(item.qty),
    `Rs. ${Number(item.rate).toLocaleString('en-IN')}`,
    `Rs. ${Number(item.amount).toLocaleString('en-IN')}`,
  ]);

  autoTable(doc, {
    startY: custTop + 24,
    margin: { left: margin, right: margin },
    head: [['S.No', 'Description of Crackers', 'Qty', 'Rate', 'Amount (Rs.)']],
    body: rows,
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 2.2 },
    headStyles: { fillColor: GOLD, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [250, 246, 240] },
  });

  const afterTableY = doc.lastAutoTable.finalY + 8;

  // Notes + totals box sit at a fixed distance from the footer, same
  // page-break-if-needed logic as the invoice PDF.
  const notesBoxW = 92;
  let estimatedLeftH = 8;
  if (estimate.notes) {
    const notePreview = doc.splitTextToSize(`Notes: ${estimate.notes}`, notesBoxW);
    estimatedLeftH += notePreview.length * 4 + 2;
  }
  const estimatedTotalsH = 6 * 2 + 11;

  const footerBarH = 22;
  const footerBarY = pageHeight - footerBarH - 7;
  const thankYouY = footerBarY - 12;
  const minGapAboveThankYou = 8;
  const sectionH = Math.max(estimatedLeftH, estimatedTotalsH);

  let sectionTop = afterTableY;
  if (sectionTop + sectionH + minGapAboveThankYou > thankYouY) {
    doc.addPage();
    drawPageBorder(doc, pageWidth, pageHeight);
    sectionTop = margin + 10;
  }

  // --- Notes (left column) ---
  let notesY = sectionTop + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text('Notes', margin, notesY);
  notesY += 5;
  if (estimate.notes) {
    const noteLines = doc.splitTextToSize(estimate.notes, notesBoxW);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(noteLines, margin, notesY);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('—', margin, notesY);
  }

  // --- Totals box (right column) ---
  const totalsBoxW = 70;
  const totalsX = pageWidth - margin - totalsBoxW;
  const totalsInnerX = totalsX + 4;
  const totalsRows = [
    ['Total Amount', estimate.subtotal],
    [`Packing Charge (${estimate.packagePercent || 0}%)`, estimate.packageAmount],
  ];
  const rowH = 6;
  const totalsBoxH = rowH * totalsRows.length + 11;
  doc.setFillColor(...TOTALS_FILL);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.roundedRect(totalsX, sectionTop, totalsBoxW, totalsBoxH, 2, 2, 'FD');

  doc.setFontSize(9);
  let totalsY = sectionTop + 6;
  totalsRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(label, totalsInnerX, totalsY);
    if (value !== null) {
      doc.setTextColor(...INK);
      doc.text(`Rs. ${Number(value).toLocaleString('en-IN')}`, totalsX + totalsBoxW - 4, totalsY, { align: 'right' });
    }
    totalsY += rowH;
  });

  const grandTotalY = sectionTop + totalsBoxH - 5.5;
  doc.setFillColor(...GOLD);
  doc.rect(totalsX, grandTotalY - 5, totalsBoxW, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('ESTIMATED TOTAL', totalsInnerX, grandTotalY);
  doc.text(`Rs. ${Number(estimate.grandTotal || 0).toLocaleString('en-IN')}`, totalsX + totalsBoxW - 4, grandTotalY, { align: 'right' });

  // --- Thank you + footer ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...DEEP_RED);
  doc.text('Thank You for Enquiring!', margin, thankYouY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const estimateNote = doc.splitTextToSize(ESTIMATE_TERMS_LINE, pageWidth - margin * 2);
  doc.text(estimateNote, margin, thankYouY + 5);

  doc.setFillColor(...DARK_RED);
  doc.rect(margin - 4, footerBarY, pageWidth - (margin - 4) * 2, footerBarH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(SHOP_INFO.name, margin, footerBarY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text([SHOP_INFO.addressLine1, SHOP_INFO.addressLine2], margin, footerBarY + 10.5);

  doc.setFontSize(8);
  doc.text(`Phone: ${SHOP_INFO.phone}`, pageWidth - margin, footerBarY + 6, { align: 'right' });
  doc.text(`WhatsApp: ${SHOP_INFO.whatsapp}`, pageWidth - margin, footerBarY + 10.5, { align: 'right' });

  doc.setFontSize(6.5);
  doc.setTextColor(255, 235, 220);
  const termsLines = doc.splitTextToSize(ESTIMATE_TERMS_LINE, pageWidth - (margin - 4) * 2 - 8);
  doc.text(termsLines, pageWidth / 2, footerBarY + footerBarH - 5, { align: 'center' });

  return doc;
}

/** Filename used for the estimate download button. */
export function getEstimateFilename(estimate) {
  return `${estimate.estimateNo || 'estimate'}.pdf`;
}

/** Renders `estimate` to a PDF and triggers a browser download named after the estimate number. */
export function generateEstimatePdf(estimate) {
  const doc = buildEstimateDoc(estimate);
  doc.save(getEstimateFilename(estimate));
}
