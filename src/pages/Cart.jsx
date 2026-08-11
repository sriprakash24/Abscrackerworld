import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useCartPricing } from '../hooks/useCartPricing';
import CartHeader from '../components/cart/CartHeader';
import CartItem from '../components/cart/CartItem';
import OrderSummary from '../components/cart/OrderSummary';
import CheckoutModal from '../components/cart/CheckoutModal';
import EmptyCart from '../components/cart/EmptyCart';
import EmberParticles from '../components/ui/EmberParticles';
import FestiveBackdrop from '../components/ui/FestiveBackdrop';
import BottomNav from '../components/home/BottomNav';

export default function Cart() {
  const navigate = useNavigate();
  const pricing = useCartPricing();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const isEmpty = pricing.items.length === 0;

  // Placing an order clears the cart (see CheckoutModal's onValid), which
  // makes `isEmpty` flip to true right as the success screen should be
  // showing. Without the `!checkoutOpen` guard here, this early return
  // would unmount CheckoutModal — and the OrderSuccessScreen inside it —
  // the instant the order goes through, dumping the user back onto an
  // empty-cart page instead of their confirmation. Keep the modal mounted
  // (with EmptyCart underneath, out of view behind it) until the user
  // closes it themselves.
  if (isEmpty && !checkoutOpen) {
    return (
      <div className="relative min-h-screen w-full pb-6">
        <FestiveBackdrop />
        <CartHeader itemCount={0} onBack={() => navigate(-1)} />
        <EmptyCart />
        <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} pricing={pricing} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full pb-44">
      <FestiveBackdrop />
      <EmberParticles count={8} className="opacity-30" />

      <CartHeader itemCount={pricing.itemCount} onBack={() => navigate(-1)} />

      <div className="mt-3 flex flex-col gap-3 px-4">
        <AnimatePresence initial={false} mode="popLayout">
          {pricing.items.map(({ product, qty }) => (
            <CartItem key={product.id} product={product} qty={qty} />
          ))}
        </AnimatePresence>
      </div>

      <OrderSummary pricing={pricing} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="px-4 pt-4 text-center"
      >
        <button
          onClick={() => navigate('/')}
          className="btn-3d-outline w-full rounded-xl py-3 text-[12px] font-bold text-gold"
        >
          Continue Shopping
        </button>
      </motion.div>

      {/* Fixed total + checkout bar — always visible above the bottom nav */}
      <div className="fixed inset-x-0 bottom-[84px] z-40 mx-auto w-full max-w-[430px] px-4">
        <div
          className="panel-3d flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
          style={{ boxShadow: '0 12px 30px -10px rgba(0,0,0,.65), 0 0 20px rgba(255,122,0,.12)' }}
        >
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-wide text-muted">Grand Total</div>
            <motion.div
              key={pricing.grandTotal}
              initial={{ scale: 1.1, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="text-embossed truncate text-[17px] font-extrabold text-gold"
            >
              ₹{pricing.grandTotal}
            </motion.div>
          </div>
          <button
            onClick={() => setCheckoutOpen(true)}
            className="btn-3d shrink-0 rounded-xl px-5 py-3 text-[12.5px] font-extrabold text-black"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>

      <BottomNav />

      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} pricing={pricing} />
    </div>
  );
}
