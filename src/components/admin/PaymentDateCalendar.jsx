import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { toDateInputValue } from "../../utils/orderDates";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

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

/**
 * Single-date "Payment / Invoice Date" picker — a tap-friendly calendar
 * dropdown instead of the browser's native <input type="date">, which on
 * some devices opens as free-text typing rather than a calendar and invites
 * mistyped dates. Defaults to today and never allows a future date (a
 * payment can't be confirmed before it landed).
 *
 * `value` / `onChange` use the same "YYYY-MM-DD" string the rest of the
 * codebase already standardises on (see toDateInputValue).
 */
export default function PaymentDateCalendar({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedDate = useMemo(() => {
    if (!value) return null;
    const [y, m, d] = value.split("-").map(Number);
    return y && m && d ? new Date(y, m - 1, d) : null;
  }, [value]);

  const today = useMemo(() => new Date(), []);
  const todayValue = toDateInputValue(today);

  const [viewMonth, setViewMonth] = useState(selectedDate || today);

  useEffect(() => {
    if (open) setViewMonth(selectedDate || today);
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

  const grid = buildMonthGrid(viewMonth.getFullYear(), viewMonth.getMonth());
  const monthLabel = viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const isCurrentOrFutureMonth =
    viewMonth.getFullYear() > today.getFullYear() ||
    (viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() >= today.getMonth());

  const displayLabel = selectedDate
    ? selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "Select date";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="surface-3d flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[12px] font-bold text-[#f2ece2] outline-none transition-colors focus:border-gold/50 disabled:opacity-60"
      >
        <CalendarDays size={14} className="shrink-0 text-orange" />
        {displayLabel}
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-[80] w-[260px] rounded-xl border border-white/10 bg-[#150007] p-3 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="orb-3d flex h-6 w-6 items-center justify-center !rounded-full text-muted"
              aria-label="Previous month"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-[11.5px] font-extrabold text-[#f2ece2]">{monthLabel}</span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              disabled={isCurrentOrFutureMonth}
              className="orb-3d flex h-6 w-6 items-center justify-center !rounded-full text-muted disabled:opacity-30"
              aria-label="Next month"
            >
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((w, i) => (
              <div key={i} className="text-center text-[9.5px] font-bold text-muted">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((date, i) => {
              if (!date) return <div key={i} className="aspect-square" />;
              const cellValue = toDateInputValue(date);
              const isFuture = cellValue > todayValue;
              const isSelected = cellValue === value;
              const isToday = cellValue === todayValue;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isFuture}
                  onClick={() => {
                    onChange(cellValue);
                    setOpen(false);
                  }}
                  className={`flex aspect-square items-center justify-center rounded-lg text-[11px] font-bold transition-colors ${
                    isSelected
                      ? "bg-orange text-[#150007]"
                      : isFuture
                        ? "text-muted/30"
                        : isToday
                          ? "border border-orange/50 text-orange"
                          : "text-[#f2ece2] hover:bg-white/10"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              onChange(todayValue);
              setOpen(false);
            }}
            className="mt-2 w-full rounded-lg bg-white/5 py-1.5 text-[10.5px] font-bold text-muted hover:text-[#f2ece2]"
          >
            Today
          </button>
        </div>
      )}
    </div>
  );
}
