import { motion } from "framer-motion";
import { MapPin, MessageCircle, CheckCheck, Layers, Loader2 } from "lucide-react";
import { getClusterAccent } from "../../utils/packingAccent";
import { formatStreetLine } from "../../utils/formatAddress";
import { openWhatsappChat } from "../../utils/whatsappChat";
import { getOrderStatusMeta } from "../../constants/orderStatusMeta";

/**
 * Every PACKED (or OUT_FOR_DELIVERY) order for ONE customer, styled to
 * match PackingClusterCard so the Delivery screen reads as the natural
 * next step after Packing rather than a different tool. Unlike packing,
 * there's no checklist here — just two actions per customer: open their
 * WhatsApp chat directly (to send the delivery photo/receipt manually),
 * and mark order(s) delivered once that's done.
 */
export default function DeliveryClusterCard({
  cluster,
  index = 0,
  delay = 0,
  markingKey,
  onMarkDelivered,
  onMarkAllDelivered,
}) {
  const accent = getClusterAccent(index);
  const isMultiOrder = cluster.orders.length > 1;

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

      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2 pl-1.5">
        <div className="min-w-0 flex items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-black"
            style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
          >
            {(cluster.customerName || "?").trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-extrabold text-[#f2ece2]">
              {cluster.customerName}
            </div>
            <div className="text-[10px] text-muted">
              {cluster.mobile} · Confirmed {cluster.earliestConfirmedLabel}
            </div>
          </div>
        </div>

        <button
          onClick={() => openWhatsappChat(cluster.mobile)}
          title="Open WhatsApp chat"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#25D366]/45 bg-[#25D366]/10 px-3 py-1.5 text-[10.5px] font-extrabold text-[#25D366]"
        >
          <MessageCircle size={12} />
          WhatsApp
        </button>
      </div>

      {cluster.address && (cluster.address.city || cluster.address.district || formatStreetLine(cluster.address)) && (
        <div className="relative z-[1] flex flex-wrap items-center gap-1.5 pl-1.5">
          <MapPin size={12} className="shrink-0 text-muted" />
          {formatStreetLine(cluster.address) && (
            <span className="text-[10.5px] text-muted">{formatStreetLine(cluster.address)}</span>
          )}
          {cluster.address.city && (
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-extrabold"
              style={{ borderColor: `${accent.solid}70`, background: `${accent.solid}22`, color: accent.solid }}
            >
              {cluster.address.city}
            </span>
          )}
          {cluster.address.district && cluster.address.district !== cluster.address.city && (
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-extrabold"
              style={{ borderColor: `${accent.solid}70`, background: `${accent.solid}22`, color: accent.solid }}
            >
              {cluster.address.district}
            </span>
          )}
        </div>
      )}

      {isMultiOrder && (
        <button
          onClick={() => onMarkAllDelivered(cluster)}
          disabled={markingKey === `cluster:${cluster.mobile}`}
          className="relative z-[1] ml-1.5 flex items-center justify-center gap-1.5 self-start rounded-full border border-[#8fe3a0]/45 bg-[#8fe3a0]/10 px-3 py-1.5 text-[10.5px] font-extrabold text-[#8fe3a0] disabled:opacity-60"
        >
          {markingKey === `cluster:${cluster.mobile}` ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Layers size={12} />
          )}
          Mark all {cluster.orders.length} delivered
        </button>
      )}

      <div className="relative z-[1] flex flex-col gap-2.5 pl-1.5">
        {cluster.orders.map((order) => {
          const orderKey = `order:${order.id}`;
          const itemCount = (order.cartItems || []).length;
          return (
            <div
              key={order.id}
              className="flex flex-col gap-2.5 rounded-xl border border-white/[0.06] bg-black/20 p-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[11.5px] font-extrabold text-[#f2ece2]">
                    {order.orderId || order.id}
                  </div>
                  <div className="text-[10px] text-muted">{getOrderStatusMeta(order.status).label}</div>
                </div>
                <div className="shrink-0 text-right text-[12.5px] font-extrabold text-gradient-gold">
                  ₹{(order.grandTotal ?? 0).toLocaleString("en-IN")}
                </div>
              </div>
              <div className="text-[10.5px] font-semibold text-muted">
                {itemCount} distinct {itemCount === 1 ? "item" : "items"}
              </div>
              <button
                onClick={() => onMarkDelivered(order)}
                disabled={markingKey === orderKey}
                className="btn-3d flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-extrabold text-black disabled:opacity-60"
              >
                {markingKey === orderKey ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCheck size={13} />
                )}
                Mark Delivered
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
