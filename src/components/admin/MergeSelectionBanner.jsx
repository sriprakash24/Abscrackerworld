import { useEffect, useState } from "react";
import { Layers2, Loader2, Check, X } from "lucide-react";

/**
 * Lets the admin choose exactly which of a customer's awaiting-confirmation
 * orders go into one merged estimate/invoice, instead of always merging
 * every order for that mobile number. Every order starts checked (merging
 * everything is still the one-tap common case); unchecking one leaves it
 * showing as its own separate order card once merged.
 *
 * Two call sites, same component:
 *   - AdminDashboard's merge-suggestion banner (mode="suggest") — shown the
 *     moment 2+ awaiting orders share a mobile number and nothing is merged
 *     yet.
 *   - MergedEstimateCard's "Edit Selection" (mode="edit") — reopens the same
 *     checklist against the customer's CURRENT sibling set (which may have
 *     grown since the original merge, e.g. a new order placed after) with
 *     the existing selection pre-checked, so adding a newly-placed order
 *     into an still-unpaid merge is just one more tick.
 */
export default function MergeSelectionBanner({
  mobile,
  orders,
  initialSelectedIds,
  mode = "suggest",
  minSelected = 2,
  merging,
  onMerge,
  onCancel,
}) {
  const [selected, setSelected] = useState(() => new Set(initialSelectedIds || orders.map((o) => o.id)));

  // Re-sync if the sibling set changes under us (e.g. a new order lands
  // while this banner is open) — newly-appeared orders default to checked.
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      orders.forEach((o) => {
        if (!prev.has(o.id) && !initialSelectedIds) next.add(o.id);
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.map((o) => o.id).join(",")]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const count = selected.size;

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-dashed border-orange/40 bg-orange/5 px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-bold text-orange">
        <Layers2 size={14} />
        {mode === "add"
          ? `${orders.length} awaiting order${orders.length > 1 ? "s" : ""} from this number — add to this invoice?`
          : `${orders.length} orders from this number — pick which ones to merge`}
      </div>

      <div className="flex flex-col gap-1.5">
        {orders.map((o) => {
          const checked = selected.has(o.id);
          return (
            <label
              key={o.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-black/20 px-3 py-2 text-[11px]"
            >
              <span
                onClick={(e) => {
                  e.preventDefault();
                  toggle(o.id);
                }}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  checked ? "border-orange bg-orange text-black" : "border-white/20 bg-black/20 text-transparent"
                }`}
              >
                <Check size={11} strokeWidth={3} />
              </span>
              <span className="flex-1 font-bold text-[#f2ece2]">{o.orderId || o.id}</span>
              <span className="text-muted">₹{(o.grandTotal ?? 0).toLocaleString("en-IN")}</span>
            </label>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onMerge(Array.from(selected))}
          disabled={merging || count < minSelected}
          title={count < minSelected ? `Pick at least ${minSelected} order${minSelected > 1 ? "s" : ""}` : undefined}
          className="flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#e35226] to-[#b8391a] px-3.5 py-2 text-[10.5px] font-bold text-white disabled:opacity-50"
        >
          {merging ? <Loader2 size={12} className="animate-spin" /> : <Layers2 size={12} />}
          {mode === "edit" ? `Save Selection (${count})` : mode === "add" ? `Add Selected (${count})` : `Merge Selected (${count})`}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={merging}
            title="Cancel"
            className="orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-full text-muted disabled:opacity-50"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
