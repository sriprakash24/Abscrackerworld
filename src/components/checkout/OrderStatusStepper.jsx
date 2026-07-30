import { motion } from 'framer-motion';
import { ShieldCheck, Headphones, CreditCard, Gift, Check } from 'lucide-react';
import { ORDER_STAGE_IDS, ORDER_STAGE_LABELS } from '../../constants/orderStages';

const STAGE_ICONS = {
  RECEIVED: ShieldCheck,
  CONTACT: Headphones,
  PAYMENT: CreditCard,
  DELIVERED: Gift,
};

/**
 * Premium animated status strip: completed steps glow + scale in with a
 * check, the current step gets a breathing orange glow, future steps sit
 * quiet and grey. Connecting dashed lines light up as progress advances.
 */
export default function OrderStatusStepper({ currentStageId = 'CONTACT', delay = 0.7 }) {
  const currentIndex = Math.max(0, ORDER_STAGE_IDS.indexOf(currentStageId));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="surface-3d relative z-10 mt-4 w-full max-w-xs rounded-2xl px-3 py-4"
    >
      <div className="flex items-start justify-between">
        {ORDER_STAGE_IDS.map((stageId, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const Icon = STAGE_ICONS[stageId];

          return (
            <div key={stageId} className="relative flex flex-1 flex-col items-center gap-1.5">
              {i > 0 && (
                <div
                  className={`absolute right-1/2 top-4 h-px w-full border-t border-dashed transition-colors duration-500 ${
                    i <= currentIndex ? 'border-orange/60' : 'border-white/10'
                  }`}
                />
              )}

              <motion.span
                initial={false}
                animate={done || active ? { scale: [0.85, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className={`orb-3d relative z-10 flex h-8 w-8 shrink-0 items-center justify-center !rounded-full ${
                  done
                    ? 'border-[#8fe3a0]/50 text-[#8fe3a0]'
                    : active
                      ? 'surface-3d-open animate-glow-pulse text-orange'
                      : 'text-muted opacity-45'
                }`}
              >
                {done ? <Check size={13} strokeWidth={3} /> : <Icon size={13} />}
              </motion.span>

              <span
                className={`text-center text-[8.5px] font-bold leading-tight ${
                  active ? 'text-gold' : done ? 'text-[#cfc7bd]' : 'text-muted'
                }`}
              >
                {ORDER_STAGE_LABELS[stageId]}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
