import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Pricing config — kept here so CartPage / OrderSummary / FreeDeliveryProgress
// all read from a single source of truth.
// ---------------------------------------------------------------------------
export const PACKING_CHARGE_RATE = 0.03; // 3% of MRP subtotal, always applied
export const FREE_DELIVERY_THRESHOLD = 999; // free delivery once payable total crosses this
export const STANDARD_DELIVERY_FEE = 49;

export const COUPONS = {
  DIWALI10: {
    code: 'DIWALI10',
    type: 'percent',
    value: 10,
    minOrder: 500,
    maxDiscount: 500,
    label: '10% OFF on orders above ₹500',
  },
  FIRST50: {
    code: 'FIRST50',
    type: 'flat',
    value: 50,
    minOrder: 300,
    maxDiscount: 50,
    label: 'Flat ₹50 OFF — first order',
  },
  BIGSAVE20: {
    code: 'BIGSAVE20',
    type: 'percent',
    value: 20,
    minOrder: 2000,
    maxDiscount: 1500,
    label: '20% OFF on orders above ₹2000',
  },
};

function computeCouponDiscount(coupon, payableSubtotal) {
  if (!coupon) return 0;
  if (payableSubtotal < coupon.minOrder) return 0;
  if (coupon.type === 'flat') return Math.min(coupon.value, coupon.maxDiscount ?? coupon.value);
  const pct = (payableSubtotal * coupon.value) / 100;
  return Math.round(Math.min(pct, coupon.maxDiscount ?? pct));
}

export const useCartStore = create(
  persist(
    (set, get) => ({
      cart: {}, // { [productId]: quantity }
      wishlist: {}, // { [productId]: true }
      lastAddedId: null,
      couponCode: null, // applied coupon code, e.g. "DIWALI10"
      couponStatus: null, // 'success' | 'error' | null
      couponMessage: null,

      // Live product catalog keyed by id — kept in sync with Firestore by
      // ProductsProvider (see src/contexts/ProductsContext.jsx) rather than
      // the old static mock catalog. Not persisted to localStorage.
      productsById: {},
      setProducts: (products) =>
        set({ productsById: Object.fromEntries(products.map((p) => [String(p.id), p])) }),

      addToCart: (id) =>
        set((state) => {
          const product = state.productsById[id];
          if (!product || product.stock === 'out') return state;
          const cap = product.stockQty ?? 99;
          const current = state.cart[id] || 0;
          if (current >= cap) return state;
          return {
            cart: { ...state.cart, [id]: current + 1 },
            lastAddedId: id,
          };
        }),

      removeFromCart: (id) =>
        set((state) => {
          const next = { ...state.cart };
          delete next[id];
          return { cart: next };
        }),

      incrementQty: (id) =>
        set((state) => {
          const product = state.productsById[id];
          if (!product || product.stock === 'out') return state;
          const current = state.cart[id] || 0;
          const cap = product.stockQty ?? 99;
          if (current >= cap) return state;
          return { cart: { ...state.cart, [id]: current + 1 } };
        }),

      decrementQty: (id) =>
        set((state) => {
          const current = state.cart[id] || 0;
          if (current <= 1) return state; // never go below 1 — use removeFromCart for that
          return { cart: { ...state.cart, [id]: current - 1 } };
        }),

      setQuantity: (id, qty) =>
        set((state) => {
          const product = state.productsById[id];
          const cap = product?.stockQty ?? 99;
          const clamped = Math.max(1, Math.min(Math.round(qty) || 1, cap));
          return { cart: { ...state.cart, [id]: clamped } };
        }),

      clearCart: () => set({ cart: {}, couponCode: null, couponStatus: null, couponMessage: null }),

      toggleWishlist: (id) =>
        set((state) => ({
          wishlist: { ...state.wishlist, [id]: !state.wishlist[id] },
        })),

      applyCoupon: (rawCode) => {
        const code = rawCode.trim().toUpperCase();
        const coupon = COUPONS[code];
        const { subtotalSale } = get().getPricing();

        if (!coupon) {
          set({ couponCode: null, couponStatus: 'error', couponMessage: 'Invalid coupon code' });
          return false;
        }
        if (subtotalSale < coupon.minOrder) {
          set({
            couponCode: null,
            couponStatus: 'error',
            couponMessage: `Add items worth ₹${coupon.minOrder - subtotalSale} more to use ${code}`,
          });
          return false;
        }
        set({ couponCode: code, couponStatus: 'success', couponMessage: coupon.label });
        return true;
      },

      removeCoupon: () => set({ couponCode: null, couponStatus: null, couponMessage: null }),

      cartCount: () => Object.values(get().cart).reduce((a, b) => a + b, 0),

      // Line items enriched with live product data (price, stock, etc).
      getCartItems: () => {
        const { cart, productsById } = get();
        return Object.entries(cart)
          .map(([id, qty]) => {
            const product = productsById[id];
            if (!product) return null;
            return { product, qty };
          })
          .filter(Boolean);
      },

      // Full derived pricing summary — the single source of truth for totals.
      getPricing: () => {
        const items = get().getCartItems();

        const subtotalMrp = items.reduce((sum, { product, qty }) => sum + product.mrp * qty, 0);
        // "amount" — the displayed/sale price total. This is the number the
        // cart total is built from directly (not derived by subtracting a
        // discount column from MRP).
        const subtotalSale = items.reduce((sum, { product, qty }) => sum + product.sale * qty, 0);
        const discount = Math.max(0, subtotalMrp - subtotalSale);
        // Shown to the customer as a % instead of a raw ₹ figure — avoids
        // odd-looking numbers like "₹18,000 OFF" on a ₹2,000 item.
        const discountPercentage = subtotalMrp > 0 ? Math.round((discount / subtotalMrp) * 100) : 0;

        // Packing charge is 3% of the amount (sale total), not MRP.
        const packingCharges = Math.round(subtotalSale * PACKING_CHARGE_RATE);

        // Delivery is disabled for now — pricing/threshold logic is kept
        // here (unused in the cart total) so it's ready to switch back on
        // once delivery charges are finalised.
        const freeDeliveryUnlocked = subtotalSale >= FREE_DELIVERY_THRESHOLD;
        const deliveryCharges = 0;
        const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotalSale);
        const deliveryProgressPct = Math.min(100, Math.round((subtotalSale / FREE_DELIVERY_THRESHOLD) * 100));

        const { couponCode } = get();
        const coupon = couponCode ? COUPONS[couponCode] : null;
        const couponDiscount = computeCouponDiscount(coupon, subtotalSale);

        // Grand total = amount + packing charge - coupon. No delivery added.
        const grandTotal = Math.max(0, subtotalSale + packingCharges - couponDiscount);
        const totalSavings = discount + couponDiscount;
        const totalSavingsPct = subtotalMrp > 0 ? Math.round((totalSavings / subtotalMrp) * 100) : 0;

        return {
          items,
          itemCount: items.reduce((a, { qty }) => a + qty, 0),
          subtotalMrp,
          subtotalSale,
          discount,
          discountPercentage,
          packingCharges,
          deliveryCharges,
          freeDeliveryUnlocked,
          amountToFreeDelivery,
          deliveryProgressPct,
          coupon,
          couponDiscount,
          grandTotal,
          totalSavings,
          totalSavingsPct,
        };
      },
    }),
    {
      name: 'abs_cart_wishlist',
      // Never persist the live Firestore product catalog — it's re-synced
      // by ProductsProvider on every load and would otherwise go stale.
      partialize: (state) => ({
        cart: state.cart,
        wishlist: state.wishlist,
        couponCode: state.couponCode,
        couponStatus: state.couponStatus,
        couponMessage: state.couponMessage,
      }),
    }
  )
);
