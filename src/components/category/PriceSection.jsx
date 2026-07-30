export default function PriceSection({ mrp, sale, discountPercentage }) {
  return (
    <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
      <span className="text-[13px] font-extrabold text-gold">₹{sale}</span>
      {mrp > sale && <s className="text-[11px] font-normal text-muted">₹{mrp}</s>}
      {discountPercentage > 0 && (
        <span className="text-[10px] font-bold text-orange">{discountPercentage}% OFF</span>
      )}
    </div>
  );
}
