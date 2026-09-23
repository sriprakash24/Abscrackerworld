import { motion } from "framer-motion";
import { MapPin, MessageCircle, Layers, Loader2, Undo2 } from "lucide-react";
import { getClusterAccent } from "../../utils/packingAccent";
import { formatStreetLine } from "../../utils/formatAddress";
import { openWhatsappChat } from "../../utils/whatsappChat";
import { getOrderStatusMeta } from "../../constants/orderStatusMeta";

/**
 * Every order at ONE delivery stage for ONE customer. Used for both tabs
 * on the Delivery page — "Ready to Dispatch" (PACKED -> OUT_FOR_DELIVERY)
 * and "Out for Delivery" (OUT_FOR_DELIVERY -> DELIVERED, which here means
 * "handed off to the transport office", not "in the customer's hands") —
 * so the action label/icon and the revoke target are passed in rather than
 * hardcoded, instead of building two near-identical components.
 */
export default function DeliveryClusterCard({
  cluster,
  index = 0,
  delay = 0,
  actionLabel,
  actionIcon: ActionIcon,
  markingKey,
  onAction,
  onActionAll,
  revokeLabel,
  revokingKey,
  onRevoke,
  onRevokeAll,
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
        <div className="relative z-[1] ml-1.5 flex flex-wrap items-center gap-2">
          {onActionAll && (
            <button
              onClick={() => onActionAll(cluster)}
              disabled={markingKey === `cluster:${cluster.mobile}`}
              className="flex items-center justify-center gap-1.5 self-start rounded-full border border-[#8fe3a0]/45 bg-[#8fe3a0]/10 px-3 py-1.5 text-[10.5px] font-extrabold text-[#8fe3a0] disabled:opacity-60"
            >
              {markingKey === `cluster:${cluster.mobile}` ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Layers size={12} />
              )}
              {actionLabel} all {cluster.orders.length}
            </button>
          )}
          {onRevokeAll && (
            <button
              onClick={() => onRevokeAll(cluster)}
              disabled={revokingKey === `cluster:${cluster.mobile}`}
              title={revokeLabel}
              className="flex items-center justify-center gap-1.5 self-start rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[10.5px] font-extrabold text-gold disabled:opacity-60"
            >
              {revokingKey === `cluster:${cluster.mobile}` ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Undo2 size={12} />
              )}
              Revoke all
            </button>
          )}
        </div>
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
              <div className="flex items-center gap-2">
                {onAction && (
                  <button
                    onClick={() => onAction(order)}
                    disabled={markingKey === orderKey}
                    className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-extrabold text-black disabled:opacity-60"
                  >
                    {markingKey === orderKey ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      ActionIcon && <ActionIcon size={13} />
                    )}
                    {actionLabel}
                  </button>
                )}
                {onRevoke && (
                  <button
                    onClick={() => onRevoke(order)}
                    disabled={revokingKey === orderKey}
                    title={revokeLabel}
                    className={
                      onAction
                        ? "orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-gold disabled:opacity-60"
                        : "flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 py-2.5 text-[11px] font-extrabold text-gold disabled:opacity-60"
                    }
                  >
                    {revokingKey === orderKey ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Undo2 size={13} />
                    )}
                    {!onAction && (revokeLabel || "Revoke")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
