import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Truck, Copy, MapPin, MessageCircleMore, Download, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../firebase/config';
import { useCustomerStore } from '../store/useCustomerStore';
import { useCustomerGateStore } from '../store/useCustomerGateStore';
import { subscribeOrdersByMobile } from '../services/ordersFirestore';
import { getInvoice } from '../services/invoicesFirestore';
import { generateInvoicePdf } from '../utils/generateInvoicePdf';
import { getOrderStatusMeta, normalizeOrderStage } from '../constants/orderStatusMeta';
import OrderStatusStepper from '../components/checkout/OrderStatusStepper';
import OrderCardSkeleton from '../components/orders/OrderCardSkeleton';
import EmptyOrders from '../components/orders/EmptyOrders';
import EmberParticles from '../components/ui/EmberParticles';
import BottomNav from '../components/home/BottomNav';

const ACTIVE_STATUSES = new Set(['AWAITING_ADMIN_CONFIRMATION', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY']);

function formatOrderDate(createdAt) {
  const date = createdAt?.toDate ? createdAt.toDate() : createdAt ? new Date(createdAt) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function TrackHeader({ onBack }) {
  return (
    <div
      className="glass relative sticky top-0 z-30 flex items-center gap-2.5 overflow-hidden px-3 py-3"
      style={{
        borderBottom: '1px solid rgba(255,154,0,.22)',
        boxShadow: '0 10px 26px -14px rgba(0,0,0,.7), 0 0 20px rgba(255,122,0,.1)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,122,0,0.14) 0%, transparent 70%)' }}
      />
      <button
        onClick={onBack}
        className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-orange"
        aria-label="Go back"
      >
        <ArrowLeft size={18} strokeWidth={2.4} />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="beacon-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-[#180f06]">
          <Truck size={16} strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <div className="text-embossed truncate text-[14.5px] font-extrabold leading-tight text-[#f2ece2]">
            Track Order
          </div>
          <div className="text-[10px] font-semibold text-muted">Live status, straight from packing to delivery</div>
        </div>
      </div>
    </div>
  );
}

export default function TrackOrder() {
  const navigate = useNavigate();
  const customer = useCustomerStore((s) => s.customer);
  const requestDetails = useCustomerGateStore((s) => s.requestDetails);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  useEffect(() => {
    if (!customer?.mobile) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const unsubscribe = subscribeOrdersByMobile(
      db,
      customer.mobile,
      (fetched) => {
        setOrders(fetched);
        setLoading(false);
      },
      () => {
        setErrored(true);
        setLoading(false);
      }
    );
    return () => unsubscribe?.();
  }, [customer?.mobile]);

  // Default the selected order to the most recent *active* one (still being
  // packed/confirmed/out for delivery) — that's what someone opening
  // "Track Order" almost always wants to see first. Falls back to the most
  // recent order of any status if nothing is currently active.
  const defaultOrder = useMemo(() => {
    if (orders.length === 0) return null;
    return orders.find((o) => ACTIVE_STATUSES.has(o.status)) || orders[0];
  }, [orders]);

  useEffect(() => {
    if (defaultOrder && !selectedId) setSelectedId(defaultOrder.id);
  }, [defaultOrder, selectedId]);

  const selectedOrder = orders.find((o) => o.id === selectedId) || defaultOrder;

  const handleIdentify = () => requestDetails();

  const copyOrderId = async (order) => {
    try {
      await navigator.clipboard.writeText(order.orderId || order.id);
      toast('Order ID copied');
    } catch {
      toast('Could not copy — long press to select');
    }
  };

  const contactSupport = (order) => {
    const text = encodeURIComponent(`Hi, I'd like an update on my order ${order.orderId || order.id}.`);
    window.open(`https://wa.me/919597189599?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadInvoice = async (order) => {
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

  return (
    <div className="relative min-h-screen w-full pb-28">
      <EmberParticles count={8} className="opacity-30" />

      <TrackHeader onBack={() => navigate(-1)} />

      <div className="mt-3 flex flex-col gap-3 px-4">
        {!customer?.mobile ? (
          <EmptyOrders needsIdentity onIdentify={handleIdentify} />
        ) : loading ? (
          <OrderCardSkeleton />
        ) : errored ? (
          <div className="surface-3d rounded-2xl px-4 py-6 text-center text-[12px] text-muted">
            Couldn't load your order right now. Please check your connection and try again.
          </div>
        ) : !selectedOrder ? (
          <EmptyOrders onShopNow={() => navigate('/')} />
        ) : (
          <>
            {orders.length > 1 && (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
                {orders.map((order) => {
                  const meta = getOrderStatusMeta(order.status);
                  const isSelected = order.id === selectedOrder.id;
                  return (
                    <button
                      key={order.id}
                      onClick={() => setSelectedId(order.id)}
                      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[10.5px] font-bold transition-colors ${
                        isSelected ? meta.className : 'border-white/10 bg-black/20 text-muted'
                      }`}
                    >
                      {meta.emoji} {order.orderId || order.id}
                    </button>
                  );
                })}
              </div>
            )}

            <motion.div
              key={selectedOrder.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="surface-3d flex flex-col gap-3 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-extrabold text-[#f2ece2]">
                    {selectedOrder.orderId || selectedOrder.id}
                  </div>
                  <div className="text-[10px] text-muted">{formatOrderDate(selectedOrder.createdAt)}</div>
                </div>
                <span
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                    getOrderStatusMeta(selectedOrder.status).className
                  }`}
                >
                  {getOrderStatusMeta(selectedOrder.status).emoji} {getOrderStatusMeta(selectedOrder.status).label}
                </span>
              </div>

              {selectedOrder.status !== 'CANCELLED' && (
                <div className="flex justify-center py-1">
                  <OrderStatusStepper
                    currentStageId={normalizeOrderStage(selectedOrder.orderStage, selectedOrder.status)}
                    delay={0.05}
                  />
                </div>
              )}

              {selectedOrder.status === 'CANCELLED' && (
                <div className="rounded-xl border border-[#e35226]/30 bg-[#e35226]/10 px-3 py-2.5 text-center text-[11px] font-semibold text-[#e35226]">
                  This order was cancelled. Reach out on WhatsApp if that doesn't look right.
                </div>
              )}

              <div className="flex -space-x-3 px-1">
                {(selectedOrder.cartItems || []).slice(0, 5).map((item, i) => (
                  <div
                    key={item.productId || i}
                    className="orb-3d flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden !rounded-lg"
                    style={{ zIndex: 5 - i }}
                  >
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-base">🎆</span>
                    )}
                  </div>
                ))}
                {(selectedOrder.cartItems || []).length > 5 && (
                  <div className="orb-3d flex h-11 w-11 shrink-0 items-center justify-center !rounded-lg text-[10px] font-bold text-gold">
                    +{selectedOrder.cartItems.length - 5}
                  </div>
                )}
              </div>

              {selectedOrder.address && (
                <div className="flex items-start gap-2 rounded-xl bg-black/20 px-3 py-2.5 text-[10.5px] leading-relaxed text-[#cfc7bd]">
                  <MapPin size={13} className="mt-0.5 shrink-0 text-orange" />
                  <span>
                    {[
                      selectedOrder.address.houseNumber,
                      selectedOrder.address.street,
                      selectedOrder.address.area,
                      selectedOrder.address.city,
                      selectedOrder.address.district,
                      selectedOrder.address.state,
                      selectedOrder.address.pincode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}

              {selectedOrder.invoiceId && (
                <button
                  onClick={() => handleDownloadInvoice(selectedOrder)}
                  disabled={downloadingInvoice}
                  className="btn-3d-outline flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gold disabled:opacity-60"
                >
                  {downloadingInvoice ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  Download Invoice
                </button>
              )}

              <div className="flex items-center gap-2 border-t border-dashed border-white/10 pt-3">
                <button
                  onClick={() => copyOrderId(selectedOrder)}
                  className="btn-3d-outline flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gold"
                >
                  <Copy size={13} />
                  Copy Order ID
                </button>
                <button
                  onClick={() => contactSupport(selectedOrder)}
                  className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-extrabold text-black"
                >
                  <MessageCircleMore size={13} />
                  WhatsApp Us
                </button>
              </div>
            </motion.div>

            <button
              onClick={() => navigate('/orders')}
              className="flex items-center justify-center gap-1 py-2 text-[11px] font-bold text-muted transition-colors hover:text-orange"
            >
              View all your orders
              <ChevronRight size={13} />
            </button>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
