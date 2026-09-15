import { motion } from "framer-motion";
import { Copy, MessageCircleMore } from "lucide-react";
import { toast } from "sonner";
import EmberParticles from "../ui/EmberParticles";
import FestiveBackdrop from "../ui/FestiveBackdrop";
import { SHOP_INFO } from "../../constants/invoiceConstants";
import OrderStatusStepper from "./OrderStatusStepper";
import heroArt from "../../assets/order-success-hero.png";

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
  // to the shop's WhatsApp number, so the team has what they need to look the
  // order up right away.
  const messageOnWhatsapp = () => {
    const lines = [
      `Hi! I've just placed an order on ${SHOP_INFO.name}.`,
      '',
      `Order ID: *${orderId}*`,
      typeof grandTotal === "number" ? `Amount: ₹${grandTotal.toLocaleString("en-IN")}` : null,
    ].filter(Boolean);
    const text = encodeURIComponent(lines.join("\n"));
    const mobileDigits = SHOP_INFO.whatsapp.replace(/\D/g, "").slice(-10);
    window.open(`https://wa.me/91${mobileDigits}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 py-10 text-center">
      <FestiveBackdrop />
      <EmberParticles count={10} className="opacity-25" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 h-32 w-32"
      >
        <img
          src={heroArt}
          alt=""
          className="relative z-10 h-full w-full object-contain"
        />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="text-embossed relative z-10 mt-4 text-[19px] font-extrabold uppercase leading-snug tracking-wide text-gradient-gold"
      >
        Order Placed Successfully!
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="surface-3d relative z-10 mt-5 w-full max-w-xs rounded-2xl px-4 py-3.5"
      >
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted">Order ID</span>
          <button
            onClick={copyOrderId}
            className="flex items-center gap-1 font-extrabold text-gold"
            aria-label="Copy order ID"
          >
            {orderId}
            <Copy size={11} />
          </button>
        </div>
        {typeof grandTotal === "number" && (
          <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-white/15 pt-2.5 text-[11px]">
            <span className="text-muted">Order Amount</span>
            <span className="text-embossed text-[15px] font-extrabold text-gradient-gold">
              ₹{grandTotal.toLocaleString("en-IN")}
            </span>
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-white/15 pt-2.5 text-[11px]">
          <span className="text-muted">Current Status</span>
          <span className="flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">
            🟡 Awaiting Admin Confirmation
          </span>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        className="relative z-10 mt-5 max-w-xs text-[15px] font-medium leading-relaxed text-[#cfc7bd]"
      >
        Thank you for shopping with{" "}
        <span className="font-bold text-[#f2ece2]">ABS Crackers World</span>.
        Your order has been placed successfully.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65, duration: 0.4 }}
        className="surface-3d surface-3d-open relative z-10 mt-3 flex max-w-xs items-start gap-2.5 rounded-xl px-3.5 py-3.5 text-left"
      >
        <span className="orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-full text-orange">
          <MessageCircleMore size={15} />
        </span>
        <p className="text-[10.5px] leading-relaxed text-[#cfc7bd]">
          <span className="font-bold text-gold">Payment on confirmation —</span>{" "}
          our team will call or WhatsApp you shortly to confirm your order and
          guide you through payment. Your status updates automatically once
          payment is confirmed.
        </p>
      </motion.div>

      {/* Order lifecycle: Order Received -> We'll Contact You -> Payment & Confirmation -> Packed & Delivered.
          Swap `orderStage` for a live Firestore field once admin status updates are wired in. */}
      <OrderStatusStepper currentStageId={orderStage} delay={0.7} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, duration: 0.4 }}
        className="relative z-10 mt-6 flex w-full max-w-xs flex-col gap-2.5"
      >
        <button
          onClick={messageOnWhatsapp}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-[12px] font-extrabold text-white"
          style={{ background: 'linear-gradient(180deg,#2fce5f,#1fa64d)', boxShadow: '0 8px 18px -8px rgba(31,166,77,.6)' }}
        >
          <MessageCircleMore size={15} />
          Message Us on WhatsApp
        </button>
        <button
          onClick={onContinueShopping}
          className="btn-3d w-full rounded-xl py-3 text-[12.5px] font-extrabold text-black"
        >
          Continue Shopping
        </button>
        <button
          onClick={onViewOrders}
          className="btn-3d-outline w-full rounded-xl py-3 text-[12px] font-bold text-gold"
        >
          View My Orders
        </button>
      </motion.div>
    </div>
  );
}
