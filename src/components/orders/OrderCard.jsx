import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/opacity.css';
import { ChevronDown, Copy, MapPin, MessageCircleMore, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getOrderStatusMeta, normalizeOrderStage } from '../../constants/orderStatusMeta';
import OrderStatusStepper from '../checkout/OrderStatusStepper';
import { db } from '../../firebase/config';
import { getInvoice } from '../../services/invoicesFirestore';
import { generateInvoicePdf } from '../../utils/generateInvoicePdf';

function formatOrderDate(createdAt) {
  const date = createdAt?.toDate ? createdAt.toDate() : createdAt ? new Date(createdAt) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OrderCard({ order, delay = 0 }) {
  const [open, setOpen] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const items = order.cartItems || [];
  const statusMeta = getOrderStatusMeta(order.status);
  const stage = normalizeOrderStage(order.orderStage, order.status);
  const isCancelled = order.status === 'CANCELLED';

  const handleDownloadInvoice = async () => {
    if (!order.invoiceId || downloadingInvoice) return;
    setDownloadingInvoice(true);
    try {
      const invoice = await getInvoice(db, order.invoiceId);
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

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(order.orderId || order.id);
      toast('Order ID copied');
    } catch {
      toast('Could not copy — long press to select');
    }
  };

  const contactSupport = () => {
    const text = encodeURIComponent(`Hi, I'd like an update on my order ${order.orderId || order.id}.`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className="surface-3d overflow-hidden rounded-2xl"
    >
      <button onClick={() => setOpen((v) => !v)} className="flex w-full flex-col gap-3 p-4 text-left">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-extrabold text-[#f2ece2]">{order.orderId || order.id}</div>
            <div className="text-[10px] text-muted">{formatOrderDate(order.createdAt)}</div>
          </div>
          <span
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusMeta.className}`}
          >
            {statusMeta.emoji} {statusMeta.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex -space-x-3">
            {items.slice(0, 3).map((item, i) => (
              <div
                key={item.productId || i}
                className="orb-3d flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden !rounded-lg"
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
              ₹{(order.grandTotal ?? 0).toLocaleString('en-IN')}
            </div>
          </div>

          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-full text-orange"
          >
            <ChevronDown size={15} />
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-t border-dashed border-white/10 px-4 pb-4 pt-3.5">
              <div className="flex flex-col divide-y divide-white/[0.06]">
                {items.map((item, i) => (
                  <div key={item.productId || i} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                    <div className="orb-3d flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden !rounded-lg">
                      {item.image ? (
                        <LazyLoadImage src={item.image} alt={item.name} effect="opacity" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-sm">🎆</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-[11.5px] font-bold text-[#f2ece2]">{item.name}</div>
                      <div className="mt-0.5 text-[10px] text-muted">
                        Qty {item.quantity} × ₹{item.unitPrice}
                      </div>
                    </div>
                    <div className="shrink-0 text-[12px] font-extrabold text-gold">₹{item.lineTotal}</div>
                  </div>
                ))}
              </div>

              {order.address && (
                <div className="flex items-start gap-2 rounded-xl bg-black/20 px-3 py-2.5 text-[10.5px] leading-relaxed text-[#cfc7bd]">
                  <MapPin size={13} className="mt-0.5 shrink-0 text-orange" />
                  <span>
                    {[order.address.houseNumber, order.address.street, order.address.area, order.address.city, order.address.district, order.address.state, order.address.pincode]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}

              {!isCancelled && (
                <div className="flex justify-center">
                  <OrderStatusStepper currentStageId={stage} delay={0.05} />
                </div>
              )}

              {order.invoiceId && (
                <button
                  onClick={handleDownloadInvoice}
                  disabled={downloadingInvoice}
                  className="btn-3d-outline flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gold disabled:opacity-60"
                >
                  {downloadingInvoice ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  Download Invoice
                </button>
              )}

              <div className="flex items-center gap-2 border-t border-dashed border-white/10 pt-3">
                <button
                  onClick={copyOrderId}
                  className="btn-3d-outline flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gold"
                >
                  <Copy size={13} />
                  Copy Order ID
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
