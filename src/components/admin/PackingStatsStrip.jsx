import { PackageOpen, Loader, PackageCheck } from "lucide-react";

/**
 * Compact status strip for the Packing screen: of all the packing jobs
 * currently built from confirmed orders, how many haven't been started,
 * how many are partway through (some but not all items ticked and
 * saved), and how many have every item saved as packed already but are
 * still sitting here waiting for "Mark as Packed" to actually move them
 * out. Counts every job regardless of the active search/date/location
 * filters, so it always reflects the full packing workload — not just
 * whatever's currently narrowed into view.
 */
export default function PackingStatsStrip({ pending, inProgress, completed }) {
  const stats = [
    { label: "Pending", value: pending, icon: PackageOpen, className: "text-gold" },
    { label: "In Progress", value: inProgress, icon: Loader, className: "text-orange" },
    { label: "Completed", value: completed, icon: PackageCheck, className: "text-[#8fe3a0]" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map(({ label, value, icon: Icon, className }) => (
        <div key={label} className="surface-3d flex items-center gap-2 rounded-xl px-2.5 py-2.5">
          <span className={`orb-3d flex h-7 w-7 shrink-0 items-center justify-center !rounded-full ${className}`}>
            <Icon size={13} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-extrabold text-[#f2ece2]">{value}</div>
            <div className="truncate text-[9px] font-semibold text-muted">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
