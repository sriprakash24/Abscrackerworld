import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  MessageCircle,
  CircleDollarSign,
  Undo2,
  Loader2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { getClusterAccent } from "../../utils/packingAccent";
import { formatStreetLine } from "../../utils/formatAddress";
import { openWhatsappChat } from "../../utils/whatsappChat";
import { formatConfirmedDate } from "../../utils/orderDates";
import { PREVIOUS_ACTION_BY_STATUS } from "../../constants/orderActions";
import { db } from "../../firebase/config";
import { updateOrderStatus, computeOrderPricing } from "../../services/ordersFirestore";
import { createInvoiceForOrder } from "../../services/invoicesFirestore";
import { useProducts } from "../../contexts/ProductsContext";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";

/**
 * One order, one job: confirm a payment or revoke one that was confirmed
 * by mistake. Deliberately doesn't carry any of AdminOrderCard's invoice/
 * bill/WhatsApp-tracking machinery — that all still lives on the main
 * Orders page. This card exists purely so "did the money come in?" is a
 * fast yes/no screen on its own, not buried inside a 6-status list.
 */
export default function PaymentOrderCard({ order, index = 0, delay = 0 }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [busy, setBusy] = useState(false);

  const { products } = useProducts();
  const productsById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products],
  );

  const isAwaiting = order.status === "AWAITING_ADMIN_CONFIRMATION";
  const accent = getClusterAccent(index);

  // Same live-repricing AdminOrderCard does for orders still awaiting
  // payment — if a product's price moved since the order was placed, the
  // total shown (and the one that gets locked in on confirm) reflects
  // today's price, not checkout-time.
  const pricedOrder = useMemo(() => {
    const rawItems = order.cartItems || [];
    if (!isAwaiting) return order;
    const pricingInputs = rawItems.map((item) => {
      const liveProduct = productsById[item.productId];
      return {
        product: liveProduct
          ? { id: liveProduct.id, mrp: liveProduct.mrp, sale: liveProduct.sale }
          : { id: item.productId, mrp: item.mrp ?? item.unitPrice, sale: item.unitPrice },
        qty: item.quantity,
      };
    });
    const pricing = computeOrderPricing(pricingInputs);
    return {
      ...order,
      cartItems: rawItems.map((item, i) => ({
        ...item,
        unitPrice: pricing.cartItems[i].unitPrice,
        mrp: pricing.cartItems[i].mrp,
        lineTotal: pricing.cartItems[i].lineTotal,
      })),
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      packingCharges: pricing.packingCharges,
      deliveryCharges: pricing.deliveryCharges,
      grandTotal: pricing.grandTotal,
      totalSavings: pricing.totalSavings,
    };
  }, [order, isAwaiting, productsById]);

  const items = pricedOrder.cartItems || [];
  const revokeAction = PREVIOUS_ACTION_BY_STATUS[order.status];

  const handleConfirm = async () => {
    setBusy(true);
    try {
      const confirmPatch = {
        status: "CONFIRMED",
        paymentStatus: "RECEIVED",
        cartItems: pricedOrder.cartItems,
        subtotal: pricedOrder.subtotal,
        discount: pricedOrder.discount,
        packingCharges: pricedOrder.packingCharges,
        deliveryCharges: pricedOrder.deliveryCharges,
        grandTotal: pricedOrder.grandTotal,
        totalSavings: pricedOrder.totalSavings,
      };
      await updateOrderStatus(db, order.id, confirmPatch);
      try {
        await createInvoiceForOrder(db, { ...order, ...confirmPatch });
        toast.success("Payment confirmed — invoice generated");
      } catch (invoiceErr) {
        console.error("Payment confirmed but invoice generation failed", invoiceErr);
        toast.error(
          'Payment confirmed, but invoice generation failed — retry from the Orders page.',
        );
      }
    } catch (err) {
      console.error("Failed to confirm payment", err);
      toast.error("Couldn't confirm payment. Please try again.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeAction) return;
    setBusy(true);
    try {
      await updateOrderStatus(db, order.id, revokeAction.patch);
      toast.success("Reverted to Awaiting Confirmation");
    } catch (err) {
      console.error("Failed to revoke payment confirmation", err);
      toast.error("Couldn't revert the order. Please try again.");
    } finally {
      setBusy(false);
      setRevoking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="surface-3d relative flex flex-col gap-3 overflow-hidden rounded-2xl p-4"
      style={{ borderColor: `${accent.solid}55` }}
    >
      <span
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[5px]"
        style={{ background: `linear-gradient(180deg, ${accent.from}, ${accent.to})` }}
      />
      <span
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: `radial-gradient(ellipse at top left, ${accent.wash}, transparent 55%)` }}
      />

      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-2 pl-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-black"
            style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
          >
            {(order.customer?.name || "?").trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-extrabold text-[#f2ece2]">
              {order.customer?.name || "Unnamed customer"}
            </div>
            <div className="truncate text-[10px] text-muted">
              {order.orderId || order.id} · {order.customer?.mobile}
            </div>
          </div>
        </div>

        <button
          onClick={() => openWhatsappChat(order.customer?.mobile)}
          title="Open WhatsApp chat"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#25D366]/45 bg-[#25D366]/10 px-2.5 py-1.5 text-[10px] font-extrabold text-[#25D366]"
        >
          <MessageCircle size={12} />
          Chat
        </button>
      </div>

      {order.address && (order.address.city || order.address.district || formatStreetLine(order.address)) && (
        <div className="relative z-[1] flex flex-wrap items-center gap-1.5 pl-1.5">
          <MapPin size={12} className="shrink-0 text-muted" />
          {formatStreetLine(order.address) && (
            <span className="text-[10.5px] text-muted">{formatStreetLine(order.address)}</span>
          )}
          {(order.address.city || order.address.district) && (
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-extrabold"
              style={{ borderColor: `${accent.solid}70`, background: `${accent.solid}22`, color: accent.solid }}
            >
              {order.address.city || order.address.district}
            </span>
          )}
        </div>
      )}

      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2 pl-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-[10.5px] font-bold text-muted"
        >
          {items.length} {items.length === 1 ? "item" : "items"}
          <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-muted">
            {isAwaiting ? "Ordered" : "Confirmed"} {formatConfirmedDate(order)}
          </span>
          <span className="text-[13.5px] font-extrabold text-gradient-gold">
            ₹{(pricedOrder.grandTotal ?? 0).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {open && (
        <div className="relative z-[1] flex flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-black/20 p-3 pl-1.5">
          {items.map((item, i) => (
            <div key={item.productId || i} className="flex items-center justify-between gap-2 text-[10.5px]">
              <span className="min-w-0 truncate text-[#f2ece2]">
                {item.name} <span className="text-muted">× {item.quantity}</span>
              </span>
              <span className="shrink-0 font-bold text-muted">
                ₹{(item.lineTotal ?? 0).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="relative z-[1] pl-1.5">
        {isAwaiting ? (
          <button
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="btn-3d flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11.5px] font-extrabold text-black disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CircleDollarSign size={14} />}
            Confirm Payment Received
          </button>
        ) : (
          revokeAction && (
            <button
              onClick={() => setRevoking(true)}
              disabled={busy}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 py-2.5 text-[11.5px] font-extrabold text-gold disabled:opacity-60"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
              Revoke — mark Awaiting again
            </button>
          )
        )}
      </div>

      <ConfirmDeleteDialog
        open={confirming}
        title="Confirm payment received?"
        description={`Mark order ${order.orderId || order.id} as paid and move it to Confirmed. An invoice will be generated automatically.`}
        busy={busy}
        confirmLabel="Yes, Confirm Payment"
        tone="success"
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
      {revokeAction && (
        <ConfirmDeleteDialog
          open={revoking}
          title="Revoke this payment confirmation?"
          description={`Order ${order.orderId || order.id} goes back to "Awaiting Confirmation". Use this if it was approved by mistake.`}
          busy={busy}
          confirmLabel="Revoke"
          tone="warning"
          onConfirm={handleRevoke}
          onCancel={() => setRevoking(false)}
        />
      )}
    </motion.div>
  );
}
