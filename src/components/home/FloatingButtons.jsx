import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../../store/useCartStore";
import { useCartPricing } from "../../hooks/useCartPricing";

/** The real WhatsApp brand glyph (phone-in-speech-bubble), traced from the
 * official mark so it actually reads as "WhatsApp" instead of a generic
 * chat-bubble icon. Rendered in white on the brand's signature green. */
function WhatsAppIcon({ size = 26 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 448 512"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
    </svg>
  );
}

export default function FloatingButtons() {
  const navigate = useNavigate();
  const count = useCartStore((s) =>
    Object.values(s.cart).reduce((a, b) => a + b, 0),
  );
  const { subtotalSale } = useCartPricing();

  // Reacts to a rocket landing (see AddToCartButton) with a quick shake +
  // bright flash, so the cart icon visibly "catches" what just flew into it.
  const [hit, setHit] = useState(false);
  useEffect(() => {
    const onBurst = () => {
      setHit(true);
      setTimeout(() => setHit(false), 420);
    };
    window.addEventListener("abs-cart-burst", onBurst);
    return () => window.removeEventListener("abs-cart-burst", onBurst);
  }, []);

  return (
    <>
      {/* WhatsApp — left side, opposite the cart button.
          NOTE: this element must keep ONLY the `fixed` positioning class.
          `fixed` already creates a positioning context, so no extra
          `relative` class is needed here. */}
      <motion.a
        href="https://wa.me/919597189599"
        target="_blank"
        rel="noreferrer"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 20 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-24 left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white"
        style={{
          background: "linear-gradient(180deg,#3ee878,#20bd5a 55%,#189649)",
          boxShadow:
            "0 1px 0 rgba(255,255,255,.5) inset, 0 -3px 6px rgba(0,0,0,.25) inset, 0 10px 22px -6px rgba(37,211,102,.55), 0 3px 6px rgba(0,0,0,.35)",
        }}
        aria-label="Chat with us on WhatsApp"
      >
        {/* breathing glow ring — quiet, on-brand attention cue */}
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: "0 0 0 2px rgba(37,211,102,.55)" }}
          animate={{ opacity: [0.9, 0, 0.9], scale: [1, 1.4, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <WhatsAppIcon size={26} />
      </motion.a>

      <AnimatePresence>
        {count > 0 && (
          <motion.button
            key="cart-fab"
            id="floating-cart-fab"
            initial={{ opacity: 0, y: 16, scale: 0.6 }}
            animate={
              hit
                ? {
                    opacity: 1,
                    y: 0,
                    scale: [1, 1.18, 0.95, 1.05, 1],
                    x: [0, -5, 5, -3, 0],
                  }
                : { opacity: 1, y: 0, scale: 1, x: 0 }
            }
            exit={{ opacity: 0, y: 16, scale: 0.6 }}
            transition={
              hit
                ? { duration: 0.42, ease: "easeOut" }
                : { type: "spring", stiffness: 420, damping: 22 }
            }
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate("/cart")}
            className="fixed bottom-24 right-4 z-40 flex items-stretch overflow-hidden rounded-2xl text-white"
            style={{
              boxShadow: hit
                ? "0 0 0 2px rgba(255,200,150,1), 0 0 26px 8px rgba(255,120,20,.9), 0 8px 20px -6px rgba(0,0,0,.7)"
                : "0 0 0 1.5px rgba(240,64,10,.5), 0 10px 22px -6px rgba(240,64,10,.55), 0 3px 6px rgba(0,0,0,.35)",
            }}
          >
            {/* idle pulse — a slow sparkler-like breathing glow behind the whole pill */}
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{ boxShadow: "0 0 0 1.5px rgba(255,122,0,.55)" }}
              animate={{ opacity: [0.7, 0, 0.7], scale: [1, 1.06, 1] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Amount readout — a small "LCD screen" showing the running
                discounted total, parallel to the item-count badge, so it's
                obvious what the cart adds up to while still adding items. */}
            <span
              className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-2"
              style={{
                background: "linear-gradient(165deg, #1a0f08, #0d0705)",
                borderRight: "1px solid rgba(255,154,0,.28)",
              }}
            >
              <span className="text-[6.5px] font-bold uppercase tracking-widest text-[#ffb87a]/70">
                Total
              </span>
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={subtotalSale}
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                  className="text-[12.5px] font-extrabold tabular-nums text-gold"
                  style={{ textShadow: "0 0 8px rgba(255,180,60,.65)" }}
                >
                  ₹{subtotalSale}
                </motion.span>
              </AnimatePresence>
            </span>

            {/* Cart icon + item count + label */}
            <span
              className="relative flex flex-col items-center gap-0.5 px-3.5 py-2.5 text-[10px] font-extrabold"
              style={{
                // Sampled from the actual shop logo (abs-logo.png) — a deep,
                // saturated red-orange — instead of the near-black tone used
                // everywhere else on the site, so this pill reads as its own
                // branded thing rather than blending into the UI.
                background:
                  "linear-gradient(160deg, #ff6a2e 0%, #f0400a 55%, #b82d06 100%)",
              }}
            >
              <span className="relative">
                <motion.span
                  animate={{ rotate: [0, -8, 8, -4, 0] }}
                  transition={{ duration: 0.5 }}
                  key={`bag-${count}`}
                  style={{ display: "inline-block" }}
                >
                  <ShoppingCart size={20} />
                </motion.span>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={count}
                    initial={{ scale: 0.3, opacity: 0, y: -6 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.3, opacity: 0, y: 6 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-[3px] text-[9px] font-extrabold text-white"
                    style={{
                      background: "linear-gradient(180deg,#ff8a5c,#e35226)",
                      boxShadow: "0 0 6px rgba(255,87,34,.7)",
                    }}
                  >
                    {count}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="tracking-wide">View Cart</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
