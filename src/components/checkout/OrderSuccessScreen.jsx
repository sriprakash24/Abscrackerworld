import { motion } from "framer-motion";
import * as LottieModule from "lottie-react";
import { Copy, MessageCircleMore } from "lucide-react";
import { toast } from "sonner";
import EmberParticles from "../ui/EmberParticles";
import FestiveBackdrop from "../ui/FestiveBackdrop";
import FireworkBurst from "../ui/FireworkBurst";
import OrderStatusStepper from "./OrderStatusStepper";
import successBurst from "../../assets/lottie/orderSuccessBurst.json";
import heroArt from "../../assets/order-success-hero.png";

// This project's bundler double-wraps lottie-react's CJS export: the
// namespace's `.default` holds the raw `module.exports` object rather than
// the component itself, and that object *also* has a `.default` (since the
// package does `exports.default = Lottie`). Unwrap `.default` until we
// land on an actual function — this is what was causing the render crash.
let Lottie = LottieModule;
for (let i = 0; i < 3 && Lottie && typeof Lottie !== "function"; i++) {
  Lottie = Lottie.default;
}

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

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 py-10 text-center">
      <FestiveBackdrop />
      <EmberParticles count={14} className="opacity-40" />
      <FireworkBurst
        size={130}
        className="left-2 top-8 opacity-70"
        delay={0}
        color="gold"
      />
      <FireworkBurst
        size={100}
        className="right-2 top-24 opacity-60"
        delay={0.5}
        color="orange"
      />
      <FireworkBurst
        size={90}
        className="bottom-16 left-8 opacity-50"
        delay={1}
        color="gold"
      />

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        className="relative z-10 h-44 w-44"
      >
        {/* Confetti burst plays once behind the branded artwork */}
        <Lottie
          animationData={successBurst}
          loop={false}
          className="pointer-events-none absolute inset-0 h-full w-full scale-125 opacity-80"
        />
        <img
          src={heroArt}
          alt=""
          className="art-float relative z-10 h-full w-full object-contain"
        />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-embossed relative z-10 mt-4 text-[20px] font-extrabold uppercase leading-snug tracking-wide text-gradient-gold"
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
        className="relative z-10 mt-5 max-w-xs text-[11.5px] leading-relaxed text-[#cfc7bd]"
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
