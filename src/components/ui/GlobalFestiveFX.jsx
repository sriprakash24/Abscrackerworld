import { useEffect, useMemo, useRef, useState } from 'react';

const SPARK_COLORS = ['#ffd54f', '#ff7a00', '#ff5722', '#fff6d8', '#ffb238'];
const SCROLL_COOLDOWN_MS = 2200; // minimum gap between bursts while scrolling
const AUTO_INTERVAL_MS = 6500; // also fires on its own so it's noticeable even if the user never scrolls
const BURST_LIFETIME_MS = 1900; // how long a burst stays mounted before it's cleared

// A single rocket: trail + bright flash + a full ring of sparks. Bigger and
// punchier than before — the flash is what makes the "burst" moment
// actually register instead of a handful of small dots nobody notices.
function RocketBurst({ x, big }) {
  const sparks = useMemo(() => {
    const count = big ? 20 : 15;
    return Array.from({ length: count }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.25;
      const dist = (big ? 42 : 32) + Math.random() * 26;
      return {
        id: i,
        sx: Math.cos(angle) * dist,
        sy: Math.sin(angle) * dist,
        size: (big ? 4.5 : 3.5) + Math.random() * 2.5,
        color: SPARK_COLORS[i % SPARK_COLORS.length],
        delay: 0.48 + Math.random() * 0.08,
      };
    });
  }, [big]);

  return (
    <div className="absolute bottom-0" style={{ left: `${x}%` }}>
      <span className="fx-rocket-trail" style={{ left: 0, bottom: 0 }} />
      <span
        className="fx-burst-flash"
        style={{
          left: 0,
          bottom: 92,
          width: big ? 76 : 58,
          height: big ? 76 : 58,
          '--fx-delay': '0.48s',
        }}
      />
      {sparks.map((s) => (
        <span
          key={s.id}
          className="fx-burst-spark"
          style={{
            left: 0,
            bottom: 92,
            width: s.size,
            height: s.size,
            background: s.color,
            boxShadow: `0 0 8px 2px ${s.color}`,
            '--sx': `${s.sx}px`,
            '--sy': `${s.sy}px`,
            '--fx-dur': '0.95s',
            '--fx-delay': `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function FountainBurst({ x }) {
  const drops = useMemo(() => {
    const count = 12 + Math.floor(Math.random() * 4);
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      sx: (i - count / 2) * 8 + (Math.random() - 0.5) * 6,
      size: 4 + Math.random() * 2.5,
      color: SPARK_COLORS[i % SPARK_COLORS.length],
      delay: Math.random() * 0.25,
    }));
  }, []);

  return (
    <div className="absolute bottom-0" style={{ left: `${x}%` }}>
      {drops.map((d) => (
        <span
          key={d.id}
          className="fx-fountain-drop"
          style={{
            left: 0,
            bottom: 0,
            width: d.size,
            height: d.size,
            background: d.color,
            boxShadow: `0 0 8px 2px ${d.color}`,
            '--sx': `${d.sx}px`,
            '--fx-dur': '1.1s',
            '--fx-delay': `${d.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * A brief "it's a crackers site" flourish — now a pair of rockets (plus an
 * occasional ground fountain) that burst together, with a bright flash at
 * the burst point so it actually reads as an event rather than a few
 * stray sparks. Mounted once in App.jsx (inside the shared #app-scroll
 * container), so it's the same global behaviour on every customer screen
 * (Home, Cart, Checkout, Orders, Track Order), not just the home page.
 *
 * Fires both while scrolling AND on its own timer, so it's visible even
 * on screens people don't scroll much (e.g. checkout). Still brief
 * (under 2s) and fully unmounts between plays so it reads as a nice
 * surprise rather than something fighting for attention while shopping.
 */
export default function GlobalFestiveFX() {
  const [burst, setBurst] = useState(null);
  const lastFireRef = useRef(0);
  const clearTimerRef = useRef(null);

  const fire = () => {
    const now = Date.now();
    lastFireRef.current = now;

    const type = Math.random() < 0.7 ? 'rocket' : 'fountain';
    // Positioned lower/more central than before (was pinned near the very
    // top edge) so the burst actually sits in view instead of grazing the
    // top of the screen.
    const primaryX = 16 + Math.random() * 62;
    // A second rocket a beat later and offset to the side — reads as
    // "multiple crackers going off", not a single lonely one.
    const secondaryX = Math.min(88, Math.max(6, primaryX + (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 14)));

    setBurst({
      id: now,
      type,
      x: primaryX,
      x2: secondaryX,
    });

    clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => setBurst(null), BURST_LIFETIME_MS);
  };

  useEffect(() => {
    const scrollEl = document.getElementById('app-scroll');

    function onScroll() {
      const now = Date.now();
      if (now - lastFireRef.current < SCROLL_COOLDOWN_MS) return;
      fire();
    }

    scrollEl?.addEventListener('scroll', onScroll, { passive: true });

    // Auto-play on a timer too, so the effect is visible even without
    // scrolling — it just won't double-fire if a scroll burst juuust went.
    const autoTimer = setInterval(() => {
      const now = Date.now();
      if (now - lastFireRef.current < SCROLL_COOLDOWN_MS) return;
      fire();
    }, AUTO_INTERVAL_MS);

    return () => {
      scrollEl?.removeEventListener('scroll', onScroll);
      clearInterval(autoTimer);
      clearTimeout(clearTimerRef.current);
    };
  }, []);

  if (!burst) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[30%] z-[55] h-0 overflow-visible">
      {burst.type === 'rocket' ? (
        <>
          <RocketBurst x={burst.x} big />
          <RocketBurst x={burst.x2} />
        </>
      ) : (
        <FountainBurst x={burst.x} />
      )}
    </div>
  );
}
