import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Gift } from 'lucide-react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/opacity.css';
import AddToCartButton from '../category/AddToCartButton';
import PriceSection from '../category/PriceSection';
import ComboModal from './ComboModal';
import { useCartProps } from './useCartProps';

const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

/**
 * Card for one combo pack in the pinned "COMBO ABS" section: photo, name,
 * price, then the two buttons — Add (to cart) and View (opens the popup
 * that lists everything inside the combo as an image). Everything shown
 * here is managed from Admin → Combos.
 */
export default function ComboCard({ product, theme }) {
  const [viewOpen, setViewOpen] = useState(false);
  const cartProps = useCartProps(product);
  const accent = theme?.solid || 'var(--color-coral)';
  const itemCount = product.comboItems?.length || 0;
  const soldOut = product.stock === 'out';

  return (
    <>
      <motion.div
        id={`product-card-${product.id}`}
        variants={cardVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="surface-3d group relative flex flex-col overflow-hidden rounded-2xl p-2.5"
        style={{ borderColor: `${accent}80` }}
      >
        <span
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[5px]"
          style={{ background: 'linear-gradient(90deg, #ff8a65, #f04452)' }}
        />

        {/* Ribbon: admin-set badge (BEST VALUE…) or the discount */}
        {(product.badge || product.discountPercentage > 0) && (
          <div className="absolute left-2 top-3 z-10 flex flex-col items-start gap-1">
            {product.badge && (
              <span className="rounded-md bg-gradient-to-b from-[#ffd669] to-[#ffb347] px-1.5 py-0.5 text-[9px] font-extrabold uppercase leading-none tracking-wide text-[#4a1d10] shadow-[0_2px_6px_rgba(113,50,31,0.25)]">
                {product.badge}
              </span>
            )}
            {product.discountPercentage > 0 && (
              <span className="rounded-md bg-gradient-to-br from-coral to-red px-1.5 py-0.5 text-[9px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(240,68,82,0.35)]">
                {product.discountPercentage}% OFF
              </span>
            )}
          </div>
        )}

        {/* Photo — tapping it also opens the popup */}
        <button
          type="button"
          onClick={() => setViewOpen(true)}
          aria-label={`View items in ${product.name}`}
          className="relative z-[1] mt-2 block w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#fff7e8] via-[#ffe9d0] to-[#ffd4af] ring-1 ring-coral/30"
        >
          <div className="relative flex h-[118px] items-center justify-center">
            {product.img ? (
              <LazyLoadImage
                src={product.img}
                alt={product.name}
                effect="opacity"
                wrapperClassName="!block h-full w-full"
                className="h-full w-full object-contain p-1 transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <Gift size={38} className="art-float text-coral" />
            )}
            {soldOut && (
              <div className="absolute inset-0 flex items-center justify-center bg-brown/45">
                <span className="rounded-full border border-white/40 bg-brown/70 px-2 py-0.5 text-[9px] font-bold tracking-wide text-white">
                  SOLD OUT
                </span>
              </div>
            )}
          </div>
        </button>

        <div className="mt-2 line-clamp-2 min-h-[30px] text-[12px] font-bold leading-snug text-brown">
          {product.name}
        </div>
        {product.nameTa && (
          <div className="-mt-0.5 line-clamp-1 text-[10.5px] font-semibold leading-snug text-gold">
            {product.nameTa}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted">
            {itemCount > 0 ? `${itemCount} item${itemCount === 1 ? '' : 's'} inside` : product.unit}
          </span>
          {product.stock === 'low' ? (
            <span className="rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[9px] font-bold text-gold">
              {product.stockQty} left
            </span>
          ) : (
            <span className={`text-[9.5px] font-bold ${soldOut ? 'text-[#e35226]' : 'text-[#1E8E4A]'}`}>
              {soldOut ? 'Sold Out' : 'In Stock'}
            </span>
          )}
        </div>

        <PriceSection mrp={product.mrp} sale={product.sale} discountPercentage={0} />

        <AddToCartButton {...cartProps} />

        <button
          type="button"
          onClick={() => setViewOpen(true)}
          className="btn-3d-outline mt-1.5 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold"
        >
          <Eye size={13} className="text-red" />
          View Items
        </button>
      </motion.div>

      <ComboModal open={viewOpen} product={product} onClose={() => setViewOpen(false)} />
    </>
  );
}
