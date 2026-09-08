import { useMemo } from 'react';

/**
 * Tiny ember particles that intermittently pop off in random directions
 * and fade — a lit-sparkler touch for primary CTAs, in keeping with the
 * store's fireworks theme. Cheap CSS-driven animation (see `sparkFly` in
 * index.css), randomized once per mount via useMemo.
 */
export default function ButtonSparks({ count = 7 }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 12 + Math.random() * 12;
        return {
          id: i,
          top: `${8 + Math.random() * 84}%`,
          left: `${Math.random() * 100}%`,
          tx: `${Math.cos(angle) * distance}px`,
          ty: `${Math.sin(angle) * distance}px`,
          size: 2 + Math.random() * 2,
          delay: Math.random() * 2.2,
          duration: 0.9 + Math.random() * 0.7,
        };
      }),
    [count]
  );

  return (
    <span className="pointer-events-none absolute inset-0 z-20 overflow-visible">
      {sparks.map((s) => (
        <span
          key={s.id}
          className="animate-spark-fly absolute rounded-full bg-gold"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            boxShadow: '0 0 4px 1px var(--color-glow)',
            '--tx': s.tx,
            '--ty': s.ty,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </span>
  );
}
