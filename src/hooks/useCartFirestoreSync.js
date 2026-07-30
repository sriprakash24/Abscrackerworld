import { useEffect, useRef } from 'react';
import { useCartStore } from '../store/useCartStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { db } from '../firebase/config';
import { syncCartItem, deleteCartItem } from '../services/cartFirestore';

/**
 * Mirrors the local (zustand-persisted) cart to Firestore at
 * users/{mobile}/cart/{productId} — but only once a customer has been
 * captured via the Add-to-Cart bottom sheet. Runs silently in the
 * background; a failed write never blocks the local cart UX.
 */
export function useCartFirestoreSync() {
  const cart = useCartStore((s) => s.cart);
  const getCartItems = useCartStore((s) => s.getCartItems);
  const mobile = useCustomerStore((s) => s.customer?.mobile);
  const knownIdsRef = useRef(new Set());

  useEffect(() => {
    if (!mobile) return;

    const items = getCartItems();
    const currentIds = new Set(items.map(({ product }) => String(product.id)));

    items.forEach(({ product, qty }) => {
      syncCartItem(db, mobile, product, qty).catch(() => {});
    });

    knownIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        deleteCartItem(db, mobile, id).catch(() => {});
      }
    });

    knownIdsRef.current = currentIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, mobile]);
}
