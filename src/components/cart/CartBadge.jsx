import { motion, AnimatePresence } from 'framer-motion';

/**
 * Small pill/dot badge showing the live cart item count.
 * Bounces whenever the count changes.
 */
export default function CartBadge({ count, className = '' }) {
  if (!count) return null;

  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={count}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.4, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 480, damping: 18 }}
        className={`flex h-4 min-w-4 items-center justify-center rounded-full px-[3px] text-[9px] font-extrabold text-white ${className}`}
        style={{ background: 'linear-gradient(180deg,#ff8a5c,#e35226)', boxShadow: '0 0 6px rgba(255,87,34,.7)' }}
      >
        {count > 99 ? '99+' : count}
      </motion.span>
    </AnimatePresence>
  );
}
