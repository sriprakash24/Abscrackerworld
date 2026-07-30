import { Package } from 'lucide-react';

export default function PackingChargesCard({ amount }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-1.5 text-[11.5px] text-[#cfc7bd]">
        <Package size={13} className="text-orange" />
        Packing Charges <span className="text-[9.5px] text-muted">(3%)</span>
      </span>
      <span className="text-[11.5px] font-bold text-[#f2ece2]">₹{amount}</span>
    </div>
  );
}
