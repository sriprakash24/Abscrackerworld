/** A small decorative oil-lamp (diya) glyph with a flickering flame —
 * used as a quiet festival accent near headers/hero corners. */
export default function Diya({ size = 18, className = '' }) {
  return (
    <span className={`inline-flex flex-col items-center ${className}`} aria-hidden="true">
      <svg width={size * 0.5} height={size * 0.6} viewBox="0 0 20 24" className="diya-flame">
        <path
          d="M10 1c-3 4-5 7-5 10a5 5 0 0 0 10 0c0-3-2-6-5-10z"
          fill="url(#diya-flame-grad)"
        />
        <defs>
          <linearGradient id="diya-flame-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff4c2" />
            <stop offset="45%" stopColor="#ffb300" />
            <stop offset="100%" stopColor="#e5304a" />
          </linearGradient>
        </defs>
      </svg>
      <svg width={size} height={size * 0.55} viewBox="0 0 32 18">
        <path
          d="M0 4c4 8 10 12 16 12s12-4 16-12c-4 3-10 6-16 6S4 7 0 4z"
          fill="#d7a96b"
          stroke="#a3763c"
          strokeWidth="0.6"
        />
      </svg>
    </span>
  );
}
