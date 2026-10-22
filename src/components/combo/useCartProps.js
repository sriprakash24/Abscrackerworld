import { useCartStore } from '../../store/useCartStore';
import { useCustomerGateStore } from '../../store/useCustomerGateStore';
import { showAddedToast, showRemovedToast } from '../../utils/cartToast';
import { getOrderQtyCap } from '../../utils/productLimits';

/**
 * Everything <AddToCartButton /> needs for one product — the same wiring
 * category/ProductCard.jsx uses — packaged as a hook so the combo card and
 * the combo popup can both drive the same cart entry.
 */
export function useCartProps(product) {
  const inCart = useCartStore((s) => s.cart[product.id] || 0);
  const addToCart = useCartStore((s) => s.addToCart);
  const incrementQty = useCartStore((s) => s.incrementQty);
  const decrementQty = useCartStore((s) => s.decrementQty);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const requestDetails = useCustomerGateStore((s) => s.requestDetails);

  const soldOut = product.stock === 'out';
  const { cap: maxQty, limitedByOrder } = getOrderQtyCap(product);

  return {
    inCart,
    disabled: soldOut,
    maxQty,
    limitedByOrder,
    productName: product.name,
    onAdd: () =>
      requestDetails(() => {
        addToCart(product.id);
        showAddedToast(product.name);
      }),
    onIncrement: () => incrementQty(product.id),
    onDecrement: () => {
      if (inCart <= 1) {
        removeFromCart(product.id);
        showRemovedToast(product.name);
      } else {
        decrementQty(product.id);
      }
    },
    onSetQuantity: (qty) => setQuantity(product.id, qty),
  };
}
