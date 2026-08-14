import { motion, AnimatePresence } from 'framer-motion';
import EmberParticles from '../ui/EmberParticles';
import splashBg from '../../assets/splash-bg.png';

export default function SplashScreen({ visible, onSkip }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[999] mx-auto max-w-[430px] overflow-hidden bg-[#150007]"
          exit={{ opacity: 0, transition: { duration: 1, ease: 'easeInOut' } }}
        >
          <motion.img
            src={splashBg}
            alt="Welcome to ABS Crackers World — Festival Fireworks Store"
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ scale: 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />

          {/* subtle floating embers layered on top for extra life */}
          <EmberParticles count={16} />

          {/* soft vignette so the image blends into the app chrome */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)',
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050403] to-transparent" />

          {/* Skip button — bottom of the screen, in the logo's orange so
              it reads as an intentional call-to-action rather than a
              stray UI element on top of the artwork. Lets anyone who's
              seen the intro before jump straight to the store instead of
              waiting out the full splash. */}
          <motion.button
            type="button"
            onClick={onSkip}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5, ease: 'easeOut' }}
            whileTap={{ scale: 0.95 }}
            className="absolute inset-x-0 bottom-9 z-10 mx-auto flex w-fit items-center gap-1.5 rounded-full px-5 py-2.5 text-[12.5px] font-bold tracking-wide text-white"
            style={{
              background: 'linear-gradient(180deg,#ff8a3c,#e8500f)',
              boxShadow:
                '0 1px 0 rgba(255,255,255,.35) inset, 0 8px 20px -6px rgba(232,80,15,.65), 0 0 16px rgba(255,122,0,.4)',
            }}
          >
            Continue to ABS
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
