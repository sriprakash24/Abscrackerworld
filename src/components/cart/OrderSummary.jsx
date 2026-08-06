import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import PackingChargesCard from './PackingChargesCard';

export default function OrderSummary({ pricing }) {
  const {
    subtotalSale,
    discountPercentage,
    packingCharges,
    coupon,
    couponDiscount,
    grandTotal,
    totalSavingsPct,
  } = pricing;

  return (
    <div className="px-4 pt-3">
      <div className="surface-3d rounded-2xl px-4 py-3.5">
        <h3 className="text-[12.5px] font-extrabold tracking-wide text-[#f2ece2]">Order Summary</h3>

        <div className="mt-2 divide-y divide-white/[0.06]">
          <Row label="Item Total" value={`₹${subtotalSale}`} />
          {discountPercentage > 0 && (
            <Row label="You Save" value={`${discountPercentage}% OFF`} valueClassName="text-[#8fe3a0]" />
          )}
          <div className="py-0.5">
            <PackingChargesCard amount={packingCharges} />
          </div>
          {coupon && couponDiscount > 0 && (
            <Row label={`Coupon (${coupon.code})`} value={`− ₹${couponDiscount}`} valueClassName="text-[#8fe3a0]" />
          )}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-dashed border-white/15 pt-3">
          <span className="text-[13px] font-extrabold text-[#f2ece2]">Grand Total</span>
          <motion.span
            key={grandTotal}
            initial={{ scale: 1.12, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-embossed text-[18px] font-extrabold text-gold"
          >
            ₹{grandTotal}
          </motion.span>
        </div>

        {totalSavingsPct > 0 && (
          <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-gold/25 bg-gold/10 py-1.5 text-[11px] font-bold text-gold">
            <Sparkles size={13} />
            You're saving {totalSavingsPct}% on this order!
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, valueClassName }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[11.5px]">
      <span className="text-[#cfc7bd]">{label}</span>
      <span className={valueClassName || 'font-bold text-[#f2ece2]'}>{value}</span>
    </div>
  );
}
