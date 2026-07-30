import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';

/**
 * Large premium CTA. Renders an expanding ripple from the tap point,
 * swaps to a spinner while submitting, and disables itself while
 * loading or before Terms & Conditions are accepted (guards against
 * duplicate submissions).
 */
export default function PlaceOrderButton({ disabled, loading, grandTotal }) {
  const [ripples, setRipples] = useState([]);

  const handlePointerDown = (e) => {
    if (disabled || loading) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    const ripple = { id, x: e.clientX - rect.left, y: e.clientY - rect.top };
    setRipples((r) => [...r, ripple]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 650);
  };

  return (
    <div className="sticky bottom-0 z-30 px-4 pb-4 pt-3">
      <div
        className="panel-3d rounded-2xl p-2.5"
        style={{ background: 'linear-gradient(180deg, rgba(5,5,5,0) 0%, rgba(5,5,5,0.92) 40%)' }}
      >
        <button
          type="submit"
          onPointerDown={handlePointerDown}
          disabled={disabled || loading}
          className={`btn-3d relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 text-[13.5px] font-extrabold tracking-wide text-black transition-opacity ${
            disabled || loading ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {ripples.map((r) => (
            <motion.span
              key={r.id}
              initial={{ width: 0, height: 0, opacity: 0.45 }}
              animate={{ width: 340, height: 340, opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              className="pointer-events-none absolute rounded-full bg-white"
              style={{ left: r.x, top: r.y, translate: '-50% -50%' }}
            />
          ))}

          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Placing Order...
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              Place Order · ₹{grandTotal}
            </>
          )}
        </button>

        <p className="mt-2 text-center text-[9.5px] font-semibold text-muted">
          No payment now — our team confirms and collects payment after your order is placed.
        </p>
      </div>
    </div>
  );
}
