import { motion } from 'framer-motion';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/opacity.css';
import { Trash2, PackageCheck } from 'lucide-react';
import { showRemovedToast, showStockLimitToast } from '../../utils/cartToast';
import { useCartStore } from '../../store/useCartStore';
import QuantityStepper from './QuantityStepper';

const STOCK_LABEL = {
  in: { text: 'In Stock', className: 'text-[#8fe3a0]' },
  low: { className: 'text-gold' },
  out: { text: 'Out of Stock', className: 'text-[#e35226]' },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, x: -60, height: 0, marginBottom: 0, transition: { duration: 0.3, ease: 'easeIn' } },
};

export default function CartItem({ product, qty }) {
  const incrementQty = useCartStore((s) => s.incrementQty);
  const decrementQty = useCartStore((s) => s.decrementQty);
  const removeFromCart = useCartStore((s) => s.removeFromCart);

  const stock = STOCK_LABEL[product.stock] || STOCK_LABEL.in;
  const soldOut = product.stock === 'out';
  const stockCap = product.stockQty ?? 99;
  const stockLabelText = product.stock === 'low' ? `Only ${stockCap} Left` : stock.text;
  const atMax = qty >= stockCap;

  const lineMrp = product.mrp * qty;
  const lineSale = product.sale * qty;

  const handleRemove = () => {
    removeFromCart(product.id);
    showRemovedToast(product.name);
  };

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="group surface-3d relative overflow-hidden rounded-[20px] p-3 transition-shadow duration-300 hover:shadow-[0_0_22px_rgba(255,122,0,.22)]"
    >
      {/* Accent edge — replaces the old floating discount ribbon with a cleaner, integrated marker */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-gold via-orange to-accent opacity-70" />

      <div className="flex gap-3">
        <div className="orb-3d orb-cream relative flex h-[80px] w-[80px] shrink-0 items-center justify-center overflow-hidden !rounded-2xl">
          {product.img ? (
            <LazyLoadImage
              src={product.img}
              alt={product.name}
              effect="opacity"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="art-float text-2xl">🎆</span>
          )}

          {product.discountPercentage > 0 && (
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent py-1 text-center text-[9px] font-extrabold tracking-wide text-gold"
            >
              {product.discountPercentage}% OFF
            </div>
          )}

          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="rounded-full border border-white/20 bg-black/50 px-1.5 py-0.5 text-[8px] font-bold tracking-wide text-white">
                SOLD OUT
              </span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="line-clamp-2 text-[12.5px] font-bold leading-snug text-[#f2ece2]">
                {product.name}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted">
                <span className="truncate rounded-full bg-white/[0.05] px-1.5 py-[1px]">{product.category}</span>
                <span className={`font-bold ${stock.className}`}>{stockLabelText}</span>
              </div>
            </div>

            <button
              onClick={handleRemove}
              aria-label="Remove item"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03] text-[#e35226] transition-all duration-200 hover:border-[#e35226]/30 hover:bg-[#e35226]/10 active:scale-90"
            >
              <Trash2 size={13} strokeWidth={2.3} />
            </button>
          </div>

          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <div className="flex flex-col">
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <motion.span
                  key={lineSale}
                  initial={{ scale: 1.15 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="text-[15px] font-extrabold text-gold"
                >
                  ₹{lineSale}
                </motion.span>
                {lineMrp > lineSale && <s className="text-[10.5px] font-normal text-muted">₹{lineMrp}</s>}
              </div>
              <div className="text-[9px] text-muted">
                ₹{product.sale} × {qty} {product.unit ? `· ${product.unit}` : ''}
              </div>
            </div>

            <QuantityStepper
              qty={qty}
              disabled={soldOut}
              atMin={qty <= 1}
              atMax={atMax}
              onIncrement={() => {
                if (atMax) {
                  showStockLimitToast(product.name, stockCap);
                  return;
                }
                incrementQty(product.id);
              }}
              onDecrement={() => decrementQty(product.id)}
            />
          </div>

          {!soldOut && product.stock === 'in' && (
            <span className="mt-1.5 flex items-center gap-1 text-[9.5px] font-semibold text-[#8fe3a0]">
              <PackageCheck size={12} />
              Ready to ship
            </span>
          )}
          {!soldOut && product.stock === 'low' && (
            <span className="mt-1.5 flex items-center gap-1 text-[9.5px] font-semibold text-gold">
              <PackageCheck size={12} />
              {atMax ? `Max ${stockCap} per order` : `${stockCap - qty} more available`}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
