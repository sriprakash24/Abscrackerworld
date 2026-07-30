import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import FireworkBurst from '../ui/FireworkBurst';
import EmberParticles from '../ui/EmberParticles';

export default function EmptyCart() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-8 text-center">
      <EmberParticles count={14} className="opacity-40" />
      <FireworkBurst size={130} className="left-4 top-8 opacity-50" delay={0.3} />
      <FireworkBurst size={100} className="right-2 top-24 opacity-40" delay={1.2} color="orange" />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="orb-3d relative z-10 flex h-28 w-28 items-center justify-center !rounded-full text-[52px]"
      >
        <span className="art-float">🎇</span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        className="text-embossed relative z-10 mt-5 text-[16px] font-extrabold text-[#f2ece2]"
      >
        Your cart is empty
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
        className="relative z-10 mt-1.5 max-w-[240px] text-[12px] leading-snug text-muted"
      >
        Your cart is waiting for some fireworks. Add a few crackers and let the celebrations begin.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
        onClick={() => navigate('/')}
        className="btn-3d relative z-10 mt-6 flex items-center gap-2 rounded-xl px-7 py-3 text-[12.5px] font-bold text-white"
      >
        <ShoppingBag size={16} />
        Continue Shopping
      </motion.button>
    </div>
  );
}
