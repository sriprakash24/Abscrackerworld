import { ShoppingCart, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/useCartStore';

/** The standard WhatsApp glyph (phone-in-speech-bubble) — lucide has no
 * brand icons, so this is a small inline SVG rendered at the same size
 * MessageCircle was, filled with currentColor to match the button's style. */
function WhatsAppIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14a1.65 1.65 0 0 1-1.15.83c-.31.06-.7.11-2.03-.42-1.71-.68-2.82-2.42-2.9-2.53-.09-.11-.7-.93-.7-1.78 0-.84.44-1.26.6-1.43a.63.63 0 0 1 .46-.22h.33c.11 0 .25 0 .38.29.16.35.53 1.19.58 1.28.05.09.08.19.02.31-.06.11-.09.19-.18.29-.09.11-.19.24-.27.32-.09.09-.18.19-.08.37.11.19.48.79 1.03 1.28.71.63 1.31.83 1.5.92.19.09.3.08.42-.05.11-.13.48-.56.61-.75.13-.19.26-.16.44-.1.19.07 1.17.55 1.37.65.19.1.32.14.37.23.05.09.05.5-.11.98Z" />
    </svg>
  );
}

export default function FloatingButtons() {
  const navigate = useNavigate();
  const count = useCartStore((s) => Object.values(s.cart).reduce((a, b) => a + b, 0));

  return (
    <>
      {/* Explore Category — left side */}
      <button
        onClick={() => navigate('/', { state: { scrollTo: 'categories' } })}
        className="fixed bottom-24 left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white transition-transform active:scale-90"
        style={{
          background: 'radial-gradient(circle at 40% 25%, #2a1c10, #100b07 65%, #060403 100%)',
          boxShadow:
            '0 0 0 1.5px rgba(255,122,0,.7), 0 0 14px 2px rgba(255,122,0,.6), 0 0 26px 6px rgba(255,122,0,.3), 0 8px 20px -6px rgba(0,0,0,.7)',
        }}
        aria-label="Explore categories"
      >
        <Compass size={24} strokeWidth={2} className="text-orange" />
      </button>

      {/* WhatsApp — right side, stacked above the cart button */}
      <a
        href="https://wa.me/910000000000"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-[9.5rem] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white transition-transform active:scale-90"
        style={{
          background: 'linear-gradient(180deg,#3ee878,#20bd5a 55%,#189649)',
          boxShadow:
            '0 1px 0 rgba(255,255,255,.5) inset, 0 -3px 6px rgba(0,0,0,.25) inset, 0 10px 22px -6px rgba(37,211,102,.55), 0 3px 6px rgba(0,0,0,.35)',
        }}
      >
        <WhatsAppIcon size={26} />
      </a>

      <AnimatePresence>
        {count > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            onClick={() => navigate('/cart')}
            className="fixed bottom-24 right-4 z-40 flex flex-col items-center gap-0.5 rounded-2xl px-3.5 py-2.5 text-[10px] font-extrabold text-white"
            style={{
              background: 'radial-gradient(circle at 40% 25%, #1c1611, #0a0705)',
              boxShadow:
                '0 0 0 1.5px rgba(255,122,0,.7), 0 0 14px 2px rgba(255,122,0,.6), 0 0 26px 6px rgba(255,122,0,.3), 0 8px 20px -6px rgba(0,0,0,.7)',
            }}
          >
            <span className="relative">
              <ShoppingCart size={20} />
              <span
                className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-[3px] text-[9px] font-extrabold text-white"
                style={{ background: 'linear-gradient(180deg,#ff8a5c,#e35226)', boxShadow: '0 0 6px rgba(255,87,34,.7)' }}
              >
                {count}
              </span>
            </span>
            <span className="tracking-wide">View Cart</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
