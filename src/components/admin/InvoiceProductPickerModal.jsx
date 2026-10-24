import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Minus, Plus, Search, Check } from 'lucide-react';

const PENDING_KEY = 'abs.invoice.picker.v1';

function readPending() {
  try {
    const v = JSON.parse(window.localStorage.getItem(PENDING_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

const QUICK_QTYS = [2, 5, 10, 15, 20, 25];

/**
 * Fast, category-wise way to add a batch of products to an invoice —
 * instead of adding one blank line at a time and hunting through a single
 * long dropdown for each one. Staff pick a category, tap + on however many
 * products they need (adjusting qty inline), then "Add N items" drops all
 * of them into the invoice at once. Built for phone-in orders with a lot of
 * line items (e.g. 30 products), where the old one-line-at-a-time flow was
 * slow.
 *
 * `inBill` ({ [productId]: qty }) is what's already on the invoice, so
 * re-opening the picker shows those products as "In bill ×N" instead of
 * looking untouched; taps here add on top of that quantity.
 *
 * Category chips wrap onto several rows (no sideways scrolling — there are
 * 17+ categories) and are pinned above the list so they stay visible while
 * typing; search spans every category and also matches Tamil names and the
 * admin-set keywords (Admin → Keywords).
 */
export default function InvoiceProductPickerModal({ open, products, inBill = {}, onAdd, onClose }) {
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  // Pending picks survive an accidental close / refresh (localStorage) until
  // they're added to the invoice or cleared with Cancel.
  const [selected, setSelected] = useState(readPending); // { [productId]: qty }

  useEffect(() => {
    try {
      if (Object.keys(selected).length) window.localStorage.setItem(PENDING_KEY, JSON.stringify(selected));
      else window.localStorage.removeItem(PENDING_KEY);
    } catch {
      /* storage unavailable */
    }
  }, [selected]);

  const categories = useMemo(() => {
    const names = [];
    for (const p of products) {
      if (p.category && !names.includes(p.category)) names.push(p.category);
    }
    return names;
  }, [products]);

  // Every typed word must match somewhere in name / Tamil name / category /
  // keywords, so "sparkler 10" or "kuruvi" style searches narrow down fast.
  const visibleProducts = useMemo(() => {
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      if (!tokens.length) return category === 'ALL' || p.category === category;
      const haystack = [p.name, p.nameTa, p.category, ...(p.keywords || [])].join(' ').toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [products, category, search]);

  // Per-category count of products already on the bill, shown on the chips.
  const billCountByCategory = useMemo(() => {
    const counts = {};
    for (const p of products) {
      if (inBill[p.id] || selected[p.id]) counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [products, inBill, selected]);

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

  // Closing with X / outside tap keeps the pending picks; only Cancel or
  // "Add" clears them.
  const handleClose = () => {
    setSearch('');
    setCategory('ALL');
    onClose();
  };

  const handleCancel = () => {
    setSelected({});
    handleClose();
  };

  const handleAdd = () => {
    if (selectedCount === 0) return;
    onAdd(Object.entries(selected).map(([productId, qty]) => ({ productId, qty })));
    setSelected({});
    handleClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-brown/60 px-3 py-3"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="surface-3d flex w-full max-w-2xl flex-col rounded-2xl p-4 sm:p-6"
            style={{ height: '92dvh', maxHeight: '92dvh' }}
          >
            <div className="mb-2.5 flex shrink-0 items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-gradient-gold">Add products</h2>
              <button type="button" onClick={handleClose} className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted">
                <X size={14} />
              </button>
            </div>

            <div className="surface-3d mb-2 flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5">
              <Search size={14} className="shrink-0 text-muted" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (e.target.value.trim()) setCategory('ALL');
                }}
                placeholder="Search name, Tamil name or keyword…"
                className="w-full bg-transparent text-[12.5px] font-semibold text-brown outline-none placeholder:text-muted placeholder:font-normal"
              />
            </div>

            {/* Pinned, wrapping category grid — never scrolls sideways, never collapses */}
            <div className="mb-2.5 grid shrink-0 grid-cols-3 gap-1.5 sm:grid-cols-4">
              <CategoryChip active={category === 'ALL' && !search.trim()} onClick={() => { setCategory('ALL'); setSearch(''); }} label="All" />
              {categories.map((c) => (
                <CategoryChip
                  key={c}
                  active={category === c && !search.trim()}
                  onClick={() => { setCategory(c); setSearch(''); }}
                  label={c}
                  count={billCountByCategory[c]}
                />
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
              {visibleProducts.length === 0 ? (
                <div className="rounded-xl bg-brown/8 px-3.5 py-6 text-center text-[11.5px] text-muted">No products found.</div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {visibleProducts.map((p) => {
                    const qty = selected[p.id] || 0;
                    const already = inBill[p.id] || 0;
                    return (
                      <div
                        key={p.id}
                        className={`flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-xl border px-3 py-2 transition-colors ${
                          qty > 0
                            ? 'border-orange/40 bg-orange/[0.06]'
                            : already > 0
                              ? 'border-emerald-500/40 bg-emerald-500/[0.07]'
                              : 'border-brown/12 bg-white'
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            qty > 0
                              ? 'border-orange/60 bg-orange/20 text-orange'
                              : already > 0
                                ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-600'
                                : 'border-brown/16 text-transparent'
                          }`}
                        >
                          <Check size={12} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11.5px] font-bold text-brown">{p.name}</div>
                          {p.nameTa && (
                            <div className="truncate text-[10px] font-semibold text-gold">{p.nameTa}</div>
                          )}
                          <div className="text-[10px] font-semibold text-muted">
                            {p.category}
                            <span className="ml-1.5 rounded-md bg-orange/15 px-1.5 py-0.5 text-[11px] font-extrabold text-[#c2410c]">₹{p.sale}</span>
                          </div>
                          {already > 0 && (
                            <div className="text-[10px] font-extrabold text-emerald-600">
                              In bill ×{already}
                              {qty > 0 && <span className="text-orange"> → ×{already + qty} after adding</span>}
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setQty(p.id, qty - 1)}
                            disabled={qty === 0}
                            className="orb-3d flex h-7 w-7 shrink-0 items-center justify-center !rounded-full text-orange disabled:opacity-30"
                          >
                            <Minus size={11} />
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={qty === 0 ? '' : qty}
                            placeholder="0"
                            onChange={(e) => setQty(p.id, Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                            onFocus={(e) => e.target.select()}
                            className="h-7 w-12 rounded-lg border border-brown/15 bg-white text-center text-[12px] font-extrabold text-brown outline-none focus:border-orange/60"
                          />
                          <button
                            type="button"
                            onClick={() => setQty(p.id, qty + 1)}
                            className="orb-3d flex h-7 w-7 shrink-0 items-center justify-center !rounded-full text-orange"
                          >
                            <Plus size={11} />
                          </button>
                        </div>

                        <div className="flex w-full flex-wrap gap-1 pl-[34px]">
                          {QUICK_QTYS.map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setQty(p.id, n)}
                              className={`h-6 min-w-8 rounded-full border px-2 text-[10.5px] font-bold transition-colors ${
                                qty === n ? 'border-orange/60 bg-orange/20 text-orange' : 'border-brown/15 bg-white text-muted'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-3 flex shrink-0 gap-2.5">
              <button type="button" onClick={handleCancel} className="btn-3d-outline flex-1 rounded-xl py-2.5 text-[12.5px] font-bold text-brown">
                Clear &amp; close
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

function CategoryChip({ active, onClick, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`relative flex min-w-0 items-center justify-center rounded-lg border px-1.5 py-1.5 text-[10.5px] font-bold leading-tight transition-colors ${
        active ? 'border-orange/60 bg-orange/15 text-orange' : 'border-brown/12 bg-white text-muted'
      }`}
    >
      <span className="truncate">{label}</span>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-extrabold text-white">
          {count}
        </span>
      )}
    </button>
  );
}
