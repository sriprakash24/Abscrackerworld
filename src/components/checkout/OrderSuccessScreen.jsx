import { motion } from "framer-motion";
import { Copy, MessageCircleMore, Clock3, ShoppingBag, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import FestiveBackdrop from "../ui/FestiveBackdrop";
import { SHOP_INFO, SHOP_WHATSAPP_URL } from "../../constants/invoiceConstants";
import OrderStatusStepper from "./OrderStatusStepper";

// Cracker emojis that pop out of the success badge once, then fade.
const BURST = [
  { e: "🎆", x: -118, y: -54, d: 0.35, s: 30 },
  { e: "🎇", x: 118, y: -58, d: 0.42, s: 30 },
  { e: "✨", x: -84, y: 64, d: 0.5, s: 22 },
  { e: "🧨", x: 92, y: 62, d: 0.55, s: 24 },
  { e: "🪔", x: 0, y: -104, d: 0.6, s: 26 },
  { e: "🎉", x: -132, y: 6, d: 0.65, s: 22 },
  { e: "🌟", x: 134, y: 4, d: 0.7, s: 20 },
];

const fadeUp = (delay) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: "easeOut" },
});

export default function OrderSuccessScreen({
  orderId,
  grandTotal,
  orderStage = "RECEIVED",
  onContinueShopping,
  onViewOrders,
}) {
  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      toast("Order ID copied");
    } catch {
      toast("Could not copy — long press to select");
    }
  };

  // Sends a tidy confirmation message — with the order ID called out — straight
  // to the shop's WhatsApp number (SHOP_INFO.whatsapp), so the team has what
  // they need to look the order up right away.
  const messageOnWhatsapp = () => {
    const lines = [
      `Hi! I've just placed an order on ${SHOP_INFO.name}.`,
      "",
      `Order ID: *${orderId}*`,
      typeof grandTotal === "number" ? `Amount: ₹${grandTotal.toLocaleString("en-IN")}` : null,
    ].filter(Boolean);
    window.open(
      `${SHOP_WHATSAPP_URL}?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="relative flex min-h-[85vh] w-full flex-col items-center overflow-hidden px-5 pb-10 pt-[68px] text-center">
      <FestiveBackdrop />

      {/* Success badge + one-shot cracker burst */}
      <div className="relative flex h-28 w-28 items-center justify-center">
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-2 border-coral"
            initial={{ scale: 0.6, opacity: 0.55 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ delay: 0.25 + i * 0.35, duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        ))}

        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 12, stiffness: 180 }}
          className="relative flex h-24 w-24 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(135deg,#ff8a65 0%,#f04452 100%)",
            boxShadow: "0 14px 30px -10px rgba(240,68,82,.6), 0 0 0 6px rgba(255,212,175,.7)",
          }}
        >
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
            />
          </svg>
        </motion.div>

        {BURST.map((b) => (
          <motion.span
            key={b.e + b.x}
            aria-hidden="true"
            className="pointer-events-none absolute select-none"
            style={{ fontSize: b.s }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{ x: b.x, y: b.y, scale: [0, 1.25, 1], opacity: [0, 1, 1] }}
            transition={{ delay: b.d, duration: 0.7, ease: "easeOut" }}
          >
            {b.e}
          </motion.span>
        ))}
      </div>

      <motion.h1
        {...fadeUp(0.2)}
        className="relative z-10 mt-6 text-[22px] font-extrabold leading-tight text-brown"
      >
        Order Placed <span className="text-gradient-gold">Successfully!</span>
      </motion.h1>

      <motion.p
        {...fadeUp(0.3)}
        className="relative z-10 mt-2 max-w-[280px] text-[13px] font-medium leading-relaxed text-muted"
      >
        Thank you for shopping with <span className="font-bold text-brown">ABS Crackers World</span>.
        Have a bright &amp; safe Deepavali! 🎇
      </motion.p>

      {/* Order details */}
      <motion.div
        {...fadeUp(0.4)}
        className="surface-3d relative z-10 mt-5 w-full max-w-[340px] rounded-2xl px-4 py-3.5 text-left"
      >
        <div className="flex items-center justify-between gap-3 text-[11.5px]">
          <span className="font-semibold text-muted">Order ID</span>
          <button
            onClick={copyOrderId}
            className="flex items-center gap-1.5 rounded-lg bg-peach-light px-2 py-1 text-[12px] font-extrabold tracking-wide text-brown"
            aria-label="Copy order ID"
          >
            {orderId}
            <Copy size={12} className="text-coral" />
          </button>
        </div>

        {typeof grandTotal === "number" && (
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-peach pt-3 text-[11.5px]">
            <span className="font-semibold text-muted">Order Amount</span>
            <span className="text-[19px] font-extrabold text-red">₹{grandTotal.toLocaleString("en-IN")}</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-dashed border-peach pt-3 text-[11.5px]">
          <span className="font-semibold text-muted">Status</span>
          <span className="flex items-center gap-1.5 rounded-full border border-gold-bright/60 bg-gold-bright/15 px-2.5 py-1 text-[10.5px] font-bold text-gold">
            <Clock3 size={11} />
            Awaiting Confirmation
          </span>
        </div>
      </motion.div>

      {/* What happens next */}
      <motion.div
        {...fadeUp(0.5)}
        className="relative z-10 mt-3 flex w-full max-w-[340px] items-start gap-3 rounded-2xl border border-peach bg-white/80 px-3.5 py-3.5 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-peach text-red">
          <MessageCircleMore size={17} />
        </span>
        <p className="text-[11.5px] leading-relaxed text-muted">
          <span className="font-extrabold text-brown">Payment on confirmation — </span>
          our team will call or WhatsApp you shortly to confirm your order and guide you through payment.
          Your status updates here automatically once payment is confirmed.
        </p>
      </motion.div>

      <OrderStatusStepper currentStageId={orderStage} delay={0.6} />

      {/* Actions */}
      <motion.div
        {...fadeUp(0.7)}
        className="relative z-10 mt-6 flex w-full max-w-[340px] flex-col gap-2.5"
      >
        <button
          onClick={messageOnWhatsapp}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[13px] font-extrabold text-white transition-transform active:scale-[0.98]"
          style={{
            background: "linear-gradient(180deg,#2fce5f,#1fa64d)",
            boxShadow: "0 10px 20px -10px rgba(31,166,77,.7)",
          }}
        >
          <MessageCircleMore size={17} />
          Message Us on WhatsApp
        </button>
        <button
          onClick={onContinueShopping}
          className="btn-3d flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[13px] font-extrabold text-white"
        >
          <ShoppingBag size={16} />
          Continue Shopping
        </button>
        <button
          onClick={onViewOrders}
          className="btn-3d-outline flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[12.5px] font-bold text-brown"
        >
          <ClipboardList size={15} />
          View My Orders
        </button>
      </motion.div>
    </div>
  );
}
