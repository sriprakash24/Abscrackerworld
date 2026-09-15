import { Search, X, CalendarDays, MapPin } from "lucide-react";

/**
 * Sticky search + date + location filter for the Packing screen. Search
 * matches customer name, mobile, or order ID; the date filter matches
 * against each order's actual payment-confirmed date (derived from its
 * invoice number — see src/utils/orderDates.js), not the enquiry/login
 * date. The location filter matches an order's district (falling back to
 * city), so packing can be worked through one district at a time.
 */
export default function PackingSearchFilterBar({
  search,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  locationFilter,
  onLocationFilterChange,
  locationOptions = [],
}) {
  const hasFilters = !!search || !!dateFilter || !!locationFilter;

  return (
    <div className="sticky top-[101px] z-10 -mx-4 bg-[#050505]/95 px-4 pb-3 pt-1 backdrop-blur-sm sm:-mx-6 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="surface-3d flex flex-1 items-center gap-2 rounded-xl px-3.5 py-2.5 sm:min-w-[180px]">
          <Search size={15} className="shrink-0 text-orange" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, mobile, or order ID…"
            className="w-full min-w-0 bg-transparent text-[12px] font-medium text-[#f2ece2] placeholder:text-muted focus:outline-none"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="shrink-0 text-muted transition-colors hover:text-orange"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="surface-3d flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5">
          <CalendarDays size={15} className="shrink-0 text-orange" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value)}
            className="min-w-0 bg-transparent text-[12px] font-medium text-[#f2ece2] [color-scheme:dark] focus:outline-none"
          />
          {dateFilter && (
            <button
              onClick={() => onDateFilterChange("")}
              className="shrink-0 text-muted transition-colors hover:text-orange"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="surface-3d flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5">
          <MapPin size={15} className="shrink-0 text-orange" />
          <select
            value={locationFilter}
            onChange={(e) => onLocationFilterChange(e.target.value)}
            className="min-w-[110px] max-w-[160px] bg-transparent text-[12px] font-medium text-[#f2ece2] [color-scheme:dark] focus:outline-none"
          >
            <option value="" className="bg-[#150007] text-[#f2ece2]">
              All locations
            </option>
            {locationOptions.map((loc) => (
              <option key={loc} value={loc} className="bg-[#150007] text-[#f2ece2]">
                {loc}
              </option>
            ))}
          </select>
          {locationFilter && (
            <button
              onClick={() => onLocationFilterChange("")}
              className="shrink-0 text-muted transition-colors hover:text-orange"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {hasFilters && (
          <button
            onClick={() => {
              onSearchChange("");
              onDateFilterChange("");
              onLocationFilterChange("");
            }}
            className="shrink-0 rounded-xl border border-white/10 bg-[#0c0906] px-3.5 py-2.5 text-[11px] font-bold text-muted transition-colors hover:border-orange/40 hover:text-orange"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
