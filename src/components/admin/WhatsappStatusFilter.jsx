const OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'WA Pending', emoji: '⏳' },
  { value: 'SENT', label: 'WA Sent', emoji: '✅' },
];

/**
 * Lets the admin isolate orders whose estimate-bill WhatsApp ticks are
 * still incomplete — built so a missed tick a few orders back (e.g. #94
 * while #95/#96 already went out) doesn't quietly slip through. "All"
 * includes orders where tracking doesn't apply (invoice already sent),
 * same as before this filter existed.
 */
export default function WhatsappStatusFilter({ active, onChange, counts }) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {OPTIONS.map((opt) => {
        const isActive = active === opt.value;
        const count = counts?.[opt.value] ?? 0;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-bold transition-colors ${
              isActive
                ? opt.value === 'PENDING'
                  ? 'border-gold/60 bg-gold/15 text-gold'
                  : opt.value === 'SENT'
                    ? 'border-[#25D366]/60 bg-[#25D366]/15 text-[#25D366]'
                    : 'border-orange/60 bg-orange/15 text-orange'
                : 'border-white/10 bg-[#0c0906] text-muted hover:border-white/20 hover:text-[#cfc7bd]'
            }`}
          >
            {opt.emoji && <span>{opt.emoji}</span>}
            <span>{opt.label}</span>
            {count > 0 && (
              <span
                className={`rounded-full px-1.5 py-px text-[9.5px] ${
                  isActive ? 'bg-black/20' : 'bg-white/10 text-muted'
                }`}
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
