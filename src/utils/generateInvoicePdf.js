// Builds and downloads the branded invoice PDF — used from both the admin
// Invoices page and the customer "Download Invoice" button, so the two
// always produce byte-identical layouts for the same invoice doc.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SHOP_INFO, PAYMENT_MODES, PAYMENT_MODE_LABELS } from '../constants/invoiceConstants';
import { SHIVA_PARVATI_IMG, MURUGAN_IMG, GANESHA_IMG, ABS_LOGO_IMG } from '../assets/invoiceAssets';

const ORANGE = [255, 122, 0];
const GOLD = [200, 150, 40];
const DEEP_RED = [178, 34, 34];
const DARK_RED = [120, 18, 18];
const INK = [30, 26, 22];
const MUTED = [120, 112, 102];
const CREAM = [255, 251, 245];
const TOTALS_FILL = [250, 240, 224];

// Natural pixel aspect ratios (height / width) of the embedded artwork, used
// so images scale without distortion no matter what width we place them at.
const SHIVA_PARVATI_RATIO = 561 / 500;
const MURUGAN_RATIO = 529 / 500;
const GANESHA_RATIO = 557 / 500;
const LOGO_RATIO = 436 / 520;

function formatDate(date) {
  const d = date?.toDate ? date.toDate() : date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Double gold/orange frame around the whole page, echoing the festive
// border on the reference design.
function drawPageBorder(doc, pageWidth, pageHeight) {
  const outer = 5;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.7);
  doc.rect(outer, outer, pageWidth - outer * 2, pageHeight - outer * 2);

  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.3);
  doc.rect(outer + 1.6, outer + 1.6, pageWidth - (outer + 1.6) * 2, pageHeight - (outer + 1.6) * 2);
}

// Thin gold picture-frame rule around a deity image so it reads as an
// intentional framed illustration rather than a pasted photo.
function drawImageFrame(doc, x, y, w, h) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, h);
}

// Small checkbox with an optional check mark, used for the payment mode row.
function drawCheckbox(doc, x, y, size, checked, label) {
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.35);
  doc.rect(x, y - size, size, size);
  if (checked) {
    doc.setDrawColor(...DEEP_RED);
    doc.setLineWidth(0.5);
    doc.line(x + size * 0.15, y - size * 0.5, x + size * 0.4, y - size * 0.15);
    doc.line(x + size * 0.4, y - size * 0.15, x + size * 0.9, y - size * 0.85);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(label, x + size + 2, y);
}

/**
 * Renders `invoice` (a doc from invoices/{invoiceDocId}) to a PDF and
 * triggers a browser download named after the invoice number.
 */
export function generateInvoicePdf(invoice) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  drawPageBorder(doc, pageWidth, pageHeight);

  // --- Header: Shiva-Parvati (left) & Murugan (right) framing the ABS logo,
  // Ganesha centered beneath it. The logo artwork already contains the
  // "Festival Fireworks Store" tagline, so we don't draw it again here. ---
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

  // --- INVOICE banner ---
  const bannerY = headerBottom + 4;
  const bannerW = 50;
  const bannerH = 8.5;
  doc.setFillColor(...DEEP_RED);
  doc.roundedRect(pageWidth / 2 - bannerW / 2, bannerY, bannerW, bannerH, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', pageWidth / 2, bannerY + bannerH / 2 + 1.5, { align: 'center' });

  // --- Invoice No / Date ---
  const infoY = bannerY + bannerH + 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(`Invoice No.: ${invoice.invoiceNo || '-'}`, margin, infoY);
  doc.text(`Date: ${formatDate(invoice.date)}`, pageWidth - margin, infoY, { align: 'right' });
  let afterInfoY = infoY + 5;
  if (invoice.orderId) {
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Order Ref: ${invoice.orderId}`, margin, afterInfoY);
    afterInfoY += 4;
  }

  // --- Customer block ---
  const custTop = afterInfoY + 2;
  doc.setFillColor(...CREAM);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, custTop, pageWidth - margin * 2, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(`Customer Name: ${invoice.customer?.name || '-'}`, margin + 4, custTop + 7);
  doc.text(`Mobile No.: ${invoice.customer?.mobile || '-'}`, pageWidth - margin - 4, custTop + 7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  const addressLines = doc.splitTextToSize(`Address: ${invoice.customer?.address || '-'}`, pageWidth - margin * 2 - 8);
  doc.text(addressLines.slice(0, 2), margin + 4, custTop + 14);

  // --- Items table ---
  const rows = (invoice.items || []).map((item, i) => [
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
    headStyles: { fillColor: ORANGE, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [250, 246, 240] },
  });

  const afterTableY = doc.lastAutoTable.finalY + 8;

  // --- Payment mode banner + checkboxes (left column) ---
  const paymentBoxW = 92;
  const paymentBannerH = 6.5;
  doc.setFillColor(...DEEP_RED);
  doc.roundedRect(margin, afterTableY, paymentBoxW, paymentBannerH, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PAYMENT MODE', margin + paymentBoxW / 2, afterTableY + paymentBannerH / 2 + 1.2, { align: 'center' });

  const modeKey = invoice.paymentMode;
  const checkboxY = afterTableY + paymentBannerH + 7;
  let cbX = margin + 2;
  const cbSize = 3.6;
  PAYMENT_MODES.forEach((mode) => {
    const label = PAYMENT_MODE_LABELS[mode] || mode;
    drawCheckbox(doc, cbX, checkboxY, cbSize, modeKey === mode, label);
    cbX += doc.getTextWidth(label) + cbSize + 8;
  });

  let notesY = checkboxY + 7;
  if (invoice.transactionRef) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(`Transaction / UTR No.: ${invoice.transactionRef}`, margin, notesY);
    notesY += 6;
  }
  if (invoice.notes) {
    const noteLines = doc.splitTextToSize(`Notes: ${invoice.notes}`, paymentBoxW);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(noteLines, margin, notesY);
  }

  // --- Totals box (right column), grand total highlighted ---
  const totalsBoxW = 70;
  const totalsX = pageWidth - margin - totalsBoxW;
  const totalsInnerX = totalsX + 4;
  const totalsRows = [
    ['Sub Total', invoice.subtotal],
    ['Discount', -Math.abs(invoice.discount || 0)],
    [`Package % (${invoice.packagePercent || 0}%)`, null],
    ['Package Amount', invoice.packageAmount],
  ];
  const rowH = 6;
  const totalsBoxH = rowH * totalsRows.length + 11;
  doc.setFillColor(...TOTALS_FILL);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.roundedRect(totalsX, afterTableY, totalsBoxW, totalsBoxH, 2, 2, 'FD');

  doc.setFontSize(9);
  let totalsY = afterTableY + 6;
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

  const grandTotalY = afterTableY + totalsBoxH - 5.5;
  doc.setFillColor(...ORANGE);
  doc.rect(totalsX, grandTotalY - 5, totalsBoxW, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('GRAND TOTAL', totalsInnerX, grandTotalY);
  doc.text(`Rs. ${Number(invoice.grandTotal || 0).toLocaleString('en-IN')}`, totalsX + totalsBoxW - 4, grandTotalY, { align: 'right' });

  // --- Thank you + signature block, above the footer bar ---
  const footerBarH = 20;
  const footerBarY = pageHeight - footerBarH - 7;
  const thankYouY = footerBarY - 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...DEEP_RED);
  doc.text('Thank You!', margin, thankYouY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(SHOP_INFO.thankYouLine, margin, thankYouY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(`For ${SHOP_INFO.name}`, pageWidth - margin, thankYouY - 4, { align: 'right' });
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.2);
  doc.line(pageWidth - margin - 46, thankYouY + 4, pageWidth - margin, thankYouY + 4);
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text('Authorized Signature', pageWidth - margin, thankYouY + 8, { align: 'right' });

  // --- Footer: solid festive bar with shop contact details + terms ---
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

  doc.setFontSize(7);
  doc.setTextColor(255, 235, 220);
  doc.text(SHOP_INFO.termsLine, pageWidth / 2, footerBarY + footerBarH - 3, { align: 'center' });

  doc.save(`${invoice.invoiceNo || 'invoice'}.pdf`);
}
