import diwaliOfferBanner from '../../assets/hero/diwali-offer-banner.jpg';

// Home screen "Special Combos" banner. The artwork is self-contained
// (headline, ₹3500 / ₹7000 / ₹10000 combos, trust strip), so this is just the
// image at its native aspect ratio — no overlays to keep in sync.
// Native size of src/assets/hero/diwali-offer-banner.jpg: 1974 × 797.
export default function OfferCountdownBanner() {
  return (
    <div className="relative w-full" style={{ aspectRatio: '1974 / 797' }}>
      <img
        src={diwaliOfferBanner}
        alt="Celebrate this Deepavali with our special combos — ₹3500, ₹7000 and ₹10000 combos, up to 91% off"
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        draggable={false}
      />
    </div>
  );
}
