import { motion } from 'framer-motion';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/opacity.css';
import { showAddedToast, showRemovedToast } from '../../utils/cartToast';
import { useCartStore } from '../../store/useCartStore';
import { useCustomerGateStore } from '../../store/useCustomerGateStore';
import DiscountBadge from './DiscountBadge';
import WishlistButton from './WishlistButton';
import PriceSection from './PriceSection';
import AddToCartButton from './AddToCartButton';

const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const STOCK_LABEL = {
  in: { text: 'In Stock', className: 'text-[#8fe3a0]' },
  low: { className: 'text-gold' },
  out: { text: 'Sold Out', className: 'text-[#e35226]' },
};

export default function ProductCard({ product, theme }) {
  const inCart = useCartStore((s) => s.cart[product.id] || 0);
  const wished = useCartStore((s) => !!s.wishlist[product.id]);
  const addToCart = useCartStore((s) => s.addToCart);
  const incrementQty = useCartStore((s) => s.incrementQty);
  const decrementQty = useCartStore((s) => s.decrementQty);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const toggleWishlist = useCartStore((s) => s.toggleWishlist);
  const requestDetails = useCustomerGateStore((s) => s.requestDetails);

  const stock = STOCK_LABEL[product.stock] || STOCK_LABEL.in;
  const soldOut = product.stock === 'out';
  const stockLabelText = product.stock === 'low' ? `Only ${product.stockQty} Left` : stock.text;
  const accent = theme?.solid || 'var(--color-orange)';

  return (
    <motion.div
      id={`product-card-${product.id}`}
      variants={cardVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="surface-3d group relative flex flex-col overflow-hidden rounded-2xl p-2.5 transition-shadow duration-300"
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0 22px ${accent}48`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {/* Thin category-color edge — the quickest visual cue for which
          category this card belongs to when everything scrolls together
          on the home feed. */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[3px]"
        style={{ background: theme ? `linear-gradient(90deg, ${theme.from}, ${theme.to})` : accent }}
      />

      <DiscountBadge percent={product.discountPercentage} />
      <WishlistButton active={wished} onToggle={() => toggleWishlist(product.id)} />

      <div className="orb-3d relative flex h-[86px] items-center justify-center overflow-hidden !rounded-xl">
        {product.img ? (
          <LazyLoadImage
            src={product.img}
            alt={product.name}
            effect="opacity"
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <span className="art-float text-3xl">🎆</span>
        )}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <span className="rounded-full border border-white/20 bg-black/50 px-2 py-0.5 text-[9px] font-bold tracking-wide text-white">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      <div className="mt-2 line-clamp-2 min-h-[30px] text-[12px] font-bold leading-snug text-[#f2ece2]">
        {product.name}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted">{product.unit}</span>
        <span className={`text-[9.5px] font-bold ${stock.className}`}>{stockLabelText}</span>
      </div>

      <PriceSection mrp={product.mrp} sale={product.sale} discountPercentage={product.discountPercentage} />

      <AddToCartButton
        inCart={inCart}
        disabled={soldOut}
        maxQty={product.stockQty ?? 99}
        productName={product.name}
        onAdd={() => {
          requestDetails(() => {
            addToCart(product.id);
            showAddedToast(product.name);
          });
        }}
        onIncrement={() => incrementQty(product.id)}
        onDecrement={() => {
          if (inCart <= 1) {
            removeFromCart(product.id);
            showRemovedToast(product.name);
          } else {
            decrementQty(product.id);
          }
        }}
      />
    </motion.div>
  );
}
