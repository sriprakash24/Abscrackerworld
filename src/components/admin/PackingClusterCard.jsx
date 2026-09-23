import { motion } from "framer-motion";
import { Merge, Split, Loader2, MapPin } from "lucide-react";
import PackingJobCard from "./PackingJobCard";
import { getClusterAccent } from "../../utils/packingAccent";
import { formatStreetLine } from "../../utils/formatAddress";

/**
 * Wraps every confirmed order from ONE customer (same mobile number).
 * Merging is never automatic — some customers place two orders on
 * different days but want them packed into the same box, others want two
 * boxes even though it's the same person, so the admin decides per
 * customer via the Merge toggle:
 *
 *  - OFF (default): one inner PackingJobCard per order, each with its own
 *    Start Packing checklist and its own progress.
 *  - ON: a single inner PackingJobCard covering the combined item list
 *    across every order in the cluster.
 *
 * Single-order clusters skip all of this and just render one plain job
 * card — there's nothing to merge/split.
 *
 * `index` gives every customer's block a distinct accent color (cycled
 * down the list) so scrolling past several customers in a row doesn't
 * read as one long identical dark-maroon wall — a quick color change is
 * enough to register "new customer" without reading the name each time.
 */
export default function PackingClusterCard({
  cluster,
  merged,
  togglingMerge,
  onToggleMerge,
  getPackedCount,
  onStartPacking,
  onQuickMarkPacked,
  quickMarkingKey,
  delay = 0,
  index = 0,
}) {
  const isMultiOrder = cluster.orders.length > 1;
  const accent = getClusterAccent(index);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="surface-3d relative flex flex-col gap-3 overflow-hidden rounded-2xl p-4"
      style={{ borderColor: `${accent.solid}55` }}
    >
      {/* Per-customer accent — left rail + top-corner wash, both tied to
          this cluster's color so it's visually its own block, not a
          repeat of the customer above/below it. */}
      <span
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[5px]"
        style={{ background: `linear-gradient(180deg, ${accent.from}, ${accent.to})` }}
      />
      <span
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: `radial-gradient(ellipse at top left, ${accent.wash}, transparent 55%)` }}
      />

      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2 pl-1.5">
        <div className="min-w-0 flex items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-black"
            style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
          >
            {(cluster.customerName || "?").trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-extrabold text-[#f2ece2]">
              {cluster.customerName}
            </div>
            <div className="text-[10px] text-muted">
              {cluster.mobile} · Confirmed {cluster.earliestConfirmedLabel}
            </div>
          </div>
        </div>

        {isMultiOrder && (
          <button
            onClick={onToggleMerge}
            disabled={togglingMerge}
            title={
              merged
                ? "Split back into separate boxes"
                : "Pack all of this customer's orders into one box"
            }
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10.5px] font-extrabold transition-all disabled:opacity-60 ${
              merged
                ? "border-[#8fe3a0]/45 bg-[#8fe3a0]/15 text-[#8fe3a0]"
                : "merge-available-pulse border-gold/60 bg-gradient-to-b from-gold/25 to-orange/15 text-gold"
            }`}
          >
            {togglingMerge ? (
              <Loader2 size={12} className="animate-spin" />
            ) : merged ? (
              <Split size={12} />
            ) : (
              <Merge size={12} />
            )}
            {merged ? "Merged — split" : `Merge ${cluster.orders.length} orders available`}
          </button>
        )}
      </div>

      {cluster.address && (cluster.address.city || cluster.address.district || formatStreetLine(cluster.address)) && (
        <div className="relative z-[1] flex flex-wrap items-center gap-1.5 pl-1.5">
          <MapPin size={12} className="shrink-0 text-muted" />
          {formatStreetLine(cluster.address) && (
            <span className="text-[10.5px] text-muted">{formatStreetLine(cluster.address)}</span>
          )}
          {cluster.address.city && (
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-extrabold"
              style={{ borderColor: `${accent.solid}70`, background: `${accent.solid}22`, color: accent.solid }}
            >
              {cluster.address.city}
            </span>
          )}
          {cluster.address.district && cluster.address.district !== cluster.address.city && (
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-extrabold"
              style={{ borderColor: `${accent.solid}70`, background: `${accent.solid}22`, color: accent.solid }}
            >
              {cluster.address.district}
            </span>
          )}
        </div>
      )}

      <div className={`relative z-[1] pl-1.5 ${isMultiOrder && !merged ? "flex flex-col gap-2.5" : ""}`}>
        {cluster.jobs.map((job, i) => (
          <PackingJobCard
            key={job.jobKey}
            job={job}
            slotIndex={i}
            showSlotLabel={isMultiOrder && !merged}
            packedCount={getPackedCount(job)}
            onStartPacking={() => onStartPacking(job)}
            onQuickMarkPacked={onQuickMarkPacked ? () => onQuickMarkPacked(job) : undefined}
            quickMarking={quickMarkingKey === job.jobKey}
          />
        ))}
      </div>
    </motion.div>
  );
}
