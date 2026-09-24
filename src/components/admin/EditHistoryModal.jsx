import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, History, Plus, Minus, ArrowRightLeft } from "lucide-react";
import { db } from "../../firebase/config";
import { getOrderEditHistory } from "../../services/ordersFirestore";

function formatEditedAt(editedAt) {
  const date = editedAt?.toDate ? editedAt.toDate() : editedAt;
  if (!date) return "";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** One past edit: what changed, and the total before/after — newest entry
 * on top since getOrderEditHistory already orders by editedAt desc. */
function HistoryEntry({ entry }) {
  const { diff } = entry;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-black/20 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold text-[#f2ece2]">
          {formatEditedAt(entry.editedAt)}
        </span>
        <span className="text-[10px] text-muted">
          ₹{(entry.previousPricing?.grandTotal ?? 0).toLocaleString("en-IN")}
          {" → "}
          ₹{(entry.newPricing?.grandTotal ?? 0).toLocaleString("en-IN")}
        </span>
      </div>
      <div className="flex flex-col gap-1 text-[10.5px]">
        {diff?.added?.map((item) => (
          <div key={`add-${item.productId}`} className="flex items-center gap-1.5 text-[#8fe3a0]">
            <Plus size={11} /> {item.name} × {item.quantity}
          </div>
        ))}
        {diff?.removed?.map((item) => (
          <div key={`rem-${item.productId}`} className="flex items-center gap-1.5 text-[#e35226]">
            <Minus size={11} /> {item.name} × {item.quantity}
          </div>
        ))}
        {diff?.changed?.map((item) => (
          <div key={`chg-${item.productId}`} className="flex items-center gap-1.5 text-gold">
            <ArrowRightLeft size={11} /> {item.name}: {item.fromQty} → {item.toQty}
          </div>
        ))}
        {!diff?.added?.length && !diff?.removed?.length && !diff?.changed?.length && (
          <div className="text-muted">No item changes recorded for this edit.</div>
        )}
      </div>
    </div>
  );
}

/**
 * Full past-edit trail for one order — opened from AdminOrderCard's
 * "Edit History" action (shown once `order.edited` is true). Fetches
 * lazily on open via getOrderEditHistory (ordersFirestore.js), which reads
 * the orders/{orderId}/editHistory subcollection updateOrderItems writes
 * to on every customer-driven edit.
 */
export default function EditHistoryModal({ open, orderId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    getOrderEditHistory(db, orderId)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch((err) => {
        console.error("Failed to load edit history", err);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, orderId]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-[2px] sm:items-center sm:px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-[#150007] sm:rounded-2xl"
            style={{ maxHeight: "80vh" }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <History size={15} className="text-[#5AC8FA]" />
                <div>
                  <h2 className="text-[15px] font-extrabold text-gradient-gold">Edit History</h2>
                  <p className="text-[10.5px] text-muted">{orderId}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-muted">
                  <Loader2 size={14} className="animate-spin" /> Loading edits…
                </div>
              ) : error ? (
                <div className="rounded-xl bg-black/20 px-3.5 py-6 text-center text-[11.5px] text-muted">
                  Couldn't load edit history. Please try again.
                </div>
              ) : history.length === 0 ? (
                <div className="rounded-xl bg-black/20 px-3.5 py-6 text-center text-[11.5px] text-muted">
                  No item changes recorded yet.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {history.map((entry) => (
                    <HistoryEntry key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
