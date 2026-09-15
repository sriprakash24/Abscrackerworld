import { useEffect, useMemo, useRef, useState } from "react";
import { Receipt, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Builds a 6-row calendar grid for the given month: null for the leading/
 * trailing blanks outside the month, otherwise a Date for that day.
 */
function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = first.getDay();
  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Multi-select filter over the payment-confirmed date encoded in each
 * order's invoice number (see src/utils/orderDates.js) — separate from the
 * plain single-date filter already in PackingSearchFilterBar. Shown as an
 * actual calendar (not a scrolling dropdown list) so admin can see a whole
 * month of invoice dates — and how many confirmed orders fall on each one
 * — at a glance, and tick several days at once (e.g. both the 9th and the
 * 10th) to pack them together.
 *
 * `options` is an array of { value: "YYYY-MM-DD", label: "10 Sep 2026", count }.
 * `selected` is the array of ticked `value`s.
 */
export default function PackingInvoiceDateFilter({
  options = [],
  selected = [],
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const countsByDate = useMemo(() => {
    const map = new Map();
    for (const opt of options) map.set(opt.value, opt.count);
    return map;
  }, [options]);

  const labelByDate = useMemo(() => {
    const map = new Map();
    for (const opt of options) map.set(opt.value, opt.label);
    return map;
  }, [options]);

  // Default the calendar to whichever month has the most recent invoice
  // date with orders in it, so it opens already showing live data instead
  // of an empty current month.
  const defaultMonth = useMemo(() => {
    if (options.length === 0) return new Date();
    const [y, m] = options[0].value.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [options]);

  const [viewMonth, setViewMonth] = useState(defaultMonth);

  useEffect(() => {
    setViewMonth(defaultMonth);
    // Only re-sync the default month when the popover is (re)opened, not
    // on every render — otherwise navigating months would keep snapping
    // back while it's open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selectedSet = new Set(selected);
  const totalSelectedCount = selected.reduce((sum, v) => sum + (countsByDate.get(v) || 0), 0);

  const toggleDate = (value) => {
    if (!countsByDate.get(value)) return;
    if (selectedSet.has(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const label =
    selected.length === 0
      ? "Invoice date"
      : selected.length === 1
        ? "Invoice date (1)"
        : `Invoice dates (${selected.length})`;

  const grid = buildMonthGrid(viewMonth.getFullYear(), viewMonth.getMonth());
  const monthLabel = viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const hasAnyData = options.length > 0;
  const currentMonthHasData = grid.some((d) => d && countsByDate.get(toDateValue(d)) > 0);

  // Selected dates sorted for the summary list, newest first (matches the
  // calendar/dropdown ordering elsewhere in Packing).
  const selectedSummary = [...selected]
    .sort((a, b) => (a < b ? 1 : -1))
    .map((value) => ({
      value,
      label: labelByDate.get(value) || value,
      count: countsByDate.get(value) || 0,
    }));

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`surface-3d flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12px] font-medium transition-colors ${
          selected.length ? "text-orange" : "text-[#f2ece2]"
        }`}
      >
        <Receipt size={15} className="shrink-0 text-orange" />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {selected.length > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange([]);
          }}
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange text-[#150007]"
          aria-label="Clear invoice date filter"
        >
          <X size={10} strokeWidth={3} />
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-[286px] rounded-xl border border-white/10 bg-[#150007] p-3 shadow-xl">
          {!hasAnyData ? (
            <div className="px-2 py-6 text-center text-[11px] text-muted">
              No invoice-dated orders yet.
            </div>
          ) : (
            <>
              {/* Month nav */}
              <div className="mb-2 flex items-center justify-between">
                <button
                  onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  className="orb-3d flex h-6 w-6 items-center justify-center !rounded-full text-muted"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-[11.5px] font-extrabold text-[#f2ece2]">{monthLabel}</span>
                <button
                  onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  className="orb-3d flex h-6 w-6 items-center justify-center !rounded-full text-muted"
                  aria-label="Next month"
                >
                  <ChevronRight size={13} />
                </button>
              </div>

              {/* Weekday header */}
              <div className="mb-1 grid grid-cols-7 gap-1">
                {WEEKDAY_LABELS.map((w, i) => (
                  <div key={i} className="text-center text-[9.5px] font-bold text-muted">
                    {w}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-1">
                {grid.map((date, i) => {
                  if (!date) return <div key={i} className="aspect-square" />;
                  const value = toDateValue(date);
                  const count = countsByDate.get(value) || 0;
                  const checked = selectedSet.has(value);
                  const hasOrders = count > 0;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!hasOrders}
                      onClick={() => toggleDate(value)}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-[11px] font-bold transition-colors ${
                        checked
                          ? "bg-orange text-[#150007]"
                          : hasOrders
                            ? "bg-white/[0.06] text-[#f2ece2] hover:bg-white/10"
                            : "text-muted/40"
                      }`}
                    >
                      <span>{date.getDate()}</span>
                      {hasOrders && (
                        <span
                          className={`text-[8px] font-extrabold leading-none ${
                            checked ? "text-[#150007]/70" : "text-orange"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {!currentMonthHasData && (
                <div className="mt-2 text-center text-[10px] text-muted">
                  No invoice-dated orders in {monthLabel}.
                </div>
              )}

              {/* Selected-day breakdown + total */}
              {selectedSummary.length > 0 && (
                <div className="mt-3 border-t border-dashed border-white/10 pt-2.5">
                  <div className="flex flex-col gap-1">
                    {selectedSummary.map((s) => (
                      <div
                        key={s.value}
                        className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 text-[10.5px] font-semibold text-[#f2ece2]"
                      >
                        <span>{s.label}</span>
                        <span className="text-orange">{s.count} orders</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between rounded-lg bg-orange/15 px-2.5 py-1.5 text-[11px] font-extrabold text-orange">
                    <span>
                      Total ({selectedSummary.length} date{selectedSummary.length > 1 ? "s" : ""})
                    </span>
                    <span>{totalSelectedCount} orders</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
