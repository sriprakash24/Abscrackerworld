const OPTIONS = [
  { value: 'ALL', label: 'All', color: '#FF9A3C' },
  { value: 'PENDING', label: 'WA Pending', emoji: '⏳', color: '#E6B23C' },
  { value: 'SENT', label: 'WA Sent', emoji: '✅', color: '#25D366' },
];

/**
 * Lets the admin isolate orders whose estimate-bill WhatsApp ticks are
 * still incomplete — built so a missed tick a few orders back (e.g. #94
 * while #95/#96 already went out) doesn't quietly slip through. "All"
 * includes orders where tracking doesn't apply (invoice already sent),
 * same as before this filter existed.
 *
 * Each option keeps its own subdued color at rest (not only once picked),
 * same treatment as OrderStatusFilterTabs — Pending reads gold, Sent reads
 * WhatsApp green, all the time.
 */
export default function WhatsappStatusFilter({ active, onChange, counts }) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((opt) => {
        const isActive = active === opt.value;
        const count = counts?.[opt.value] ?? 0;
        const color = opt.color;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-bold transition-all"
            style={{
              borderColor: isActive ? `${color}b0` : `${color}40`,
              background: isActive
                ? `linear-gradient(160deg, ${color}38, ${color}18)`
                : `${color}14`,
              color: isActive ? '#fbf6ee' : color,
              boxShadow: isActive ? `0 0 0 1px ${color}55, 0 4px 14px -6px ${color}90` : 'none',
            }}
          >
            {opt.emoji && <span>{opt.emoji}</span>}
            <span>{opt.label}</span>
            {count > 0 && (
              <span
                className="rounded-full px-1.5 py-px text-[9.5px] font-extrabold"
                style={{
                  background: isActive ? 'rgba(0,0,0,0.28)' : `${color}22`,
                  color: isActive ? '#fbf6ee' : color,
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
