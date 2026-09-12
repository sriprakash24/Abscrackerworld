import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function QuantityStepper({
  qty,
  onIncrement,
  onDecrement,
  onSetQuantity,
  atMin,
  atMax,
  disabled,
  maxQty = 99,
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const clampQty = (n) => Math.max(1, Math.min(Math.round(n) || 1, maxQty));

  const startEditing = () => {
    if (disabled || !onSetQuantity) return;
    setEditValue(String(qty));
    setEditing(true);
  };

  const commitEditing = () => {
    if (editValue !== '') {
      const clamped = clampQty(Number(editValue));
      if (clamped !== qty) onSetQuantity(clamped);
    }
    setEditing(false);
  };

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

      {/* Tapping the number turns it into a real input — typing an exact
          quantity is one write instead of repeated "+" taps. */}
      {editing ? (
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.replace(/[^\d]/g, ''))}
          onBlur={commitEditing}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          onFocus={(e) => e.currentTarget.select()}
          className="h-5 w-8 shrink-0 bg-transparent text-center text-[13px] font-extrabold text-[#f2ece2] outline-none"
          aria-label="Edit quantity"
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          disabled={disabled}
          aria-label="Edit quantity"
          className="relative flex h-5 w-6 shrink-0 items-center justify-center overflow-hidden"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={qty}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={cn(
                'absolute text-[13px] font-extrabold text-[#f2ece2]',
                onSetQuantity && 'underline decoration-white/30 decoration-dotted underline-offset-2'
              )}
            >
              {qty}
            </motion.span>
          </AnimatePresence>
        </button>
      )}

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
