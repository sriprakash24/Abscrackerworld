/**
 * Top-left badge stack for a product card. Reads the flags admins set on
 * the product form (flashDeal, newArrival) plus the derived discount % —
 * previously these flags were saved but never actually rendered anywhere,
 * so toggling them in the admin had no visible effect on the storefront.
 */
export default function ProductBadges({ product }) {
  const badges = [];

  if (product.flashDeal) {
    badges.push({
      key: 'deal',
      label: '🔥 Best Deal',
      className: 'bg-gradient-to-b from-[#ff7a52] to-accent text-white',
    });
  }

  if (product.newArrival) {
    badges.push({
      key: 'new',
      label: 'New Arrival',
      className: 'bg-gradient-to-b from-[#ffe9a8] to-gold text-[#1a0d00]',
    });
  }

  if (product.discountPercentage > 0) {
    badges.push({
      key: 'discount',
      label: `${product.discountPercentage}% OFF`,
      className: 'bg-gradient-to-b from-[#ff7a52] to-accent text-white',
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
      {badges.map((b) => (
        <span
          key={b.key}
          className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold leading-none ${b.className}`}
          style={{ boxShadow: '0 2px 6px rgba(0,0,0,.5), 0 0 10px rgba(255,87,34,.35)' }}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}
