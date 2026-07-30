import { useMemo } from 'react';

/**
 * Lightweight CSS-driven floating ember particles.
 * Pure CSS keyframes (no canvas) to keep this cheap enough to run
 * behind interactive content at 60fps.
 */
export default function EmberParticles({ count = 18, className = '' }) {
  const dots = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 3,
        duration: 5 + Math.random() * 6,
        delay: Math.random() * 6,
        drift: (Math.random() - 0.5) * 60,
      })),
    [count]
  );

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute bottom-[-10px] rounded-full bg-gold animate-float-up"
          style={{
            left: `${d.left}%`,
            width: d.size,
            height: d.size,
            boxShadow: '0 0 6px 1px var(--color-glow)',
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
            '--drift': `${d.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
