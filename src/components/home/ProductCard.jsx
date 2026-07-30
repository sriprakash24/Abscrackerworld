import { Heart } from 'lucide-react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/opacity.css';
import { toast } from 'sonner';
import { useCartStore } from '../../store/useCartStore';
import { useCustomerGateStore } from '../../store/useCustomerGateStore';
import { cn } from '../../utils/cn';
import AddToCartButton from '../category/AddToCartButton';

export default function ProductCard({ product }) {
  const inCart = useCartStore((s) => s.cart[product.id] || 0);
  const wished = useCartStore((s) => !!s.wishlist[product.id]);
  const addToCart = useCartStore((s) => s.addToCart);
  const incrementQty = useCartStore((s) => s.incrementQty);
  const decrementQty = useCartStore((s) => s.decrementQty);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const toggleWishlist = useCartStore((s) => s.toggleWishlist);
  const requestDetails = useCustomerGateStore((s) => s.requestDetails);

  const disc = product.mrp > product.sale ? Math.round(((product.mrp - product.sale) / product.mrp) * 100) : 0;
  const soldOut = product.stock === 'out';

  return (
    <div className="surface-3d relative flex flex-col overflow-hidden rounded-2xl p-2.5">
      {disc > 0 && (
        <div className="absolute left-2 top-2 z-10 rounded-md bg-gradient-to-b from-[#ff7a52] to-accent px-1.5 py-0.5 text-[9px] font-bold text-white shadow-[0_2px_6px_rgba(0,0,0,.5)]">
          {disc}% OFF
        </div>
      )}
      <button
        onClick={() => {
          toggleWishlist(product.id);
        }}
        className={cn(
          'absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/70 transition-transform active:scale-125',
          wished && 'text-accent'
        )}
      >
        <Heart size={14} fill={wished ? 'currentColor' : 'none'} />
      </button>

      <div className="orb-3d flex h-[86px] items-center justify-center overflow-hidden !rounded-xl">
        {product.img ? (
          <LazyLoadImage src={product.img} alt={product.name} effect="opacity" className="h-full w-full object-contain" />
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

      <div className="mt-2 line-clamp-2 text-[12px] font-bold leading-snug text-[#f2ece2]">
        {product.name}
      </div>
      <div className="text-[10px] text-muted">{product.unit}</div>
      <div className="mt-1 text-[13px] font-extrabold text-gold">
        <s className="mr-1 font-normal text-muted">₹{product.mrp}</s>₹{product.sale}
      </div>

      <AddToCartButton
        inCart={inCart}
        disabled={soldOut}
        maxQty={product.stockQty ?? 99}
        productName={product.name}
        onAdd={() => {
          requestDetails(() => {
            addToCart(product.id);
            toast.success(`${product.name} added to cart`);
          });
        }}
        onIncrement={() => incrementQty(product.id)}
        onDecrement={() => {
          if (inCart <= 1) {
            removeFromCart(product.id);
            toast(`${product.name} removed from cart`);
          } else {
            decrementQty(product.id);
          }
        }}
      />
    </div>
  );
}
