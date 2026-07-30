import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { subscribeToProducts, subscribeToCategoryOrder, groupByCategory } from '../services/products';
import { useCartStore } from '../store/useCartStore';

const ProductsContext = createContext(null);

/**
 * Subscribes once to the live `products` collection in Firestore (see
 * src/services/products.js) and shares the catalog — plus a derived
 * `categories` grouping — with every screen via useProducts().
 *
 * Also pushes the latest product list into useCartStore so cart pricing,
 * stock caps, etc. always read live data instead of a stale snapshot.
 */
export function ProductsProvider({ children }) {
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

  const categories = useMemo(() => groupByCategory(products, categoryOrder), [products, categoryOrder]);

  const value = useMemo(
    () => ({ products, categories, loading, error }),
    [products, categories, loading, error]
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within a ProductsProvider');
  return ctx;
}
