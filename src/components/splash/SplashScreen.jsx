import { motion, AnimatePresence } from 'framer-motion';
import EmberParticles from '../ui/EmberParticles';
import splashBg from '../../assets/splash-bg.png';

export default function SplashScreen({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[999] mx-auto max-w-[430px] overflow-hidden bg-[#050403]"
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
