import { motion } from 'framer-motion';

const RAYS = 10;

/**
 * A single decorative firework burst rendered as radiating SVG lines + dots.
 * Positioned absolutely by the parent via `className`.
 */
export default function FireworkBurst({ size = 140, delay = 0, className = '', color = 'gold' }) {
  const stroke = color === 'gold' ? '#FFD54F' : '#FF7A00';
  const rays = Array.from({ length: RAYS });

  return (
    <motion.div
      className={`absolute pointer-events-none ${className}`}
      style={{ width: size, height: size }}
      initial={{ opacity: 0, scale: 0.2 }}
      animate={{ opacity: [0, 1, 0.85, 0.45, 0.85], scale: [0.2, 1.08, 1, 1, 1] }}
      transition={{
        duration: 1.4,
        delay,
        times: [0, 0.4, 0.55, 0.8, 1],
        repeat: Infinity,
        repeatDelay: 1.2,
        ease: 'easeOut',
      }}
    >
      <svg viewBox="0 0 140 140" width="100%" height="100%">
        <g transform="translate(70,70)">
          {rays.map((_, i) => {
            const angle = (360 / RAYS) * i;
            return (
              <line
                key={i}
                x1="0"
                y1="0"
                x2="0"
                y2="-46"
                stroke={stroke}
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.85"
                transform={`rotate(${angle})`}
              />
            );
          })}
          {rays.map((_, i) => {
            const angle = (360 / RAYS) * i;
            return (
              <circle
                key={`dot-${i}`}
                cx="0"
                cy="-52"
                r="2.2"
                fill={stroke}
                transform={`rotate(${angle})`}
              />
            );
          })}
          <circle cx="0" cy="0" r="4" fill="#fff" opacity="0.9" />
        </g>
      </svg>
    </motion.div>
  );
}
