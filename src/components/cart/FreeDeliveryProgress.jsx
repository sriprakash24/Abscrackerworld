import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, PartyPopper } from 'lucide-react';
import FireworkBurst from '../ui/FireworkBurst';

export default function FreeDeliveryProgress({ unlocked, progressPct, amountRemaining }) {
  const [justUnlocked, setJustUnlocked] = useState(false);
  const wasUnlocked = useRef(unlocked);

  useEffect(() => {
    if (unlocked && !wasUnlocked.current) {
      setJustUnlocked(true);
      const t = setTimeout(() => setJustUnlocked(false), 2200);
      return () => clearTimeout(t);
    }
    wasUnlocked.current = unlocked;
  }, [unlocked]);

  return (
    <div className="px-4 pt-3">
      <div
        className="surface-3d relative overflow-hidden rounded-2xl px-4 py-3"
        style={
          unlocked
            ? { borderColor: 'rgba(90,230,140,.45)', boxShadow: '0 0 22px rgba(80,220,130,.25)' }
            : undefined
        }
      >
        <AnimatePresence>
          {justUnlocked && (
            <>
              <FireworkBurst size={90} className="-right-2 -top-4 opacity-80" delay={0} color="gold" />
              <FireworkBurst size={70} className="left-6 -top-3 opacity-70" delay={0.25} color="orange" />
            </>
          )}
        </AnimatePresence>

        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold tracking-wide text-[#f2ece2]">
            <Truck size={15} className={unlocked ? 'text-[#8fe3a0]' : 'text-orange'} />
            FREE DELIVERY
          </div>
          {unlocked ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#8fe3a0]">
              <PartyPopper size={12} /> Unlocked
            </span>
          ) : (
            <span className="text-[10px] font-bold text-gold">{progressPct}%</span>
          )}
        </div>

        <p className="relative z-10 mt-1 text-[11px] leading-snug text-[#cfc7bd]">
          {unlocked ? (
            <>🎉 Congratulations! You unlocked FREE Delivery.</>
          ) : (
            <>
              Add <span className="font-bold text-gold">₹{amountRemaining}</span> more to unlock FREE Delivery
            </>
          )}
        </p>

        <div className="relative z-10 mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,.06)]">
          <motion.div
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: unlocked
                ? 'linear-gradient(90deg,#3ee878,#20bd5a)'
                : 'linear-gradient(90deg,#ffcf6b,#ff7a00)',
              boxShadow: unlocked ? '0 0 10px rgba(80,220,130,.7)' : '0 0 10px rgba(255,122,0,.6)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
