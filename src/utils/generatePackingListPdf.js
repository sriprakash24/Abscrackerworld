// Builds and downloads a simple packing-list PDF for one packing job (a
// single order, or a merged box) — deliberately bare-bones by request:
// just the item names and quantities to pack, nothing else. This is meant
// to be printed and used on the packing floor, not shown to the customer,
// so it skips the festive branding the invoice/estimate PDFs carry.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ORANGE = [255, 122, 0];
const INK = [30, 26, 22];
const MUTED = [120, 112, 102];

/**
 * `job` is the same shape PackingJobCard already receives: { merged,
 * orderLabels, items: [{ name, quantity }], confirmedDateLabel, ... }.
 */
export function generatePackingListPdf(job) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text('Packing List', margin, 18);

  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.6);
  doc.line(margin, 22, pageWidth - margin, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  let infoY = 29;
  const label = job.merged ? 'Merged box' : job.orderLabels?.[0] || '';
  doc.text(`Order: ${label}`, margin, infoY);
  if (job.merged && job.orderLabels?.length) {
    infoY += 5;
    doc.text(`Includes: ${job.orderLabels.join(', ')}`, margin, infoY);
  }
  if (job.customerName) {
    infoY += 5;
    doc.text(`Customer: ${job.customerName}`, margin, infoY);
  }

  const items = job.items || [];
  const rows = items.map((item, i) => [String(i + 1), item.name || '-', String(item.quantity ?? 0)]);

  autoTable(doc, {
    startY: infoY + 6,
    margin: { left: margin, right: margin },
    head: [['S.No', 'Item', 'Qty']],
    body: rows,
    styles: { font: 'helvetica', fontSize: 10, textColor: INK, cellPadding: 2.6 },
    headStyles: { fillColor: ORANGE, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 24, halign: 'center' },
    },
    alternateRowStyles: { fillColor: [248, 246, 242] },
  });

  return doc;
}

/** Filename used for the packing-list download. */
export function getPackingListFilename(job) {
  const base = job.merged ? `merged-${job.mobile || 'box'}` : job.orderLabels?.[0] || 'packing-list';
  return `Packing-${base}.pdf`;
}

/** Renders `job`'s packing list to a PDF and triggers a browser download. */
export function downloadPackingListPdf(job) {
  const doc = generatePackingListPdf(job);
  doc.save(getPackingListFilename(job));
}
