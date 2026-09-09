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
 *
 * Only the line items whose quantity actually changed since the last run
 * are written. Previously this re-wrote EVERY item in the cart on every
 * single change (e.g. bumping one item's quantity in a 6-item cart wrote
 * all 6 docs), which was needlessly multiplying Firestore writes.
 */
export function useCartFirestoreSync() {
  const cart = useCartStore((s) => s.cart);
  const getCartItems = useCartStore((s) => s.getCartItems);
  const mobile = useCustomerStore((s) => s.customer?.mobile);
  // Tracks { [productId]: qty } as of the last successful sync, so we can
  // diff against it instead of re-sending everything every time.
  const lastSyncedRef = useRef(new Map());

  useEffect(() => {
    if (!mobile) return;

    const items = getCartItems();
    const currentIds = new Set(items.map(({ product }) => String(product.id)));
    const lastSynced = lastSyncedRef.current;

    items.forEach(({ product, qty }) => {
      const id = String(product.id);
      if (lastSynced.get(id) === qty) return; // unchanged — skip the write
      syncCartItem(db, mobile, product, qty)
        .then(() => lastSyncedRef.current.set(id, qty))
        .catch(() => {});
    });

    lastSynced.forEach((_qty, id) => {
      if (!currentIds.has(id)) {
        deleteCartItem(db, mobile, id)
          .then(() => lastSyncedRef.current.delete(id))
          .catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, mobile]);
}
