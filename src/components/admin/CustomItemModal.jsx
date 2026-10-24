import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Quick "custom item" dialog for the manual invoice — a temporary line
 * (name, qty, price) that lives only on that one invoice. Nothing is added
 * to the product catalog.
 */
export default function CustomItemModal({ open, onAdd, onClose }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [rate, setRate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setQty('1');
      setRate('');
      setError('');
    }
  }, [open]);

  const submit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const q = Number(qty);
    const r = Number(rate);
    if (!name.trim()) return setError('Enter the item name');
    if (!(q > 0)) return setError('Quantity must be more than 0');
    if (!(r > 0)) return setError('Enter the price');
    onAdd({ description: name.trim(), qty: q, rate: r });
    onClose();
  };

  const inputCls =
    'w-full rounded-xl border border-brown/12 bg-white px-3 py-2.5 text-[13px] font-semibold text-brown outline-none focus:border-orange/70';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[75] flex items-center justify-center bg-brown/60 px-4"
          onClick={onClose}
        >
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="surface-3d w-full max-w-sm rounded-2xl p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-extrabold text-gradient-gold">Custom item</h2>
                <p className="text-[10px] font-semibold text-muted">Only for this invoice — not added to products</p>
              </div>
              <button type="button" onClick={onClose} className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted">
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product name"
                className={inputCls}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="Quantity"
                  className={inputCls}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="Price ₹"
                  className={`${inputCls} !border-orange/40 !bg-orange/10 font-extrabold !text-[#c2410c]`}
                />
              </div>
              {error && <p className="text-[10.5px] font-semibold text-[#e35226]">{error}</p>}
            </div>

            <div className="mt-4 flex gap-2.5">
              <button type="button" onClick={onClose} className="btn-3d-outline flex-1 rounded-xl py-2.5 text-[12.5px] font-bold text-brown">
                Cancel
              </button>
              <button type="submit" className="btn-3d flex-1 rounded-xl py-2.5 text-[12.5px] font-bold text-white">
                Add to invoice
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
