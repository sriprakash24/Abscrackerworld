import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Minus, Plus, Search, Check } from 'lucide-react';

/**
 * Fast, category-wise way to add a batch of products to an invoice —
 * instead of adding one blank line at a time and hunting through a single
 * long dropdown for each one. Staff pick a category, tap + on however many
 * products they need (adjusting qty inline), then "Add N items" drops all
 * of them into the invoice at once. Built for phone-in orders with a lot of
 * line items (e.g. 30 products), where the old one-line-at-a-time flow was
 * slow.
 */
export default function InvoiceProductPickerModal({ open, products, onAdd, onClose }) {
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState({}); // { [productId]: qty }

  const categories = useMemo(() => {
    const names = [];
    for (const p of products) {
      if (p.category && !names.includes(p.category)) names.push(p.category);
    }
    return names;
  }, [products]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== 'ALL' && p.category !== category) return false;
      if (!term) return true;
      return p.name.toLowerCase().includes(term);
    });
  }, [products, category, search]);

  const selectedCount = Object.keys(selected).length;
  const selectedTotalQty = Object.values(selected).reduce((sum, q) => sum + q, 0);

  const setQty = (productId, qty) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
  };

  const handleClose = () => {
    setSelected({});
    setSearch('');
    setCategory('ALL');
    onClose();
  };

  const handleAdd = () => {
    if (selectedCount === 0) return;
    onAdd(Object.entries(selected).map(([productId, qty]) => ({ productId, qty })));
    handleClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="surface-3d flex w-full max-w-2xl flex-col rounded-2xl p-5 sm:p-6"
            style={{ maxHeight: '85vh' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-gradient-gold">Add products</h2>
              <button onClick={handleClose} className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted">
                <X size={14} />
              </button>
            </div>

            <div className="surface-3d mb-2.5 flex items-center gap-2 rounded-xl px-3.5 py-2.5">
              <Search size={14} className="shrink-0 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full bg-transparent text-[12.5px] font-semibold text-[#f2ece2] outline-none placeholder:text-muted placeholder:font-normal"
              />
            </div>

            <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setCategory('ALL')}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide transition-colors ${
                  category === 'ALL' ? 'border-orange/50 bg-orange/15 text-orange' : 'border-white/10 bg-[#0c0906] text-muted'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide transition-colors ${
                    category === c ? 'border-orange/50 bg-orange/15 text-orange' : 'border-white/10 bg-[#0c0906] text-muted'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-0.5">
              {visibleProducts.length === 0 ? (
                <div className="rounded-xl bg-black/20 px-3.5 py-6 text-center text-[11.5px] text-muted">No products found.</div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {visibleProducts.map((p) => {
                    const qty = selected[p.id] || 0;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                          qty > 0 ? 'border-orange/40 bg-orange/[0.06]' : 'border-white/10 bg-[#0c0906]'
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            qty > 0 ? 'border-orange/60 bg-orange/20 text-orange' : 'border-white/15 text-transparent'
                          }`}
                        >
                          <Check size={12} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11.5px] font-bold text-[#f2ece2]">{p.name}</div>
                          <div className="text-[10px] font-semibold text-muted">
                            {p.category} · ₹{p.sale}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-1 py-1">
                          <button
                            onClick={() => setQty(p.id, qty - 1)}
                            disabled={qty === 0}
                            className="orb-3d flex h-6 w-6 shrink-0 items-center justify-center !rounded-full text-orange disabled:opacity-30"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-4 text-center text-[11px] font-extrabold text-[#f2ece2]">{qty}</span>
                          <button
                            onClick={() => setQty(p.id, qty + 1)}
                            className="orb-3d flex h-6 w-6 shrink-0 items-center justify-center !rounded-full text-orange"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2.5">
              <button type="button" onClick={handleClose} className="btn-3d-outline flex-1 rounded-xl py-2.5 text-[12.5px] font-bold text-[#f2ece2]">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={selectedCount === 0}
                className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12.5px] font-bold text-white disabled:opacity-50"
              >
                Add {selectedCount > 0 ? `${selectedCount} product${selectedCount === 1 ? '' : 's'} (${selectedTotalQty} qty)` : 'products'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
