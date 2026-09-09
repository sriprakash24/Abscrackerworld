// Builds the branded "Estimate Bill" PDF — sent to a customer BEFORE payment
// is confirmed and BEFORE a formal invoice exists (see generateInvoicePdf.js
// for that later stage). Built straight from the order doc, so it needs no
// Firestore write of its own: nothing to generate, nothing to keep in sync.
//
// Reuses the same page chrome (border, deity header, footer) as the invoice
// for a consistent look, but swaps the INVOICE banner for an ESTIMATE BILL
// one, drops the payment-mode checkboxes (payment hasn't happened yet) for a
// "Payment Pending" status pill, and shows the order's own price breakdown
// (subtotal / discount / packing / delivery) instead of the invoice's
// post-payment totals.
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
const TOTALS_FILL = [250, 240, 224];
const PENDING_GOLD = [168, 122, 24];
// Light gold highlight strip behind the discount row — makes the % figure
// pop against the totals box without changing any of the totals math.
const DISCOUNT_HIGHLIGHT = [247, 216, 141];
const DISCOUNT_TEXT = [140, 92, 10];

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

/** Maps a website order doc (orders/{orderId}) into the flat shape this PDF renders. */
function orderToBillData(order) {
  const items = (order.cartItems || []).map((item, i) => ({
    id: `${i + 1}`,
    description: item.name,
    qty: item.quantity,
    rate: item.unitPrice,
    amount: item.lineTotal ?? item.unitPrice * item.quantity,
  }));

  const address = [
    order.address?.houseNumber,
    order.address?.street,
    order.address?.area,
    order.address?.city,
    order.address?.district,
    order.address?.state,
    order.address?.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  const subtotal = order.subtotal ?? 0;
  const discount = order.discount ?? 0;
  // "Total Amount" here is the actual sales price (MRP minus discount) — we
  // show that as a single plain figure rather than walking the customer
  // through MRP-minus-discount arithmetic. The discount itself is shown as
  // a percentage-off reference line only, never subtracted again in the box.
  const salesTotal = Math.max(subtotal - discount, 0);
  const discountPercent = subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0;

  return {
    orderId: order.orderId || order.id,
    date: order.createdAt,
    customer: {
      name: order.customer?.name || '',
      mobile: order.customer?.mobile || '',
      address,
    },
    items,
    salesTotal,
    discountPercent,
    packingCharges: order.packingCharges ?? 0,
    grandTotal: order.grandTotal ?? 0,
  };
}

/** Filename used for both the download button and the WhatsApp-share attachment. */
export function getBillFilename(order) {
  return `Estimate-Bill-${order.orderId || order.id}.pdf`;
}

/** Builds the jsPDF doc for `order`. Shared by download and share so both stay byte-identical. */
function buildBillDoc(order) {
  const bill = orderToBillData(order);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  drawPageBorder(doc, pageWidth, pageHeight);

  // --- Header: same deity artwork + logo as the invoice, for a consistent
  // brand feel across every document a customer receives. ---
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

  // --- ESTIMATE BILL banner + payment-pending pill ---
  const bannerY = headerBottom + 4;
  const bannerW = 76;
  const bannerH = 8.5;
  doc.setFillColor(...DEEP_RED);
  doc.roundedRect(pageWidth / 2 - bannerW / 2, bannerY, bannerW, bannerH, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('ESTIMATE BILL', pageWidth / 2, bannerY + bannerH / 2 + 1.5, { align: 'center' });

  const pillY = bannerY + bannerH + 6;
  const pillLabel = 'PAYMENT STATUS: PENDING';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const pillTextW = doc.getTextWidth(pillLabel);
  const pillW = pillTextW + 8;
  const pillH = 5.5;
  doc.setFillColor(...PENDING_GOLD);
  doc.roundedRect(pageWidth / 2 - pillW / 2, pillY - pillH + 1.6, pillW, pillH, 1.2, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(pillLabel, pageWidth / 2, pillY, { align: 'center' });

  // --- Bill Ref / Date ---
  const infoY = pillY + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(`Order Ref: ${bill.orderId || '-'}`, margin, infoY);
  doc.text(`Date: ${formatDate(bill.date)}`, pageWidth - margin, infoY, { align: 'right' });
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
  doc.text(`Customer Name: ${bill.customer.name || '-'}`, margin + 4, custTop + 7);
  doc.text(`Mobile No.: ${bill.customer.mobile || '-'}`, pageWidth - margin - 4, custTop + 7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  const addressLines = doc.splitTextToSize(`Address: ${bill.customer.address || '-'}`, pageWidth - margin * 2 - 8);
  doc.text(addressLines.slice(0, 2), margin + 4, custTop + 14);

  // --- Items table ---
  const rows = bill.items.map((item, i) => [
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

  // --- Left column: plain-language note instead of a payment-mode banner —
  // there's no payment mode to record yet at estimate stage. ---
  const noteBoxW = 92;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  const noteLines = doc.splitTextToSize(
    'This is an estimate bill for your reference. A tax invoice will be shared once payment is confirmed.',
    noteBoxW
  );
  doc.text(noteLines, margin, afterTableY + 5);

  // --- Totals box (right column): plain sales price + a reference-only
  // discount percentage (highlighted in gold) and packing charges — no
  // MRP-minus-discount math, no delivery-charge line. ---
  const totalsBoxW = 70;
  const totalsX = pageWidth - margin - totalsBoxW;
  const totalsInnerX = totalsX + 4;
  const totalsRows = [
    ['Total Amount', `Rs. ${Number(bill.salesTotal).toLocaleString('en-IN')}`],
    ['Discount', bill.discountPercent > 0 ? `${bill.discountPercent}% OFF` : '-'],
    ['Packing Charges', `Rs. ${Number(bill.packingCharges).toLocaleString('en-IN')}`],
  ];
  const rowH = 6.5;
  const totalsBoxH = rowH * totalsRows.length + 11;
  doc.setFillColor(...TOTALS_FILL);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.roundedRect(totalsX, afterTableY, totalsBoxW, totalsBoxH, 2, 2, 'FD');

  doc.setFontSize(9);
  let totalsY = afterTableY + 6;
  totalsRows.forEach(([label, value], idx) => {
    const isDiscountRow = idx === 1;
    if (isDiscountRow) {
      doc.setFillColor(...DISCOUNT_HIGHLIGHT);
      doc.roundedRect(totalsX + 1.5, totalsY - 4.5, totalsBoxW - 3, rowH - 0.8, 1, 1, 'F');
    }
    doc.setFont('helvetica', isDiscountRow ? 'bold' : 'normal');
    doc.setTextColor(...(isDiscountRow ? DISCOUNT_TEXT : MUTED));
    doc.text(label, totalsInnerX, totalsY);
    doc.setTextColor(...(isDiscountRow ? DISCOUNT_TEXT : INK));
    doc.text(value, totalsX + totalsBoxW - 4, totalsY, { align: 'right' });
    totalsY += rowH;
  });

  const grandTotalY = afterTableY + totalsBoxH - 5.5;
  doc.setFillColor(...ORANGE);
  doc.rect(totalsX, grandTotalY - 5, totalsBoxW, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('GRAND TOTAL', totalsInnerX, grandTotalY);
  doc.text(`Rs. ${Number(bill.grandTotal || 0).toLocaleString('en-IN')}`, totalsX + totalsBoxW - 4, grandTotalY, { align: 'right' });

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

  return doc;
}

/** Renders the estimate bill for `order` and triggers a browser download. */
export function generateBillPdf(order) {
  const doc = buildBillDoc(order);
  doc.save(getBillFilename(order));
}

/** Renders the estimate bill for `order` and returns it as a Blob (for the WhatsApp-share flow, where we need the file bytes rather than a download). */
export function getBillPdfBlob(order) {
  const doc = buildBillDoc(order);
  return doc.output('blob');
}
