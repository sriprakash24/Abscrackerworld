import { useState } from 'react';
import { ChevronDown, ArrowUpDown, Tag, PackageCheck, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'discount-desc', label: 'Discount: High to Low' },
];

export const PRICE_RANGES = [
  { value: 'all', label: 'Any Price' },
  { value: '0-100', label: 'Under ₹100' },
  { value: '100-500', label: '₹100 – ₹500' },
  { value: '500-1500', label: '₹500 – ₹1500' },
  { value: '1500-99999', label: 'Above ₹1500' },
];

function Dropdown({ label, icon: Icon, active, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'btn-3d-outline flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[11.5px] font-bold text-[#e8ddce] transition-colors',
          active && 'border-orange text-orange'
        )}
        style={active ? { boxShadow: '0 0 0 1px rgba(255,122,0,.5), 0 0 14px rgba(255,122,0,.35)' } : undefined}
      >
        <Icon size={13} />
        {selected && selected.value !== 'all' && selected.value !== 'popular' ? selected.label : label}
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="panel-3d absolute left-0 top-full z-40 mt-2 w-[190px] overflow-hidden rounded-2xl p-1.5"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[12px] font-semibold text-[#ddd4c8] transition-colors',
                    opt.value === value && 'bg-orange/15 text-orange'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToggleChip({ label, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'btn-3d-outline flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[11.5px] font-bold text-[#e8ddce] transition-colors',
        active && 'border-gold text-[#1a0d00]'
      )}
      style={
        active
          ? { background: 'linear-gradient(180deg,#ffcf6b,#ff7a00)', boxShadow: '0 0 14px rgba(255,122,0,.45)' }
          : undefined
      }
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

export default function FilterBar({
  sort,
  onSortChange,
  priceRange,
  onPriceRangeChange,
  inStockOnly,
  onToggleInStock,
  bestOffersOnly,
  onToggleBestOffers,
}) {
  return (
    <div
      className="glass sticky top-[60px] z-20 flex gap-2 overflow-x-auto px-4 py-2.5"
      style={{ borderBottom: '1px solid rgba(255,154,0,.14)' }}
    >
      <Dropdown
        label="Sort"
        icon={ArrowUpDown}
        active={sort !== 'popular'}
        options={SORT_OPTIONS}
        value={sort}
        onChange={onSortChange}
      />
      <Dropdown
        label="Price"
        icon={Tag}
        active={priceRange !== 'all'}
        options={PRICE_RANGES}
        value={priceRange}
        onChange={onPriceRangeChange}
      />
      <ToggleChip label="In Stock" icon={PackageCheck} active={inStockOnly} onClick={onToggleInStock} />
      <ToggleChip label="Best Offers" icon={Sparkles} active={bestOffersOnly} onClick={onToggleBestOffers} />
    </div>
  );
}
