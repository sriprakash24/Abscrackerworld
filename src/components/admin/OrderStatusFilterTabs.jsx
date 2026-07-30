import { ADMIN_STATUS_FILTERS } from '../../constants/orderActions';
import { getOrderStatusMeta } from '../../constants/orderStatusMeta';

const ALL_META = { label: 'All Orders', emoji: '🧾' };

export default function OrderStatusFilterTabs({ activeStatus, onChange, counts }) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {ADMIN_STATUS_FILTERS.map((status) => {
        const meta = status === 'ALL' ? ALL_META : getOrderStatusMeta(status);
        const active = activeStatus === status;
        const count = counts?.[status] ?? 0;

        return (
          <button
            key={status}
            onClick={() => onChange(status)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-bold transition-colors ${
              active
                ? 'border-orange/60 bg-orange/15 text-orange'
                : 'border-white/10 bg-[#0c0906] text-muted hover:border-white/20 hover:text-[#cfc7bd]'
            }`}
          >
            <span>{meta.emoji}</span>
            <span>{meta.label}</span>
            {count > 0 && (
              <span className={`rounded-full px-1.5 py-px text-[9.5px] ${active ? 'bg-orange/25 text-orange' : 'bg-white/10 text-muted'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
