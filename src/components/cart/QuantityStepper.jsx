import { Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function QuantityStepper({ qty, onIncrement, onDecrement, atMin, atMax, disabled }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-full px-1.5 py-1.5',
        'border border-[rgba(255,154,0,.28)] bg-[rgba(10,7,5,.55)]'
      )}
    >
      <button
        onClick={onDecrement}
        disabled={disabled || atMin}
        aria-label="Decrease quantity"
        className={cn(
          'orb-3d flex h-7 w-7 shrink-0 items-center justify-center !rounded-full text-orange transition-transform active:scale-90',
          (disabled || atMin) && 'cursor-not-allowed opacity-35 grayscale'
        )}
      >
        <Minus size={14} strokeWidth={2.6} />
      </button>

      <div className="relative flex h-5 w-6 items-center justify-center overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={qty}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute text-[13px] font-extrabold text-[#f2ece2]"
          >
            {qty}
          </motion.span>
        </AnimatePresence>
      </div>

      <button
        onClick={onIncrement}
        disabled={disabled || atMax}
        aria-label="Increase quantity"
        className={cn(
          'orb-3d flex h-7 w-7 shrink-0 items-center justify-center !rounded-full text-orange transition-transform active:scale-90',
          (disabled || atMax) && 'cursor-not-allowed opacity-35 grayscale'
        )}
      >
        <Plus size={14} strokeWidth={2.6} />
      </button>
    </div>
  );
}
