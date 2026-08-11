/**
 * A row of small gold/red bulbs blinking out of phase — the fairy-light
 * marquee strip seen along the top of a Diwali storefront banner.
 * Pure CSS (see .festive-bulb / .festive-lights in index.css), cheap
 * enough to run behind scrolling content.
 */
export default function FestiveLights({ count = 16, className = '' }) {
  const bulbs = Array.from({ length: count });
  return (
    <div className={`festive-lights ${className}`} aria-hidden="true">
      {bulbs.map((_, i) => (
        <span
          key={i}
          className={`festive-bulb ${i % 2 === 0 ? 'festive-bulb--gold' : 'festive-bulb--red'}`}
          style={{ animationDelay: `${(i % 6) * 0.18}s` }}
        />
      ))}
    </div>
  );
}
