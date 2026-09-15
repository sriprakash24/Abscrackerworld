import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Download, Clock3, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_OPTIONS = [
  { key: 'includeAwaiting', label: 'Awaiting Confirmation', icon: Clock3, activeClass: 'border-gold/50 bg-gold/15 text-gold' },
  { key: 'includeConfirmed', label: 'Confirmed', icon: CheckCircle2, activeClass: 'border-[#8fe3a0]/50 bg-[#8fe3a0]/15 text-[#8fe3a0]' },
  { key: 'includeCancelled', label: 'Cancelled', icon: XCircle, activeClass: 'border-[#e35226]/50 bg-[#e35226]/15 text-[#e35226]' },
];

const METRIC_OPTIONS = [
  { key: 'both', label: 'Units + Order Count' },
  { key: 'qty', label: 'Units Only' },
  { key: 'orders', label: 'Order Count Only' },
];

/**
 * Pre-download customization dialog for the Product Insights PDF report.
 * Lets the admin choose which order statuses to include (any combination
 * of Awaiting / Confirmed / Cancelled), which numbers to show for each
 * (units, order count, or both), and whether to report on just the
 * currently filtered/searched list or the entire catalog.
 */
export default function ProductInsightsDownloadModal({ open, onClose, onDownload, filteredCount, totalCount, isFiltered }) {
  const [includeAwaiting, setIncludeAwaiting] = useState(true);
  const [includeConfirmed, setIncludeConfirmed] = useState(true);
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [metric, setMetric] = useState('both');
  const [scope, setScope] = useState(isFiltered ? 'filtered' : 'all');

  const statusState = { includeAwaiting, includeConfirmed, includeCancelled };
  const statusSetters = {
    includeAwaiting: setIncludeAwaiting,
    includeConfirmed: setIncludeConfirmed,
    includeCancelled: setIncludeCancelled,
  };

  const noStatusSelected = !includeAwaiting && !includeConfirmed && !includeCancelled;

  const handleDownload = () => {
    if (noStatusSelected) return;
    onDownload({
      includeAwaiting,
      includeConfirmed,
      includeCancelled,
      metric,
      scope,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="surface-3d w-full max-w-md rounded-2xl p-5 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-gradient-gold">Download Report</h2>
              <button type="button" onClick={onClose} className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted">
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <span className="mb-2 block text-[11px] font-bold tracking-wide text-[#cfc7bd]">Include Orders</span>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(({ key, label, icon: Icon, activeClass }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => statusSetters[key]((v) => !v)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                        statusState[key] ? activeClass : 'border-white/10 bg-[#0c0906] text-muted'
                      }`}
                    >
                      <Icon size={12} />
                      {label}
                    </button>
                  ))}
                </div>
                {noStatusSelected && (
                  <p className="mt-1.5 text-[10px] font-semibold text-[#e35226]">Pick at least one status to include.</p>
                )}
              </div>

              <div>
                <span className="mb-2 block text-[11px] font-bold tracking-wide text-[#cfc7bd]">Show</span>
                <div className="flex flex-col gap-1.5">
                  {METRIC_OPTIONS.map(({ key, label }) => (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[11.5px] font-semibold transition-colors ${
                        metric === key ? 'border-orange/50 bg-orange/10 text-[#f2ece2]' : 'border-white/10 bg-[#0c0906] text-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name="metric"
                        value={key}
                        checked={metric === key}
                        onChange={() => setMetric(key)}
                        className="accent-orange"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-2 block text-[11px] font-bold tracking-wide text-[#cfc7bd]">Products</span>
                <div className="flex flex-col gap-1.5">
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[11.5px] font-semibold transition-colors ${
                      scope === 'filtered' ? 'border-orange/50 bg-orange/10 text-[#f2ece2]' : 'border-white/10 bg-[#0c0906] text-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value="filtered"
                      checked={scope === 'filtered'}
                      onChange={() => setScope('filtered')}
                      className="accent-orange"
                    />
                    Current filtered list ({filteredCount})
                  </label>
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[11.5px] font-semibold transition-colors ${
                      scope === 'all' ? 'border-orange/50 bg-orange/10 text-[#f2ece2]' : 'border-white/10 bg-[#0c0906] text-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value="all"
                      checked={scope === 'all'}
                      onChange={() => setScope('all')}
                      className="accent-orange"
                    />
                    All products ({totalCount})
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button type="button" onClick={onClose} className="btn-3d-outline flex-1 rounded-xl py-2.5 text-[12.5px] font-bold text-[#f2ece2]">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={noStatusSelected}
                className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12.5px] font-bold text-white disabled:opacity-60"
              >
                <Download size={13} />
                Download PDF
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
