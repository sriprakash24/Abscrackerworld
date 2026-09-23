import { ADMIN_STATUS_FILTERS } from '../../constants/orderActions';
import { getOrderStatusMeta } from '../../constants/orderStatusMeta';

const ALL_META = { label: 'All Orders', emoji: '🧾' };

// One color per status, kept muted/pastel rather than neon so it reads as
// "this chip is Packed" at a glance without shouting — the admin's own
// distinction between "differentiated" and "over-highlighted". PACKED and
// OUT_FOR_DELIVERY (both orange in the shared status-badge palette used on
// order cards) get their own hues here since they're the two chips an
// admin flips between most while working the floor.
const STATUS_COLORS = {
  ALL: '#FF9A3C',
  AWAITING_ADMIN_CONFIRMATION: '#E6B23C',
  CONFIRMED: '#7BC88A',
  PACKED: '#E8974A',
  OUT_FOR_DELIVERY: '#5BAEDB',
  DELIVERED: '#3FAE92',
  CANCELLED: '#D9634A',
};

/**
 * Status filter chips for the Order Management screen. Wrapped instead of
 * side-scrolled — every status is visible at once on a phone screen rather
 * than hidden a swipe away — and each status keeps its own subdued color
 * wash all the time (not only while selected), so "Packed" and "Out for
 * Delivery" are two differently-colored chips you can find by color instead
 * of by reading every label first.
 */
export default function OrderStatusFilterTabs({ activeStatus, onChange, counts }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ADMIN_STATUS_FILTERS.map((status) => {
        const meta = status === 'ALL' ? ALL_META : getOrderStatusMeta(status);
        const color = STATUS_COLORS[status] || '#FF9A3C';
        const active = activeStatus === status;
        const count = counts?.[status] ?? 0;

        return (
          <button
            key={status}
            onClick={() => onChange(status)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-bold transition-all"
            style={{
              borderColor: active ? `${color}b0` : `${color}40`,
              background: active
                ? `linear-gradient(160deg, ${color}38, ${color}18)`
                : `${color}14`,
              color: active ? '#fbf6ee' : color,
              boxShadow: active ? `0 0 0 1px ${color}55, 0 4px 14px -6px ${color}90` : 'none',
            }}
          >
            <span>{meta.emoji}</span>
            <span>{meta.label}</span>
            {count > 0 && (
              <span
                className="rounded-full px-1.5 py-px text-[9.5px] font-extrabold"
                style={{
                  background: active ? 'rgba(0,0,0,0.28)' : `${color}22`,
                  color: active ? '#fbf6ee' : color,
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
