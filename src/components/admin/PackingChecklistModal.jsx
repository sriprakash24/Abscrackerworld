import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import { X, Check, Loader2, PackageCheck, Save } from "lucide-react";
import { loadDraft, saveDraft, clearDraft } from "../../utils/packingDraftStorage";

// Items with more units than this also get a manual number entry next to
// the dot grid — tapping 20+ individual dots one at a time to pack a
// single large item is slow, so the packer can just type the count.
const LONG_ITEM_THRESHOLD = 8;

/**
 * The per-unit tally control for an item with quantity > 1. Plain text
 * ("Qty 4") plus one checkbox told the packer nothing about *how many of
 * the 4 they'd actually placed in the box* — a single tap marked the
 * whole line done regardless of miscounting. This makes packing each
 * unit its own tap: a row of dots (tap dot N to fill up to N, tap the
 * last filled dot again to undo it) that wraps naturally across as many
 * rows as the available width needs — no cap on how many dots show, so a
 * 20-unit item just becomes two or three short rows of dots instead of
 * one long one. For anything past LONG_ITEM_THRESHOLD units, a manual
 * number field sits alongside the dots so the packer can type the count
 * directly instead of tapping every single dot.
 */
function TallyControl({ quantity, count, onChange }) {
  const complete = count >= quantity;
  const isLong = quantity > LONG_ITEM_THRESHOLD;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {Array.from({ length: quantity }).map((_, i) => {
          const filled = i < count;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(filled && i === count - 1 ? i : i + 1)}
              aria-label={`Unit ${i + 1} of ${quantity}${filled ? ", packed" : ""}`}
              className={`flex ${isLong ? "h-6 w-6" : "h-7 w-7"} shrink-0 items-center justify-center rounded-full border text-[9.5px] font-extrabold transition-all ${
                filled
                  ? "border-[#8fe3a0] bg-[#8fe3a0] text-black"
                  : "border-gold/50 bg-white/10 text-[#f2ece2]"
              }`}
            >
              {filled ? <Check size={11} strokeWidth={3} /> : i + 1}
            </button>
          );
        })}
        <span className={`ml-1 text-[10.5px] font-extrabold ${complete ? "text-[#8fe3a0]" : "text-gold"}`}>
          {count}/{quantity}
        </span>
      </div>

      {isLong && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-muted">Type count:</span>
          <input
            // Remounts whenever `count` changes from elsewhere (a dot tap,
            // "All", or a reopened draft) so it always starts back in sync
            // with the real tally without needing an effect to resync it.
            key={count}
            type="number"
            inputMode="numeric"
            min={0}
            max={quantity}
            defaultValue={count}
            onBlur={(e) => {
              const parsed = parseInt(e.target.value, 10);
              if (!Number.isNaN(parsed)) onChange(parsed);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="w-16 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-center text-[11px] font-bold text-[#f2ece2] focus:border-gold/50 focus:outline-none"
          />
          {!complete && (
            <button
              type="button"
              onClick={() => onChange(quantity)}
              className="rounded-lg border border-gold/40 px-2 py-1 text-[10px] font-bold text-gold"
            >
              All {quantity}
            </button>
          )}
        </div>
      )}
    </div>
  );
}


/**
 * The "Start Packing" checklist — one row per item (name, quantity, a way
 * to mark it packed), for either a single order or a merged multi-order
 * job (see `job.merged`).
 *
 * Items with quantity 1 keep a simple whole-row tap-to-check, same as
 * before. Items with quantity > 1 get a per-unit TallyControl instead of
 * one checkbox, since a single tick for "Qty 4" didn't reflect whether
 * all 4 physical units actually made it into the box — see TallyControl
 * above. An item only counts as packed once every unit is ticked.
 *
 * Two layers of persistence:
 *  1. Every tap writes instantly to localStorage (via `job.jobKey`) purely
 *     as a refresh-safety net — if the page reloads before "Save Progress"
 *     is tapped, reopening this same job restores the unsaved tally.
 *  2. "Save Progress" is the only thing that writes to Firestore, so 2-3
 *     people packing off the same list at once don't race each other with
 *     a write per tap — whoever saves last simply reflects the fullest
 *     state, and the next person resumes from exactly that saved point.
 *     Firestore still only stores which items are FULLY packed (same
 *     schema as before); the per-unit tally is a local packing aid only.
 */
export default function PackingChecklistModal({
  open,
  job,
  savedPackedKeys,
  saving,
  marking,
  onSaveProgress,
  onMarkPacked,
  onClose,
}) {
  const [tally, setTally] = useState({});

  // Reset to the best available starting point whenever a fresh job is
  // opened: an unsaved local draft (if one exists) wins over the last
  // Firestore-saved state, since it represents more recent work.
  useEffect(() => {
    if (open && job) {
      const items = job.items || [];
      const draft = loadDraft(job.jobKey);
      if (draft?.tally) {
        setTally(draft.tally);
      } else {
        const fullyPacked = new Set(draft?.legacyPackedKeys ?? savedPackedKeys ?? []);
        const initial = {};
        for (const item of items) {
          initial[item.key] = fullyPacked.has(item.key) ? item.quantity : 0;
        }
        setTally(initial);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job?.jobKey]);

  if (!job) return null;

  const items = job.items || [];
  const isFullyPacked = (item) => (tally[item.key] || 0) >= item.quantity;
  const packedCount = items.filter(isFullyPacked).length;
  const allPacked = items.length > 0 && packedCount === items.length;
  const savedSet = new Set(savedPackedKeys || []);
  const dirty =
    packedCount !== savedSet.size || items.some((item) => isFullyPacked(item) !== savedSet.has(item.key));

  const setItemCount = (item, nextCount) => {
    const clamped = Math.max(0, Math.min(item.quantity, nextCount));
    setTally((prev) => {
      const next = { ...prev, [item.key]: clamped };
      // Instant local save — see file header. Never blocks on network.
      saveDraft(job.jobKey, next);
      return next;
    });
  };

  const handleSave = async () => {
    await onSaveProgress(items.filter(isFullyPacked).map((item) => item.key));
    clearDraft(job.jobKey);
  };

  const handleMarkPacked = async () => {
    await onMarkPacked(items.filter(isFullyPacked).map((item) => item.key));
    clearDraft(job.jobKey);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 sm:items-center sm:px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="surface-packing-modal flex max-h-[85vh] w-full flex-col rounded-t-2xl sm:max-w-md sm:rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-white/10 px-4 py-3.5">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-extrabold text-[#f2ece2]">
                  {job.customerName}
                </div>
                <div className="text-[10px] text-muted">
                  {job.mobile}
                  {job.merged
                    ? ` · ${job.orderLabels.length} orders merged`
                    : ` · ${job.orderLabels[0]}`}
                </div>
              </div>
              <button
                onClick={onClose}
                className="orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-full text-muted"
              >
                <X size={14} />
              </button>
            </div>

            {/* Progress */}
            <div className="flex items-center justify-between gap-2 px-4 pt-3 text-[10.5px] font-bold text-muted">
              <span>Packing checklist</span>
              <span className={allPacked ? "text-[#8fe3a0]" : "text-gold"}>
                {packedCount}/{items.length} packed
              </span>
            </div>
            <div className="mx-4 mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/30">
              <div
                className={`h-full rounded-full transition-all ${allPacked ? "bg-[#8fe3a0]" : "bg-orange"}`}
                style={{
                  width: `${items.length ? (packedCount / items.length) * 100 : 0}%`,
                }}
              />
            </div>

            {/* Item list */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="flex flex-col divide-y divide-white/[0.06]">
                {items.map((item) => {
                  const count = tally[item.key] || 0;
                  const isMulti = item.quantity > 1;
                  const isChecked = count >= item.quantity;
                  const Row = isMulti ? "div" : "button";

                  return (
                    <div key={item.key} className="flex flex-col gap-2.5 py-2.5 first:pt-0 last:pb-0">
                      <Row
                        type={isMulti ? undefined : "button"}
                        onClick={isMulti ? undefined : () => setItemCount(item, isChecked ? 0 : 1)}
                        className="flex w-full items-center gap-3 text-left"
                      >
                        <div className="orb-3d flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden !rounded-lg">
                          {item.image ? (
                            <LazyLoadImage
                              src={item.image}
                              alt={item.name}
                              effect="opacity"
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <span className="text-sm">🎆</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`line-clamp-1 text-[11.5px] font-bold ${isChecked ? "text-muted line-through" : "text-[#f2ece2]"}`}
                          >
                            {item.name}
                          </div>
                          {item.nameTa && (
                            <div className="line-clamp-1 text-[10px] font-semibold text-gold">
                              {item.nameTa}
                            </div>
                          )}
                        </div>
                        {!isMulti && (
                          <>
                            <div className="shrink-0 text-[11px] font-extrabold text-muted">Qty 1</div>
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                                isChecked
                                  ? "border-[#8fe3a0] bg-[#8fe3a0] text-black"
                                  : "border-gold/50 bg-white/10 text-transparent"
                              }`}
                            >
                              <Check size={14} strokeWidth={3} />
                            </span>
                          </>
                        )}
                      </Row>

                      {isMulti && (
                        <div className="pl-[52px]">
                          <TallyControl
                            quantity={item.quantity}
                            count={count}
                            onChange={(next) => setItemCount(item, next)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 border-t border-dashed border-white/10 p-4">
              <button
                onClick={handleSave}
                disabled={saving || marking || !dirty}
                className="btn-3d-outline flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                Save Progress
              </button>
              <button
                onClick={handleMarkPacked}
                disabled={!allPacked || saving || marking}
                title={
                  allPacked
                    ? "Move this order to Packed"
                    : "Check off every item first"
                }
                className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {marking ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <PackageCheck size={13} />
                )}
                Mark as Packed
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
