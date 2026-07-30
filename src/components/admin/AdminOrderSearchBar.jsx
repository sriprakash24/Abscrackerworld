import { Search, X } from 'lucide-react';

export default function AdminOrderSearchBar({ value, onChange }) {
  return (
    <div className="surface-3d flex items-center gap-2 rounded-xl px-3.5 py-2.5">
      <Search size={15} className="shrink-0 text-orange" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by order ID, name, or mobile…"
        className="w-full min-w-0 bg-transparent text-[12px] font-medium text-[#f2ece2] placeholder:text-muted focus:outline-none"
      />
      {value && (
        <button onClick={() => onChange('')} className="shrink-0 text-muted transition-colors hover:text-orange">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
