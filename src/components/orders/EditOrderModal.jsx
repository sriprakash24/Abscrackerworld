import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Minus, Plus, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../firebase/config';
import { updateOrderItems } from '../../services/ordersFirestore';

/**
 * Lets a customer add/remove items on an order that's still awaiting
 * admin confirmation (i.e. before payment) — see OrderCard's "Edit
 * Order" button, which only shows while that's true. Same "search +
 * category filter + inline qty stepper" pattern as the admin invoice
 * product picker, themed for the customer-facing surfaces, so editing
 * an order feels like a natural extension of browsing the shop rather
 * than a bolted-on admin tool.
 */
export default function EditOrderModal({ open, order, products, onClose, onSaved }) {
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState({}); // { [productId]: qty }
  const [saving, setSaving] = useState(false);

  // Seed the editable quantities from the order's current items every
  // time the modal opens (not on every render) so re-opening after a
  // cancelled edit starts fresh from what's actually saved.
  useEffect(() => {
    if (!open) return;
    const initial = {};
    (order?.cartItems || []).forEach((item) => {
      initial[item.productId] = item.quantity;
    });
    setSelected(initial);
    setSearch('');
    setCategory('ALL');
  }, [open, order]);

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

  const productsById = useMemo(() => Object.fromEntries(products.map((p) => [String(p.id), p])), [products]);

  const setQty = (productId, qty) => {
    setSelected((prev) => {
      const next = { ...prev };
      const product = productsById[productId];
      const cap = product?.stockQty ?? 99;
      const clamped = Math.max(0, Math.min(qty, cap));
      if (clamped <= 0) delete next[productId];
      else next[productId] = clamped;
      return next;
    });
  };

  const selectedItems = useMemo(
    () =>
      Object.entries(selected)
        .map(([productId, qty]) => {
          const product = productsById[productId];
          return product ? { product, qty } : null;
        })
        .filter(Boolean),
    [selected, productsById]
  );

  const selectedCount = selectedItems.length;
  const previewTotal = selectedItems.reduce((sum, { product, qty }) => sum + product.sale * qty, 0);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSave = async () => {
    if (selectedCount === 0) {
      toast.error('Add at least one product before saving.');
      return;
    }
    setSaving(true);
    try {
      await updateOrderItems(db, order.id, selectedItems);
      toast.success('Order updated');
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to update order', err);
      toast.error("Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-[2px] sm:items-center sm:px-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="surface-3d flex w-full max-w-lg flex-col rounded-t-2xl p-5 sm:rounded-2xl"
            style={{ maxHeight: '88vh' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-extrabold text-gradient-gold">Edit Order</h2>
                <p className="text-[10.5px] text-muted">{order?.orderId || order?.id}</p>
              </div>
              <button onClick={handleClose} aria-label="Close" className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted">
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
                          qty > 0 ? 'border-gold/45 bg-gold/[0.08]' : 'border-white/10 bg-[#0c0906]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11.5px] font-bold text-[#f2ece2]">{p.name}</div>
                          {p.nameTa && (
                            <div className="truncate text-[10px] font-semibold text-gold">{p.nameTa}</div>
                          )}
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

            <div className="mt-4 flex items-center justify-between rounded-xl bg-black/20 px-3.5 py-2.5">
              <span className="text-[10.5px] font-semibold text-muted">
                {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
              </span>
              <span className="text-[13px] font-extrabold text-gradient-gold">₹{previewTotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="mt-3 flex gap-2.5">
              <button type="button" onClick={handleClose} disabled={saving} className="btn-3d-outline flex-1 rounded-xl py-2.5 text-[12.5px] font-bold text-[#f2ece2] disabled:opacity-60">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || selectedCount === 0}
                className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12.5px] font-bold text-white disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
