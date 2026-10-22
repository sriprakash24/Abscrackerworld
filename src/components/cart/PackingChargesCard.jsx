import { Package } from 'lucide-react';

/**
 * Packing line in the order summary. 3% applies to normal products only —
 * combo packs carry no packing charge, so for a combo-only cart this shows
 * "No packing on combos" and for a mixed cart it notes the combo is exempt.
 */
export default function PackingChargesCard({ amount, comboAmount = 0, packableAmount = 0 }) {
  const comboOnly = comboAmount > 0 && packableAmount === 0;

  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
          <Package size={13} className="text-orange" />
          Packing Charges <span className="text-[9.5px] text-muted">(3%)</span>
        </span>
        {comboOnly ? (
          <span className="text-[11.5px] font-bold text-[#1E8E4A]">Free</span>
        ) : (
          <span className="text-[11.5px] font-bold text-brown">₹{amount}</span>
        )}
      </div>
      {comboAmount > 0 && (
        <p className="mt-0.5 pl-[19px] text-[9.5px] font-semibold text-muted">
          {comboOnly ? 'No packing charge on combo packs' : 'Combo packs are exempt — packing on other items only'}
        </p>
      )}
    </div>
  );
}
