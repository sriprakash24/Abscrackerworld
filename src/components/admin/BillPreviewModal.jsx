import { AnimatePresence, motion } from 'framer-motion';
import { X, Download } from 'lucide-react';
import { SHOP_INFO } from '../../constants/invoiceConstants';
import { generateBillPdf } from '../../utils/generateBillPdf';

function formatDate(date) {
  const d = date?.toDate ? date.toDate() : date ? new Date(date) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** On-screen, read-only estimate bill — built straight from the order, before any invoice exists. */
export default function BillPreviewModal({ open, order, onClose }) {
  if (!order) return null;

  const items = order.cartItems || [];
  const subtotal = order.subtotal ?? 0;
  const discount = order.discount ?? 0;
  // Plain sales price (MRP minus discount) shown as one figure, with the
  // discount itself surfaced only as a reference percentage — no
  // MRP-minus-discount arithmetic walked out on screen.
  const salesTotal = Math.max(subtotal - discount, 0);
  const discountPercent = subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0;
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-[#fdfaf5] text-[#241d15] shadow-2xl"
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 border-b border-black/10 bg-[#111111] px-4 py-3">
              <div className="flex items-center gap-1.5">
                <h2 className="text-[13px] font-extrabold text-gradient-gold">{order.orderId || order.id}</h2>
                <span className="flex items-center gap-1 rounded-full border border-gold/35 bg-gold/10 px-1.5 py-0.5 text-[9px] font-bold text-gold">
                  Payment Pending
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateBillPdf(order)}
                  className="btn-3d flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  <Download size={12} />
                  Download PDF
                </button>
                <button onClick={onClose} className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Bill sheet */}
            <div className="max-h-[75vh] overflow-y-auto p-6">
              <div className="text-center">
                <h1 className="text-[20px] font-extrabold tracking-wide text-[#e35226]">{SHOP_INFO.name}</h1>
                <p className="text-[10.5px] font-semibold text-[#8a7f70]">{SHOP_INFO.tagline}</p>
                <div className="my-3 border-t-2 border-[#e35226]/70" />
                <h2 className="text-[14px] font-extrabold">ESTIMATE BILL</h2>
                <span className="mt-1 inline-block rounded-full bg-[#a87a18] px-2.5 py-0.5 text-[9.5px] font-bold text-white">
                  PAYMENT STATUS: PENDING
                </span>
              </div>

              <div className="mt-3 flex justify-between text-[11.5px] font-semibold">
                <span>Order Ref: {order.orderId || order.id}</span>
                <span>Date: {formatDate(order.createdAt)}</span>
              </div>

              <div className="mt-3 rounded-lg border border-[#e35226]/40 p-3">
                <div className="flex flex-wrap justify-between gap-1 text-[11.5px] font-bold">
                  <span>Customer Name: {order.customer?.name || '-'}</span>
                  <span>Mobile No.: {order.customer?.mobile || '-'}</span>
                </div>
                <p className="mt-1 text-[10.5px] font-medium text-[#4a4038]">Address: {address || '-'}</p>
              </div>

              <table className="mt-4 w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#e35226] text-white">
                    <th className="rounded-l-md px-2 py-1.5 text-left font-bold">S.No</th>
                    <th className="px-2 py-1.5 text-left font-bold">Description</th>
                    <th className="px-2 py-1.5 text-center font-bold">Qty</th>
                    <th className="px-2 py-1.5 text-right font-bold">Rate</th>
                    <th className="rounded-r-md px-2 py-1.5 text-right font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.productId || i} className={i % 2 ? 'bg-[#f3ece1]' : ''}>
                      <td className="px-2 py-1.5 text-center">{i + 1}</td>
                      <td className="px-2 py-1.5">{item.name}</td>
                      <td className="px-2 py-1.5 text-center">{item.quantity}</td>
                      <td className="px-2 py-1.5 text-right">₹{Number(item.unitPrice).toLocaleString('en-IN')}</td>
                      <td className="px-2 py-1.5 text-right">₹{Number(item.lineTotal).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                <p className="max-w-[220px] text-[10px] italic text-[#8a7f70]">
                  This is an estimate bill for your reference. A tax invoice will be shared once payment is confirmed.
                </p>
                <div className="w-full max-w-[220px] rounded-lg bg-[#f3ece1] p-3 text-[11px]">
                  <Row label="Total Amount" value={`₹${Number(salesTotal).toLocaleString('en-IN')}`} />
                  <Row label="Discount" value={discountPercent > 0 ? `${discountPercent}% OFF` : '—'} highlight />
                  <Row label="Packing Charges" value={`₹${Number(order.packingCharges ?? 0).toLocaleString('en-IN')}`} />
                  <div className="mt-1.5 flex justify-between border-t-2 border-[#e35226]/60 pt-1.5 text-[13px] font-extrabold text-[#e35226]">
                    <span>Grand Total</span>
                    <span>₹{Number(order.grandTotal || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-[#e35226]/40 pt-3 text-center text-[9.5px] text-[#8a7f70]">
                <p className="font-bold text-[#241d15]">Thank You! {SHOP_INFO.thankYouLine}</p>
                <p className="mt-1">
                  {SHOP_INFO.addressLine1} {SHOP_INFO.addressLine2} · {SHOP_INFO.phone}
                </p>
                <p className="mt-1">{SHOP_INFO.termsLine}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, highlight }) {
  if (highlight) {
    return (
      <div className="my-1 flex items-center justify-between rounded-md bg-[#f6dc9a] px-1.5 py-1 text-[#8c5c0a]">
        <span className="font-bold">{label}</span>
        <span className="font-extrabold">{value}</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between py-0.5 text-[#4a4038]">
      <span>{label}</span>
      <span className="font-semibold text-[#241d15]">{value}</span>
    </div>
  );
}
