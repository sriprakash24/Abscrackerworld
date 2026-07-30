import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, ChevronDown, CheckCircle2, XCircle, X } from 'lucide-react';
import { COUPONS, useCartStore } from '../../store/useCartStore';
import { cn } from '../../utils/cn';

export default function CouponCard() {
  const couponCode = useCartStore((s) => s.couponCode);
  const couponStatus = useCartStore((s) => s.couponStatus);
  const couponMessage = useCartStore((s) => s.couponMessage);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const handleApply = () => {
    if (!value.trim()) return;
    applyCoupon(value);
  };

  return (
    <div className="px-4 pt-3">
      <div className="surface-3d overflow-hidden rounded-2xl">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3"
        >
          <span className="flex items-center gap-2 text-[12px] font-extrabold text-[#f2ece2]">
            <Tag size={14} className="text-orange" />
            {couponCode ? `Coupon "${couponCode}" applied` : 'Apply Coupon'}
          </span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-muted" />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                {couponCode ? (
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center justify-between rounded-lg border border-[#8fe3a0]/30 bg-[#8fe3a0]/10 px-3 py-2"
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#8fe3a0]">
                      <CheckCircle2 size={14} />
                      {couponMessage}
                    </span>
                    <button
                      onClick={removeCoupon}
                      aria-label="Remove coupon"
                      className="text-[#8fe3a0]/80 transition-transform active:scale-90"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        value={value}
                        onChange={(e) => setValue(e.target.value.toUpperCase())}
                        placeholder="Enter coupon code"
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[12px] font-bold uppercase tracking-wide text-[#f2ece2] outline-none placeholder:text-muted placeholder:tracking-normal placeholder:font-normal focus:border-orange/50"
                      />
                      <button
                        onClick={handleApply}
                        className="btn-3d shrink-0 rounded-lg px-4 py-2 text-[11px] font-bold text-white"
                      >
                        Apply
                      </button>
                    </div>

                    <AnimatePresence>
                      {couponStatus === 'error' && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="mt-2 flex items-center gap-1.5 text-[10.5px] font-semibold text-[#e35226]"
                        >
                          <XCircle size={13} />
                          {couponMessage}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Object.values(COUPONS).map((c) => (
                        <button
                          key={c.code}
                          onClick={() => {
                            setValue(c.code);
                            applyCoupon(c.code);
                          }}
                          className={cn(
                            'rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-[9.5px] font-bold text-gold transition-transform active:scale-95'
                          )}
                        >
                          {c.code}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
