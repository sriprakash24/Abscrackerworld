// Soft peach backdrop that sits behind a page's content. (Previously a
// dark festival photograph — replaced for the Clean Light & Peach theme.)
// Kept as a component with the same props so every page that already
// mounts it (home categories, cart, checkout, orders, track order…)
// picks up the new look without changes.
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
          background:
            'radial-gradient(circle at 12% 8%, rgba(255,179,71,0.18) 0, transparent 38%), radial-gradient(circle at 92% 30%, rgba(255,138,101,0.16) 0, transparent 40%), linear-gradient(180deg, #fff7e8 0%, #ffeedb 100%)',
        }}
      />
      {topFade && (
        <div
          className="absolute inset-x-0 top-0 h-14"
          style={{ background: 'linear-gradient(180deg, #fff7e8 0%, transparent 100%)' }}
        />
      )}
    </div>
  );
}
