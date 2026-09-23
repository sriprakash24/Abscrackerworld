import { PackageOpen, PackageCheck, Layers, Box, Loader2 } from "lucide-react";
import { getOrderSlot } from "../../utils/packingAccent";

/**
 * One "packing job" — either a single confirmed order, or an explicitly
 * merged set of a customer's orders (see PackingClusterCard's Merge
 * toggle). Deliberately dumb/reusable: it just renders whatever `job.items`
 * it's given, a Start Packing button, and a quick Mark Packed shortcut.
 *
 * The shortcut exists for when packing already happened off-app — e.g. a
 * printed packing list was used on the floor — and the admin just needs to
 * sync the app's status afterwards without re-ticking every item in the
 * checklist modal.
 *
 * `slotIndex` + `showSlotLabel` only matter when a customer has more than
 * one unmerged order stacked in the same cluster — without them, two
 * orders back to back looked like one repeated card. Each slot gets its
 * own tint, left edge, and "Order N" tag so the two boxes read as
 * separate at a glance, not just distinguishable by reading the order ID.
 */
export default function PackingJobCard({
  job,
  packedCount,
  onStartPacking,
  onQuickMarkPacked,
  quickMarking = false,
  slotIndex = 0,
  showSlotLabel = false,
}) {
  const items = job.items || [];
  const totalItems = items.length;
  const fullyPacked = totalItems > 0 && packedCount === totalItems;
  const slot = showSlotLabel ? getOrderSlot(slotIndex) : null;

  return (
    <div
      className="relative flex flex-col gap-3 overflow-hidden rounded-xl border p-3.5"
      style={{
        borderColor: slot ? slot.edge : "rgba(255,255,255,0.06)",
        background: slot ? `linear-gradient(160deg, ${slot.tint}, rgba(0,0,0,0.22))` : "rgba(0,0,0,0.2)",
      }}
    >
      {slot && (
        <span
          className="pointer-events-none absolute inset-y-0 left-0 w-[4px]"
          style={{ background: slot.edge }}
        />
      )}
      <div className={`flex flex-wrap items-center justify-between gap-2 ${slot ? "pl-1.5" : ""}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {slot && (
              <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-extrabold ${slot.badge}`}>
                {slot.label}
              </span>
            )}
            <span className="truncate text-[11.5px] font-extrabold text-[#f2ece2]">
              {job.merged ? "Merged box" : job.orderLabels[0]}
            </span>
          </div>
          <div className="text-[10px] text-muted">
            {job.confirmedDateLabel ? `Confirmed ${job.confirmedDateLabel}` : ""}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {job.merged && (
            <span
              title={job.orderLabels.join(", ")}
              className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-muted"
            >
              <Layers size={10} />
              {job.orderLabels.length} orders
            </span>
          )}
          <span
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
              fullyPacked
                ? "border-[#8fe3a0]/35 bg-[#8fe3a0]/10 text-[#8fe3a0]"
                : "border-gold/35 bg-gold/10 text-gold"
            }`}
          >
            {packedCount}/{totalItems} packed
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: slot ? slot.tint : "rgba(255,255,255,0.05)" }}
        >
          <Box size={16} className="text-muted" />
        </div>
        <div className="min-w-0 flex-1 text-[10.5px] font-semibold text-muted">
          {totalItems} distinct {totalItems === 1 ? "item" : "items"}
        </div>
        <div className="shrink-0 text-right text-[12.5px] font-extrabold text-gradient-gold">
          ₹{(job.grandTotal ?? 0).toLocaleString("en-IN")}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onStartPacking}
          className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-extrabold text-black"
        >
          <PackageOpen size={13} />
          {packedCount > 0 ? "Continue Packing" : "Start Packing"}
        </button>
        {onQuickMarkPacked && (
          <button
            onClick={onQuickMarkPacked}
            disabled={quickMarking}
            title="Already packed manually — mark packed without the checklist"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#8fe3a0]/45 bg-[#8fe3a0]/10 py-2.5 text-[11px] font-extrabold text-[#8fe3a0] disabled:opacity-60"
          >
            {quickMarking ? <Loader2 size={13} className="animate-spin" /> : <PackageCheck size={13} />}
            Mark Packed
          </button>
        )}
      </div>
    </div>
  );
}
