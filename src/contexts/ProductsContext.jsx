import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { subscribeToProducts, subscribeToCategoryOrder, groupByCategory } from '../services/products';
import { useCartStore } from '../store/useCartStore';

const ProductsContext = createContext(null);

/**
 * Subscribes once to the live `products` collection in Firestore (see
 * src/services/products.js) and shares the catalog — plus a derived
 * `categories` grouping — with every screen via useProducts().
 *
 * By default, products marked `hidden` (see setProductHidden) are filtered
 * out of the `products`/`categories` the rest of the app sees — that's what
 * powers the admin "Hide" toggle actually hiding an item from customers.
 * Pass `includeHidden` (used by the /admin/* screens) to see every product,
 * hidden or not, so admins can still find and re-show them.
 *
 * Also pushes the *unfiltered* product list into useCartStore so a product
 * hidden after being added to someone's cart still resolves its name/price
 * there instead of silently disappearing.
 */
export function ProductsProvider({ children, includeHidden = false }) {
  const [products, setProducts] = useState([]);
  const [categoryOrder, setCategoryOrder] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const setStoreProducts = useCartStore((s) => s.setProducts);

  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      (nextProducts) => {
        setProducts(nextProducts);
        setStoreProducts(nextProducts);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[ProductsProvider] Firestore products subscription failed:', err);
        setError(err);
        setLoading(false);
      }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Non-fatal if this fails — categories just fall back to first-appearance
    // order (see groupByCategory), so no error state is set here.
    const unsubscribe = subscribeToCategoryOrder(
      (order) => setCategoryOrder(order),
      (err) => console.error('[ProductsProvider] Firestore category-order subscription failed:', err)
    );
    return unsubscribe;
  }, []);

  const visibleProducts = useMemo(
    () => (includeHidden ? products : products.filter((p) => !p.hidden)),
    [products, includeHidden]
  );

  const categories = useMemo(() => groupByCategory(visibleProducts, categoryOrder), [visibleProducts, categoryOrder]);

  const value = useMemo(
    () => ({ products: visibleProducts, categories, loading, error }),
    [visibleProducts, categories, loading, error]
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within a ProductsProvider');
  return ctx;
}
