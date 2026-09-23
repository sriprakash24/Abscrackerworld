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

  // `id -> product` / `id -> nameTa` lookup maps, built once here and shared
  // by every consumer via context. Several admin screens (AdminOrderCard,
  // MergedEstimateCard — anywhere an order's cartItems get repriced or
  // matched against the live catalog) used to rebuild these same two maps
  // themselves with their own useMemo. That's harmless once mounted (each
  // component's own useMemo caches it), but on the Order Management page,
  // which can render hundreds of order cards at once, it meant hundreds of
  // redundant O(products) passes happening simultaneously on first paint —
  // a real contributor to that page's slow initial load. Computing it once
  // here means every card just reads the same object instead of rebuilding it.
  const productsById = useMemo(
    () => Object.fromEntries(visibleProducts.map((p) => [p.id, p])),
    [visibleProducts]
  );
  const nameTaById = useMemo(
    () => Object.fromEntries(visibleProducts.map((p) => [p.id, p.nameTa])),
    [visibleProducts]
  );

  const value = useMemo(
    () => ({ products: visibleProducts, categories, productsById, nameTaById, loading, error }),
    [visibleProducts, categories, productsById, nameTaById, loading, error]
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within a ProductsProvider');
  return ctx;
}
