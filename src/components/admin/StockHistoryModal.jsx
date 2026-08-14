import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, TrendingUp, TrendingDown, History } from 'lucide-react';
import { subscribeStockMovements } from '../../services/products';

function formatWhen(ts) {
  const d = ts?.toDate ? ts.toDate() : null;
  if (!d) return 'Just now';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function StockHistoryModal({ open, product, onClose }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !product?.id) return;
    setLoading(true);
    const unsubscribe = subscribeStockMovements(
      (data) => {
        setMovements(data);
        setLoading(false);
      },
      () => setLoading(false),
      { productId: product.id, max: 50 }
    );
    return () => unsubscribe?.();
  }, [open, product?.id]);

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
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="surface-3d flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl p-5 sm:rounded-2xl"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-orange">
                  <History size={16} />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-[13.5px] font-extrabold text-[#f2ece2]">Stock History</h3>
                  <p className="truncate text-[10.5px] font-semibold text-muted">
                    {product?.name}
                    {product?.nameTa && <span className="font-semibold text-gold"> · {product.nameTa}</span>}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-full text-[#f2ece2]">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
                  ))}
                </div>
              ) : movements.length === 0 ? (
                <p className="py-8 text-center text-[11.5px] text-muted">No stock changes logged for this product yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {movements.map((m) => {
                    const up = m.delta > 0;
                    return (
                      <div key={m.id} className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-[#0c0906] px-3 py-2.5">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            up ? 'bg-[#8fe3a0]/10 text-[#8fe3a0]' : 'bg-[#e35226]/10 text-[#e35226]'
                          }`}
                        >
                          {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11.5px] font-bold text-[#f2ece2]">
                            {m.previousQty} → {m.newQty}{' '}
                            <span className={up ? 'text-[#8fe3a0]' : 'text-[#e35226]'}>
                              ({up ? '+' : ''}{m.delta})
                            </span>
                          </p>
                          <p className="truncate text-[10px] font-semibold text-muted">
                            {formatWhen(m.createdAt)}{m.adminEmail ? ` · ${m.adminEmail}` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
