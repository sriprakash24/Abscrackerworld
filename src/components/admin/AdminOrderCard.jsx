import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/opacity.css';
import {
  ChevronDown,
  Copy,
  MapPin,
  Phone,
  MessageCircleMore,
  CircleDollarSign,
  PackageCheck,
  Truck,
  CheckCheck,
  Ban,
  Loader2,
  StickyNote,
  Download,
  Eye,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { getOrderStatusMeta } from '../../constants/orderStatusMeta';
import { NEXT_ACTION_BY_STATUS, canAdvance, canCancel } from '../../constants/orderActions';
import { db } from '../../firebase/config';
import { updateOrderStatus } from '../../services/ordersFirestore';
import { createInvoiceForOrder, getInvoice } from '../../services/invoicesFirestore';
import { generateInvoicePdf } from '../../utils/generateInvoicePdf';
import InvoicePreviewModal from './InvoicePreviewModal';

const ACTION_ICONS = {
  CircleDollarSign,
  PackageCheck,
  Truck,
  CheckCheck,
};

function formatOrderDate(createdAt) {
  const date = createdAt?.toDate ? createdAt.toDate() : createdAt ? new Date(createdAt) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const PAYMENT_META = {
  PENDING: { label: 'Payment Pending', className: 'border-gold/35 bg-gold/10 text-gold' },
  RECEIVED: { label: 'Payment Received', className: 'border-[#8fe3a0]/35 bg-[#8fe3a0]/10 text-[#8fe3a0]' },
};

export default function AdminOrderCard({ order, delay = 0 }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const items = order.cartItems || [];
  const statusMeta = getOrderStatusMeta(order.status);
  const paymentMeta = PAYMENT_META[order.paymentStatus] || PAYMENT_META.PENDING;
  const nextAction = NEXT_ACTION_BY_STATUS[order.status];
  const showAdvance = canAdvance(order.status);
  const showCancel = canCancel(order.status);
  const NextIcon = nextAction ? ACTION_ICONS[nextAction.icon] : null;
  // Payment was confirmed (at some point) but no invoice ever landed — e.g.
  // the auto-generate step failed silently, or this order was confirmed
  // before that logic existed. Surface a manual retry instead of leaving it
  // stuck with no way to produce an invoice.
  const missingInvoice = order.paymentStatus === 'RECEIVED' && !order.invoiceId;

  const runUpdate = async (patch, successMessage) => {
    setBusy(true);
    try {
      await updateOrderStatus(db, order.id, patch);
      toast.success(successMessage);
    } catch (err) {
      console.error('Failed to update order', err);
      toast.error("Couldn't update the order. Please try again.");
    } finally {
      setBusy(false);
      setConfirmingCancel(false);
    }
  };

  const handleAdvance = async () => {
    if (!nextAction || busy) return;
    // Confirming payment also auto-generates the invoice (idempotent — safe
    // even if this order somehow already has one).
    if (nextAction.patch.status === 'CONFIRMED') {
      setBusy(true);
      try {
        await updateOrderStatus(db, order.id, nextAction.patch);
        try {
          await createInvoiceForOrder(db, { ...order, ...nextAction.patch });
          toast.success('Payment confirmed — invoice generated');
        } catch (invoiceErr) {
          // Status update already succeeded — don't tell the admin payment
          // confirmation failed. Let them retry invoice generation from the
          // "Generate Invoice" fallback button instead.
          console.error('Payment confirmed but invoice generation failed', invoiceErr);
          toast.error('Payment confirmed, but invoice generation failed — tap "Generate Invoice" to retry.');
        }
      } catch (err) {
        console.error('Failed to confirm payment', err);
        toast.error("Couldn't confirm payment. Please try again.");
      } finally {
        setBusy(false);
      }
      return;
    }
    runUpdate(nextAction.patch, `Order moved to "${getOrderStatusMeta(nextAction.patch.status).label}"`);
  };

  const handleGenerateInvoice = async () => {
    if (generatingInvoice) return;
    setGeneratingInvoice(true);
    try {
      await createInvoiceForOrder(db, order);
      toast.success('Invoice generated');
    } catch (err) {
      console.error('Failed to generate invoice', err);
      toast.error("Couldn't generate the invoice. Please try again.");
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleViewInvoice = async () => {
    if (!order.invoiceId || loadingPreview) return;
    setLoadingPreview(true);
    try {
      const invoice = await getInvoice(db, order.invoiceId);
      if (!invoice) {
        toast.error('Invoice not found');
        return;
      }
      setPreviewInvoice(invoice);
    } catch (err) {
      console.error('Failed to load invoice', err);
      toast.error("Couldn't load the invoice. Please try again.");
    } finally {
      setLoadingPreview(false);
    }
  };

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

  const handleCancel = () => {
    if (busy) return;
    if (!confirmingCancel) {
      setConfirmingCancel(true);
      return;
    }
    runUpdate({ status: 'CANCELLED' }, 'Order cancelled');
  };

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(order.orderId || order.id);
      toast('Order ID copied');
    } catch {
      toast('Could not copy — long press to select');
    }
  };

  const copyMobile = async () => {
    try {
      await navigator.clipboard.writeText(order.customer?.mobile || '');
      toast('Mobile number copied');
    } catch {
      toast('Could not copy — long press to select');
    }
  };

  const whatsappCustomer = () => {
    const mobile = (order.customer?.mobile || '').replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hi ${order.customer?.name || ''}, this is ABS Crackers World regarding your order ${order.orderId || order.id}.`
    );
    window.open(`https://wa.me/91${mobile.slice(-10)}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className="surface-3d overflow-hidden rounded-2xl"
    >
      <button onClick={() => setOpen((v) => !v)} className="flex w-full flex-col gap-3 p-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-extrabold text-[#f2ece2]">{order.orderId || order.id}</div>
            <div className="text-[10px] text-muted">{formatOrderDate(order.createdAt)}</div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${paymentMeta.className}`}>
              {paymentMeta.label}
            </span>
            <span className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusMeta.className}`}>
              {statusMeta.emoji} {statusMeta.label}
            </span>
          </div>
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
            <div className="truncate text-[11.5px] font-bold text-[#f2ece2]">{order.customer?.name || 'Unnamed customer'}</div>
            <div className="text-[10px] font-semibold text-muted">
              {order.customer?.mobile} · {items.length} {items.length === 1 ? 'item' : 'items'}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-[14px] font-extrabold text-gradient-gold">₹{(order.grandTotal ?? 0).toLocaleString('en-IN')}</div>
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
              {/* Contact row */}
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`tel:${order.customer?.mobile}`}
                  className="btn-3d-outline flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10.5px] font-bold text-gold"
                >
                  <Phone size={12} /> Call
                </a>
                <button
                  onClick={whatsappCustomer}
                  className="btn-3d-outline flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10.5px] font-bold text-gold"
                >
                  <MessageCircleMore size={12} /> WhatsApp
                </button>
                <button
                  onClick={copyMobile}
                  className="btn-3d-outline flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10.5px] font-bold text-gold"
                >
                  <Copy size={12} /> Copy Mobile
                </button>
                <button
                  onClick={copyOrderId}
                  className="btn-3d-outline flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10.5px] font-bold text-gold"
                >
                  <Copy size={12} /> Copy Order ID
                </button>
              </div>

              {/* Items */}
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

              {/* Price breakdown */}
              <div className="flex flex-col gap-1 rounded-xl bg-black/20 px-3 py-2.5 text-[10.5px] text-[#cfc7bd]">
                <div className="flex justify-between"><span>Subtotal (MRP)</span><span>₹{(order.subtotal ?? 0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>-₹{(order.discount ?? 0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span>Packing charges</span><span>₹{(order.packingCharges ?? 0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span>Delivery charges</span><span>₹{(order.deliveryCharges ?? 0).toLocaleString('en-IN')}</span></div>
                <div className="mt-1 flex justify-between border-t border-dashed border-white/10 pt-1.5 text-[11.5px] font-extrabold text-[#f2ece2]">
                  <span>Grand Total</span><span>₹{(order.grandTotal ?? 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Address */}
              {order.address && (
                <div className="flex items-start gap-2 rounded-xl bg-black/20 px-3 py-2.5 text-[10.5px] leading-relaxed text-[#cfc7bd]">
                  <MapPin size={13} className="mt-0.5 shrink-0 text-orange" />
                  <span>
                    {[order.address.houseNumber, order.address.street, order.address.area, order.address.city, order.address.district, order.address.state, order.address.pincode]
                      .filter(Boolean)
                      .join(', ')}
                    {order.address.landmark ? ` (near ${order.address.landmark})` : ''}
                  </span>
                </div>
              )}

              {/* Notes */}
              {order.orderNotes && (
                <div className="flex items-start gap-2 rounded-xl bg-black/20 px-3 py-2.5 text-[10.5px] leading-relaxed text-[#cfc7bd]">
                  <StickyNote size={13} className="mt-0.5 shrink-0 text-orange" />
                  <span>{order.orderNotes}</span>
                </div>
              )}

              {/* Invoice */}
              {order.invoiceId ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleViewInvoice}
                    disabled={loadingPreview}
                    className="btn-3d-outline flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gold disabled:opacity-60"
                  >
                    {loadingPreview ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                    View Invoice {order.invoiceNo ? `(${order.invoiceNo})` : ''}
                  </button>
                  <button
                    onClick={handleDownloadInvoice}
                    disabled={downloadingInvoice}
                    className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-gold disabled:opacity-60"
                  >
                    {downloadingInvoice ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  </button>
                </div>
              ) : (
                missingInvoice && (
                  <button
                    onClick={handleGenerateInvoice}
                    disabled={generatingInvoice}
                    className="btn-3d-outline flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gold disabled:opacity-60"
                  >
                    {generatingInvoice ? <Loader2 size={13} className="animate-spin" /> : <Receipt size={13} />}
                    Generate Invoice
                  </button>
                )
              )}

              {/* Actions */}
              {(showAdvance || showCancel) && (
                <div className="flex items-center gap-2 border-t border-dashed border-white/10 pt-3">
                  {showAdvance && (
                    <button
                      onClick={handleAdvance}
                      disabled={busy}
                      className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? <Loader2 size={13} className="animate-spin" /> : NextIcon && <NextIcon size={13} />}
                      {nextAction.shortLabel}
                    </button>
                  )}
                  {showCancel && (
                    <button
                      onClick={handleCancel}
                      disabled={busy}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        confirmingCancel
                          ? 'border-[#e35226]/60 bg-[#e35226]/15 text-[#ff8a63]'
                          : 'border-white/10 bg-[#0c0906] text-muted hover:border-[#e35226]/40 hover:text-[#e35226]'
                      }`}
                    >
                      <Ban size={12} />
                      {confirmingCancel ? 'Tap to confirm' : 'Cancel'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>

    <InvoicePreviewModal open={!!previewInvoice} invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />
    </>
  );
}
