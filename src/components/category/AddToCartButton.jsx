import { useState } from "react";
import { createPortal } from "react-dom";
import { ShoppingBag, Loader2, Rocket, Check } from "lucide-react";
import { Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "../../utils/cn";

const CRACKER_COLORS = [
  "#ffd23f",
  "#ff9a2e",
  "#ff5a36",
  "#ffe89b",
  "#ff3d1a",
  "#fff1c2",
];

function getCartTarget() {
  const cartEl = document.getElementById("floating-cart-fab");
  if (cartEl) {
    const r = cartEl.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return { x: window.innerWidth - 44, y: window.innerHeight - 124 };
}

/** A radial shower of cracker sparks — used both where the user tapped
 * (the "lit fuse" moment) and again where the rocket lands in the cart
 * (the payoff). Bigger and punchier than a generic ripple. */
function SparkBurst({ x, y, count = 14, big = false }) {
  const particles = Array.from({ length: count }).map((_, i) => {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const dist = (big ? 34 : 24) + Math.random() * (big ? 26 : 16);
    return {
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      color: CRACKER_COLORS[i % CRACKER_COLORS.length],
      size: big ? 4 + Math.random() * 3 : 3 + Math.random() * 2,
    };
  });

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {/* flash ring — the "bang" */}
      <motion.span
        initial={{ opacity: 0.9, scale: 0.2 }}
        animate={{ opacity: 0, scale: big ? 2.6 : 1.8 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        style={{
          position: "absolute",
          left: -20,
          top: -20,
          width: 40,
          height: 40,
          borderRadius: "9999px",
          background:
            "radial-gradient(circle, rgba(255,220,150,.9), rgba(255,120,20,.3) 60%, transparent 75%)",
        }}
      />
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.dx, y: p.dy, scale: 0.2 }}
          transition={{ duration: 0.5 + Math.random() * 0.2, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            borderRadius: "9999px",
            background: p.color,
            boxShadow: `0 0 6px ${p.color}`,
          }}
        />
      ))}
    </div>,
    document.body,
  );
}

/** Launches a little rocket from the tapped button up and into the floating
 * cart icon, leaning into its flight direction with a fading exhaust trail,
 * then hands off to a landing SparkBurst + cart-shake when it arrives. */
function RocketToCart({ from, onArrive }) {
  const target = getCartTarget();
  const margin = 24;
  const clampY = (v) =>
    Math.min(window.innerHeight - margin, Math.max(margin, v));
  const clampX = (v) =>
    Math.min(window.innerWidth - margin, Math.max(margin, v));

  const midX = clampX((from.x + target.x) / 2 + (target.x > from.x ? 24 : -24));
  // Modest arc — enough to read as a "launch" without leaving the screen.
  const midY = clampY(Math.min(from.y, target.y) - 55);

  const angleTo = (ax, ay, bx, by) =>
    (Math.atan2(by - ay, bx - ax) * 180) / Math.PI + 90;
  const rot1 = angleTo(from.x, from.y, midX, midY);
  const rot2 = angleTo(midX, midY, target.x, target.y);

  const trail = [1, 2, 3, 4].map((i) => ({ id: i, delay: i * 0.045 }));

  return createPortal(
    <>
      {trail.map((t) => (
        <motion.div
          key={t.id}
          initial={{ left: from.x, top: from.y, opacity: 0.55, scale: 1 }}
          animate={{
            left: [from.x, midX, target.x],
            top: [from.y, midY, target.y],
            opacity: 0,
            scale: 0.3,
          }}
          transition={{
            duration: 0.55,
            delay: t.delay,
            times: [0, 0.45, 1],
            ease: "easeInOut",
          }}
          style={{
            position: "fixed",
            zIndex: 9998,
            pointerEvents: "none",
            width: 8,
            height: 8,
            marginLeft: -4,
            marginTop: -4,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, #ffd23f, #ff5a36 70%, transparent)",
          }}
        />
      ))}

      <motion.div
        initial={{
          left: from.x,
          top: from.y,
          opacity: 1,
          scale: 0.6,
          rotate: rot1,
        }}
        animate={{
          left: [from.x, midX, target.x],
          top: [from.y, midY, target.y],
          scale: [0.6, 1, 0.3],
          rotate: [rot1, rot1, rot2],
          opacity: [1, 1, 0.6],
        }}
        transition={{ duration: 0.65, times: [0, 0.45, 1], ease: "easeInOut" }}
        onAnimationComplete={onArrive}
        style={{
          position: "fixed",
          zIndex: 9999,
          pointerEvents: "none",
          width: 30,
          height: 30,
          marginLeft: -15,
          marginTop: -15,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "9999px",
          background: "linear-gradient(180deg,#ff9a2e,#e35226)",
          boxShadow: "0 4px 14px -2px rgba(227,82,38,.8)",
          color: "#fff",
        }}
      >
        <Rocket size={16} fill="currentColor" fillOpacity={0.15} />
      </motion.div>
    </>,
    document.body,
  );
}

export default function AddToCartButton({
  inCart,
  disabled,
  maxQty = 99,
  productName = "Item",
  onAdd,
  onIncrement,
  onDecrement,
}) {
  const [loading, setLoading] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [launchBursts, setLaunchBursts] = useState([]);
  const [rockets, setRockets] = useState([]);
  const [landingBursts, setLandingBursts] = useState([]);

  const atMax = inCart >= maxQty;

  const triggerLaunch = (e) => {
    const originX = e.clientX;
    const originY = e.clientY;
    const id = Date.now() + Math.random();

    // 1. The "lit fuse" bang right where the user tapped.
    setLaunchBursts((prev) => [...prev, { id, x: originX, y: originY }]);
    setTimeout(
      () => setLaunchBursts((prev) => prev.filter((b) => b.id !== id)),
      650,
    );

    // 2. Rocket flies from the tap point into the real cart icon.
    const rocketId = `rocket-${id}`;
    setRockets((prev) => [
      ...prev,
      { id: rocketId, from: { x: originX, y: originY } },
    ]);
  };

  const handleAddClick = (e) => {
    if (disabled || loading) return;
    triggerLaunch(e);

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setJustAdded(true);
      onAdd?.();
      setTimeout(() => setJustAdded(false), 650);
    }, 320);
  };

  const handleRocketArrive = (rocketId) => {
    setRockets((prev) => prev.filter((r) => r.id !== rocketId));
    // 3. Landing burst right at the cart, plus tell the cart to flash/shake.
    const target = getCartTarget();
    const burstId = `land-${rocketId}`;
    setLandingBursts((prev) => [
      ...prev,
      { id: burstId, x: target.x, y: target.y },
    ]);
    setTimeout(
      () => setLandingBursts((prev) => prev.filter((b) => b.id !== burstId)),
      650,
    );
    window.dispatchEvent(new CustomEvent("abs-cart-burst"));
  };

  // Every "+" tap on an item already in the cart replays the same launch —
  // not just the very first Add — so repeat taps keep pointing back at the cart.
  const handleIncrement = (e) => {
    if (atMax) {
      toast(`Only ${maxQty} in stock for ${productName}`);
      return;
    }
    triggerLaunch(e);
    onIncrement?.();
  };

  const flightOverlay = (
    <>
      {launchBursts.map((b) => (
        <SparkBurst key={b.id} x={b.x} y={b.y} count={12} />
      ))}
      {rockets.map((r) => (
        <RocketToCart
          key={r.id}
          from={r.from}
          onArrive={() => handleRocketArrive(r.id)}
        />
      ))}
      {landingBursts.map((b) => (
        <SparkBurst key={b.id} x={b.x} y={b.y} count={16} big />
      ))}
    </>
  );

  // --- Quantity stepper mode (already in cart) ---
  if (inCart > 0) {
    return (
      <>
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 26 }}
          className={cn(
            "btn-3d mt-2 flex items-center justify-between rounded-lg px-1.5 py-1.5",
            disabled && "cursor-not-allowed opacity-40 grayscale",
          )}
        >
          <button
            onClick={onDecrement}
            disabled={disabled}
            aria-label="Decrease quantity"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/20 text-white transition-transform active:scale-90"
          >
            <Minus size={12} strokeWidth={2.6} />
          </button>

          <AnimatePresence mode="popLayout">
            <motion.span
              key={inCart}
              initial={{ scale: 0.4, opacity: 0, y: -6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.4, opacity: 0, y: 6 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="text-[12px] font-extrabold text-white"
            >
              {inCart}
            </motion.span>
          </AnimatePresence>

          <button
            onClick={handleIncrement}
            disabled={disabled || atMax}
            aria-label="Increase quantity"
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/20 text-white transition-transform active:scale-90",
              atMax && "opacity-40",
            )}
          >
            <Plus size={12} strokeWidth={2.6} />
          </button>
        </motion.div>
        {flightOverlay}
      </>
    );
  }

  // --- Add mode (not yet in cart) ---
  return (
    <motion.button
      layout
      onClick={handleAddClick}
      disabled={disabled}
      whileTap={!disabled ? { scale: 0.94 } : {}}
      animate={justAdded ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "btn-3d relative mt-2 flex items-center justify-center gap-1.5 overflow-hidden rounded-lg py-1.5 text-[11px] font-bold text-white transition-[filter]",
        disabled && "cursor-not-allowed opacity-40 grayscale",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5"
          >
            <Loader2 size={13} className="animate-spin" /> Adding
          </motion.span>
        ) : justAdded ? (
          <motion.span
            key="added"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex items-center gap-1.5"
          >
            <Check size={13} strokeWidth={3} /> Added
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5"
          >
            <ShoppingBag size={13} /> {disabled ? "Sold Out" : "Add"}
          </motion.span>
        )}
      </AnimatePresence>

      {flightOverlay}
    </motion.button>
  );
}
