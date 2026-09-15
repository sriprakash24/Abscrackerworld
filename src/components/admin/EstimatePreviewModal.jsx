import { AnimatePresence, motion } from 'framer-motion';
import { X, Download } from 'lucide-react';
import { SHOP_INFO } from '../../constants/estimateConstants';
import { generateEstimatePdf } from '../../utils/generateEstimatePdf';

function formatDate(date) {
  const d = date?.toDate ? date.toDate() : date ? new Date(date) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** On-screen, read-only estimate bill — lets admin verify it looks right before/without downloading it. */
export default function EstimatePreviewModal({ open, estimate, onClose }) {
  if (!estimate) return null;

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
                <h2 className="text-[13px] font-extrabold text-gradient-gold">{estimate.estimateNo}</h2>
                <span className="flex items-center gap-1 rounded-full border border-gold/35 bg-gold/10 px-1.5 py-0.5 text-[9px] font-bold text-gold">
                  Estimate
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateEstimatePdf(estimate)}
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

            {/* Estimate sheet */}
            <div className="max-h-[75vh] overflow-y-auto p-6">
              <div className="text-center">
                <h1 className="text-[20px] font-extrabold tracking-wide text-[#e35226]">{SHOP_INFO.name}</h1>
                <p className="text-[10.5px] font-semibold text-[#8a7f70]">{SHOP_INFO.tagline}</p>
                <div className="my-3 border-t-2 border-gold/70" />
                <h2 className="text-[14px] font-extrabold">ESTIMATE</h2>
              </div>

              <div className="mt-3 flex justify-between text-[11.5px] font-semibold">
                <span>Estimate No.: {estimate.estimateNo}</span>
                <span>Date: {formatDate(estimate.date)}</span>
              </div>

              <div className="mt-3 rounded-lg border border-gold/40 p-3">
                <div className="flex flex-wrap justify-between gap-1 text-[11.5px] font-bold">
                  <span>Customer Name: {estimate.customer?.name || '-'}</span>
                  <span>Mobile No.: {estimate.customer?.mobile || '-'}</span>
                </div>
                <p className="mt-1 text-[10.5px] font-medium text-[#4a4038]">Address: {estimate.customer?.address || '-'}</p>
              </div>

              <table className="mt-4 w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-gold text-white">
                    <th className="rounded-l-md px-2 py-1.5 text-left font-bold">S.No</th>
                    <th className="px-2 py-1.5 text-left font-bold">Description</th>
                    <th className="px-2 py-1.5 text-center font-bold">Qty</th>
                    <th className="px-2 py-1.5 text-right font-bold">Rate</th>
                    <th className="rounded-r-md px-2 py-1.5 text-right font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(estimate.items || []).map((item, i) => (
                    <tr key={item.id || i} className={i % 2 ? 'bg-[#f3ece1]' : ''}>
                      <td className="px-2 py-1.5 text-center">{i + 1}</td>
                      <td className="px-2 py-1.5">{item.description}</td>
                      <td className="px-2 py-1.5 text-center">{item.qty}</td>
                      <td className="px-2 py-1.5 text-right">₹{Number(item.rate).toLocaleString('en-IN')}</td>
                      <td className="px-2 py-1.5 text-right">₹{Number(item.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                <div className="text-[10.5px] font-semibold text-[#4a4038]">
                  {estimate.notes && <p className="mt-1 max-w-[220px]">Notes: {estimate.notes}</p>}
                </div>
                <div className="w-full max-w-[220px] rounded-lg bg-[#f3ece1] p-3 text-[11px]">
                  <Row label="Total Amount" value={estimate.subtotal} />
                  <Row label={`Packing Charge (${estimate.packagePercent || 0}%)`} value={estimate.packageAmount} />
                  <div className="mt-1.5 flex justify-between border-t-2 border-gold/60 pt-1.5 text-[13px] font-extrabold text-gold">
                    <span>Estimated Total</span>
                    <span>₹{Number(estimate.grandTotal || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-gold/40 pt-3 text-center text-[9.5px] text-[#8a7f70]">
                <p className="font-bold text-[#241d15]">Thank You for Enquiring!</p>
                <p className="mt-1">This is an estimate only — prices and stock are subject to change until confirmed as an order.</p>
                <p className="mt-1">
                  {SHOP_INFO.addressLine1} {SHOP_INFO.addressLine2} · {SHOP_INFO.phone}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-0.5 text-[#4a4038]">
      <span>{label}</span>
      {value !== null && <span className="font-semibold text-[#241d15]">₹{Number(value).toLocaleString('en-IN')}</span>}
    </div>
  );
}
