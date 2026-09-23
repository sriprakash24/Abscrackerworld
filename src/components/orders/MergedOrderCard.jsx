import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/opacity.css';
import { ChevronDown, Copy, MapPin, MessageCircleMore, Download, Loader2, PackageSearch, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { getOrderStatusMeta, normalizeOrderStage, isOrderStageComplete } from '../../constants/orderStatusMeta';
import OrderStatusStepper from '../checkout/OrderStatusStepper';
import { db } from '../../firebase/config';
import { getInvoice } from '../../services/invoicesFirestore';
import { generateInvoicePdf } from '../../utils/generateInvoicePdf';
import { mergeCartItems } from '../../utils/mergeCartItems';
import { downloadPackingListPdf } from '../../utils/generatePackingListPdf';

function formatOrderDate(createdAt) {
  const date = createdAt?.toDate ? createdAt.toDate() : createdAt ? new Date(createdAt) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Several of this customer's orders that admin merged into one estimate/
 * invoice (see MergedEstimateCard on the admin side) — shown here as one
 * card instead of splitting back into separate rows, so "my orders" and
 * the bill the customer can download both match what admin actually
 * billed them as. Grouped purely by shared `invoiceId`, which is only set
 * once payment is confirmed — so this only ever reflects a merge admin has
 * actually committed to, never a still-editable pre-payment toggle.
 */
export default function MergedOrderCard({ orders, delay = 0 }) {
  const [open, setOpen] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [downloadingPackingList, setDownloadingPackingList] = useState(false);

  const first = orders[0];
  const items = useMemo(() => mergeCartItems(orders), [orders]);
  const grandTotal = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const statusMeta = getOrderStatusMeta(first.status);
  const stage = normalizeOrderStage(first.orderStage, first.status);
  const isCancelled = first.status === 'CANCELLED';

  const handleDownloadInvoice = async () => {
    if (!first.invoiceId || downloadingInvoice) return;
    setDownloadingInvoice(true);
    try {
      const invoice = await getInvoice(db, first.invoiceId);
      if (!invoice) {
        toast.error('Invoice not found');
        return;
      }
      generateInvoicePdf(invoice);
    } catch (err) {
      console.error('Failed to download invoice', err);
      toast.error("Couldn't download the invoice. Please try again.");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  // Same bare item+quantity list admin packs from — for reference only, so
  // the customer can see exactly what's being packed for them without
  // needing to add up quantities across their merged orders by hand.
  const handleDownloadPackingList = () => {
    if (downloadingPackingList) return;
    setDownloadingPackingList(true);
    try {
      downloadPackingListPdf({
        merged: true,
        mobile: first.customer?.mobile,
        customerName: first.customer?.name,
        orderLabels: orders.map((o) => o.orderId || o.id),
        confirmedDateLabel: formatOrderDate(first.paymentConfirmedAt || first.createdAt),
        items,
      });
    } catch (err) {
      console.error('Failed to build packing list', err);
      toast.error("Couldn't generate the packing list. Please try again.");
    } finally {
      setDownloadingPackingList(false);
    }
  };

  const copyOrderIds = async () => {
    try {
      await navigator.clipboard.writeText(orders.map((o) => o.orderId || o.id).join(', '));
      toast('Order IDs copied');
    } catch {
      toast('Could not copy — long press to select');
    }
  };

  const contactSupport = () => {
    const label = orders.map((o) => o.orderId || o.id).join(', ');
    const text = encodeURIComponent(`Hi, I'd like an update on my orders ${label}.`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className="surface-3d overflow-hidden rounded-2xl border border-gold/30"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gold">
              <Layers size={12} /> Merged · {orders.length} orders
            </div>
            <div className="truncate text-[12.5px] font-extrabold text-[#f2ece2]">
              {orders.map((o) => o.orderId || o.id).join(' + ')}
            </div>
            <div className="text-[10px] text-muted">{formatOrderDate(first.createdAt)}</div>
          </div>
          <span
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusMeta.className}`}
          >
            {statusMeta.emoji} {statusMeta.label}
          </span>
        </div>

        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-left">
          <div className="flex -space-x-3">
            {items.slice(0, 3).map((item, i) => (
              <div
                key={item.key || i}
                className="orb-3d orb-cream flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden !rounded-lg"
                style={{ zIndex: 3 - i }}
              >
                {item.image ? (
                  <LazyLoadImage src={item.image} alt={item.name} effect="opacity" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-base">🎆</span>
                )}
              </div>
            ))}
            {items.length > 3 && (
              <div className="orb-3d flex h-11 w-11 shrink-0 items-center justify-center !rounded-lg text-[10px] font-bold text-gold">
                +{items.length - 3}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pl-1">
            <div className="text-[11px] font-semibold text-muted">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </div>
            <div className="text-[14px] font-extrabold text-gradient-gold">
              ₹{grandTotal.toLocaleString('en-IN')}
            </div>
          </div>

          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-full text-orange"
          >
            <ChevronDown size={15} />
          </motion.span>
        </button>

        {!isCancelled && (
          <button
            type="button"
            onClick={handleDownloadPackingList}
            disabled={downloadingPackingList}
            className="btn-3d-outline flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gold disabled:opacity-50"
          >
            {downloadingPackingList ? <Loader2 size={13} className="animate-spin" /> : <PackageSearch size={13} />}
            Packing List (Items &amp; Qty)
          </button>
        )}

        {!isCancelled && (
          <button
            type="button"
            onClick={handleDownloadInvoice}
            disabled={!first.invoiceId || downloadingInvoice}
            style={{ borderColor: 'rgba(143, 227, 160, 0.55)' }}
            className="btn-3d-outline flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11.5px] font-extrabold text-[#8fe3a0] disabled:opacity-50"
          >
            {downloadingInvoice ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Download Invoice
          </button>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-3 border-t border-dashed border-white/10 px-4 pb-4 pt-3.5">
          <div className="flex flex-col divide-y divide-white/[0.06]">
            {items.map((item, i) => (
              <div key={item.key || i} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <div className="orb-3d orb-cream flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden !rounded-lg">
                  {item.image ? (
                    <LazyLoadImage src={item.image} alt={item.name} effect="opacity" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-sm">🎆</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-[11.5px] font-bold text-[#f2ece2]">{item.name}</div>
                  {item.nameTa && (
                    <div className="line-clamp-1 text-[10px] font-semibold text-gold">{item.nameTa}</div>
                  )}
                  <div className="mt-0.5 text-[10px] text-muted">Qty {item.quantity}</div>
                </div>
              </div>
            ))}
          </div>

          {first.address && (
            <div className="flex items-start gap-2 rounded-xl bg-black/20 px-3 py-2.5 text-[10.5px] leading-relaxed text-[#cfc7bd]">
              <MapPin size={13} className="mt-0.5 shrink-0 text-orange" />
              <span>
                {[first.address.houseNumber, first.address.street, first.address.area, first.address.city, first.address.district, first.address.state, first.address.pincode]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}

          {!isCancelled && (
            <div className="flex justify-center">
              <OrderStatusStepper currentStageId={stage} completed={isOrderStageComplete(first.status)} delay={0.05} />
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-dashed border-white/10 pt-3">
            <button
              onClick={copyOrderIds}
              className="btn-3d-outline flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gold"
            >
              <Copy size={13} />
              Copy Order IDs
            </button>
            <button
              onClick={contactSupport}
              className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-extrabold text-black"
            >
              <MessageCircleMore size={13} />
              WhatsApp Us
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
