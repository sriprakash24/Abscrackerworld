import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Gift, ZoomIn, PackageCheck } from 'lucide-react';
import AddToCartButton from '../category/AddToCartButton';
import PriceSection from '../category/PriceSection';
import { useCartProps } from './useCartProps';

/**
 * The "View" popup for a combo — shows what's inside as the admin-uploaded
 * "what's inside" picture (tap to zoom) plus the itemised list with photos
 * and quantities, with the Add / stepper right there in the footer so a
 * customer can decide and add without closing it.
 */
export default function ComboModal({ open, product, onClose }) {
  const [zoom, setZoom] = useState(false);
  const cartProps = useCartProps(product);

  useEffect(() => {
    if (!open) setZoom(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && (zoom ? setZoom(false) : onClose());
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, zoom, onClose]);

  const items = product.comboItems || [];
  const contentsImage = product.comboImage || '';
  const totalPieces = items.reduce((sum, it) => sum + (it.qty || 1), 0);
  const hasContents = !!contentsImage || items.length > 0;
  // Portal into the phone-width shell (not <body>) so the sheet matches the
  // app's 430px column on desktop too.
  const target = typeof document !== 'undefined' ? document.getElementById('app-shell') || document.body : null;
  if (!target) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="combo-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[90] flex items-end justify-center bg-brown/55 backdrop-blur-[2px]"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} — items inside`}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90%] w-full flex-col overflow-hidden rounded-t-[26px] bg-bg shadow-[0_-20px_50px_-20px_rgba(113,50,31,0.5)]"
          >
            {/* header */}
            <div className="relative shrink-0 bg-gradient-to-br from-coral to-red px-4 pb-3 pt-4 text-white">
              <div className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white/60" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-white/85">
                    <Gift size={12} /> Combo ABS
                    {product.badge && (
                      <span className="rounded bg-[#ffd669] px-1.5 py-px text-[8.5px] text-[#4a1d10]">{product.badge}</span>
                    )}
                  </div>
                  <h2 className="mt-0.5 text-[16px] font-extrabold leading-tight">{product.name}</h2>
                  {product.nameTa && <p className="text-[11.5px] font-semibold text-white/90">{product.nameTa}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/25 text-white active:scale-90"
                >
                  <X size={16} strokeWidth={2.6} />
                </button>
              </div>
            </div>

            {/* scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-3">
              {contentsImage && (
                <div className="mb-3">
                  <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-orange">What's inside</p>
                  <button
                    type="button"
                    onClick={() => setZoom(true)}
                    className="relative block w-full overflow-hidden rounded-2xl border border-coral/40 bg-white shadow-[0_8px_20px_-12px_rgba(240,100,70,0.5)]"
                    aria-label="Zoom in on the items picture"
                  >
                    <img src={contentsImage} alt={`Items inside ${product.name}`} className="block max-h-[320px] w-full object-contain" />
                    <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-brown/75 px-2 py-1 text-[9.5px] font-bold text-white">
                      <ZoomIn size={11} /> Tap to zoom
                    </span>
                  </button>
                </div>
              )}

              {items.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-orange">
                      Items in this combo ({items.length})
                    </p>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-muted">
                      <PackageCheck size={11} /> {totalPieces} pcs total
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {items.map((it, i) => (
                      <li key={`${it.name}-${i}`} className="flex items-center gap-2.5 rounded-xl border border-coral/25 bg-white px-2.5 py-2">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-peach-light">
                          {it.image ? (
                            <img src={it.image} alt="" className="h-full w-full object-contain" loading="lazy" />
                          ) : (
                            <span className="text-lg">🎆</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 text-[12px] font-bold leading-snug text-brown">{it.name}</span>
                        <span className="shrink-0 rounded-full bg-gradient-to-br from-coral to-red px-2.5 py-1 text-[11px] font-extrabold text-white">
                          × {it.qty}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!hasContents && (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-coral/40 bg-white px-4 py-6 text-center">
                  {product.img ? (
                    <img src={product.img} alt={product.name} className="max-h-[200px] w-full object-contain" />
                  ) : (
                    <Gift size={36} className="text-coral" />
                  )}
                  <p className="text-[12px] font-semibold text-muted">
                    {product.description || 'The item list for this combo will be updated soon.'}
                  </p>
                </div>
              )}

              {hasContents && product.description && (
                <p className="mt-3 rounded-xl bg-peach-light px-3 py-2 text-[11.5px] font-medium leading-relaxed text-brown">
                  {product.description}
                </p>
              )}
            </div>

            {/* sticky footer: price + add */}
            <div className="shrink-0 border-t border-coral/25 bg-white px-4 pb-4 pt-2.5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <PriceSection mrp={product.mrp} sale={product.sale} discountPercentage={product.discountPercentage} />
                  <p className="text-[10px] font-semibold text-muted">{product.unit}</p>
                </div>
                <div className="flex w-[160px] shrink-0 flex-col">
                  <AddToCartButton {...cartProps} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* fullscreen zoom */}
          <AnimatePresence>
            {zoom && contentsImage && (
              <motion.div
                key="zoom"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom(false);
                }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-brown/90 p-3"
              >
                <img src={contentsImage} alt={`Items inside ${product.name}`} className="max-h-full max-w-full rounded-xl bg-white object-contain" />
                <button
                  type="button"
                  onClick={() => setZoom(false)}
                  aria-label="Close zoom"
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-brown"
                >
                  <X size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    target,
  );
}
