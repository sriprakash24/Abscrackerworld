import { useCartStore } from '../store/useCartStore';

/**
 * Subscribes to cart + coupon state and returns the fully derived pricing
 * summary (subtotal, discount, packing charges, delivery, grand total...).
 * Recomputes whenever cart contents or the applied coupon changes.
 */
export function useCartPricing() {
  const cart = useCartStore((s) => s.cart);
  const couponCode = useCartStore((s) => s.couponCode);
  // Not read directly here, but subscribing ensures this hook re-renders
  // once the live Firestore catalog arrives/updates (see setProducts in
  // useCartStore.js) — getPricing() below reads it internally.
  const productsById = useCartStore((s) => s.productsById);
  const getPricing = useCartStore((s) => s.getPricing);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return getPricing();
}
