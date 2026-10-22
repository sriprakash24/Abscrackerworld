import { motion, AnimatePresence } from 'framer-motion';
import EmberParticles from '../ui/EmberParticles';
import splashBg from '../../assets/splash-bg.jpg';

// The splash artwork already has the "Continue to ABS →" button painted into
// it, so we don't draw a second one on top. Instead the whole screen is the
// tap target (plus a visually-hidden button for keyboard / screen readers).
export default function SplashScreen({ visible, onSkip }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[999] mx-auto max-w-[430px] cursor-pointer overflow-hidden bg-bg"
          exit={{ opacity: 0, transition: { duration: 1, ease: 'easeInOut' } }}
          onClick={onSkip}
        >
          <motion.img
            src={splashBg}
            alt="Welcome to ABS Crackers World — Celebrate this Deepavali with our special combos"
            className="absolute inset-0 h-full w-full object-cover object-bottom"
            draggable={false}
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />

          {/* a few soft golden embers drifting up, matches the light artwork */}
          <EmberParticles count={12} className="opacity-70" />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            className="sr-only"
          >
            Continue to ABS
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
