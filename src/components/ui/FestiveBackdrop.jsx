import festiveBackdrop from '../../assets/backgrounds/diwali-backdrop.jpg';

// The same festive photo used behind "Shop by Category" on the home
// page — reused here so Cart, Checkout, Order Success, Orders, and
// Track Order all feel like part of the same festival scene, instead of
// the home page being the only one with a "real" photo behind it.
//
// Tiled vertically rather than stretched: a page can be any length (a
// long cart, a short empty-cart state, a tall order history list), and
// tiling keeps the fireworks/diya framing crisp at every length instead
// of one copy getting stretched and cropped to almost nothing on a tall
// page. A soft top fade + color wash keep it sitting quietly behind
// existing content rather than competing with it.
//
// `inset` lets a page bleed the photo past its own padding (see
// CategoryGrid, which sits inside `px-4` and needs -16px each side);
// most pages have no horizontal padding on their outer wrapper and can
// just use the default.
export default function FestiveBackdrop({ inset = {}, topFade = true }) {
  const { top = 0, bottom = 0, left = 0, right = 0 } = inset;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -z-10 overflow-hidden"
      style={{ top, bottom, left, right }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${festiveBackdrop})`,
          backgroundRepeat: 'repeat-y',
          backgroundSize: '100% auto',
          backgroundPosition: 'top center',
        }}
      />
      {topFade && (
        <div
          className="absolute inset-x-0 top-0 h-14"
          style={{ background: 'linear-gradient(180deg, #1c0201 0%, transparent 100%)' }}
        />
      )}
      {/* Gentle overall wash, color-matched to the photo's own deep
          crimson, so it stays behind the cards rather than competing */}
      <div className="absolute inset-0 bg-[#12000a]/45" />
    </div>
  );
}
