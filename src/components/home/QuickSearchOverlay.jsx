import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Fuse from 'fuse.js';

/**
 * The compact search panel that opens from the search icon in the top
 * header (see TopBar / Home.jsx). Rendered once at the Home page level
 * so it's available no matter how far down the category list the user
 * has scrolled. Same Fuse.js search + "jump to product on the home feed"
 * behaviour as the main SearchBar, just in a compact overlay form instead
 * of full-width at the top of the page.
 */
export default function QuickSearchOverlay({ open, onClose, products = [] }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const fuse = useMemo(
    () => new Fuse(products, { keys: ['name', 'category'], threshold: 0.35 }),
    [products]
  );

  const results = useMemo(() => {
    if (!value.trim()) return [];
    return fuse.search(value.trim()).slice(0, 6).map((r) => r.item);
  }, [value, fuse]);

  useEffect(() => {
    if (open) {
      setValue('');
      // Small delay so the panel's enter transition has started before
      // the keyboard pops up on mobile — feels less abrupt.
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  const goToProduct = (product) => {
    onClose();
    const dispatchJump = () =>
      window.dispatchEvent(
        new CustomEvent('abs-search-jump', { detail: { productId: product.id } })
      );
    // The panel only ever opens while already on the home feed (it lives
    // inside CategoryGrid, which only renders on Home), so no route check
    // is needed here the way the main SearchBar needs one.
    dispatchJump();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
          />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-x-4 top-14 z-50 overflow-hidden rounded-[16px] border border-gold/60"
            style={{
              background: 'linear-gradient(180deg, rgba(120,42,24,.96), rgba(24,6,4,.98))',
              boxShadow: '0 16px 34px -10px rgba(0,0,0,.75)',
            }}
          >
            <div className="flex items-center gap-2.5 px-3.5 py-3">
              <Search size={16} strokeWidth={2.2} className="shrink-0 text-gold" />
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Search crackers, packs..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#f2e9da]/80"
              />
              <button type="button" onClick={onClose} aria-label="Close search" className="shrink-0 text-muted">
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            {value.trim() && (
              <div className="max-h-[50vh] overflow-y-auto border-t border-white/10">
                {results.length === 0 ? (
                  <div className="px-4 py-3.5 text-[12px] text-muted">
                    No crackers found for "{value.trim()}"
                  </div>
                ) : (
                  results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => goToProduct(p)}
                      className="flex w-full items-center gap-3 border-b border-white/5 px-3.5 py-2.5 text-left last:border-none active:bg-white/5"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/30">
                        {p.img ? (
                          <img src={p.img} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-base">🎆</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-[#f2ece2]">{p.name}</span>
                        {p.nameTa && (
                          <span className="block truncate text-[10px] font-semibold text-gold">{p.nameTa}</span>
                        )}
                        <span className="block text-[10px] text-muted">{p.category}</span>
                      </span>
                      <span className="shrink-0 text-[12px] font-extrabold text-gold">₹{p.sale}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
