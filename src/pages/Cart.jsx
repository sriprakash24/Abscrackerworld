import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useProducts } from '../contexts/ProductsContext';
import { useCartStore } from '../store/useCartStore';
import { useCartPricing } from '../hooks/useCartPricing';
import CartHeader from '../components/cart/CartHeader';
import CartItem from '../components/cart/CartItem';
import FreeDeliveryProgress from '../components/cart/FreeDeliveryProgress';
import CouponCard from '../components/cart/CouponCard';
import OrderSummary from '../components/cart/OrderSummary';
import RecommendedProducts from '../components/cart/RecommendedProducts';
import EmptyCart from '../components/cart/EmptyCart';
import EmberParticles from '../components/ui/EmberParticles';
import BottomNav from '../components/home/BottomNav';

export default function Cart() {
  const navigate = useNavigate();
  const cart = useCartStore((s) => s.cart);
  const pricing = useCartPricing();
  const { products } = useProducts();

  const isEmpty = pricing.items.length === 0;

  // "Recommended For You" — best sellers not already in the cart.
  const recommended = useMemo(() => {
    return products.filter((p) => p.bestSeller && p.stock !== 'out' && !cart[p.id]).slice(0, 10);
  }, [products, cart]);

  // "Frequently Bought Together" — items from the same categories as the cart.
  const frequentlyBought = useMemo(() => {
    const cartCategories = new Set(pricing.items.map(({ product }) => product.category));
    if (cartCategories.size === 0) return [];
    return products.filter(
      (p) => cartCategories.has(p.category) && p.stock !== 'out' && !cart[p.id]
    ).slice(0, 10);
  }, [products, pricing.items, cart]);

  if (isEmpty) {
    return (
      <div className="relative min-h-screen w-full pb-6">
        <CartHeader itemCount={0} onBack={() => navigate(-1)} />
        <EmptyCart />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full pb-28">
      <EmberParticles count={8} className="opacity-30" />

      <CartHeader itemCount={pricing.itemCount} onBack={() => navigate(-1)} />

      <FreeDeliveryProgress
        unlocked={pricing.freeDeliveryUnlocked}
        progressPct={pricing.deliveryProgressPct}
        amountRemaining={pricing.amountToFreeDelivery}
      />

      <div className="mt-3 flex flex-col gap-3 px-4">
        <AnimatePresence initial={false} mode="popLayout">
          {pricing.items.map(({ product, qty }) => (
            <CartItem key={product.id} product={product} qty={qty} />
          ))}
        </AnimatePresence>
      </div>

      <CouponCard />

      <OrderSummary pricing={pricing} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="px-4 pt-4"
      >
        <button
          onClick={() => navigate('/checkout')}
          className="btn-3d w-full rounded-xl py-3.5 text-[13px] font-extrabold text-black"
        >
          Proceed to Checkout · ₹{pricing.grandTotal}
        </button>
      </motion.div>

      <RecommendedProducts title="Frequently Bought Together" products={frequentlyBought} />
      <RecommendedProducts title="Recommended For You" products={recommended} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="px-4 pt-5 text-center"
      >
        <button
          onClick={() => navigate('/')}
          className="btn-3d-outline w-full rounded-xl py-3 text-[12px] font-bold text-gold"
        >
          Continue Shopping
        </button>
      </motion.div>

      <BottomNav />
    </div>
  );
}
