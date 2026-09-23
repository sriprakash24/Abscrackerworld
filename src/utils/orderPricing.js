// Shared pricing-resolution logic for orders sitting in
// AWAITING_ADMIN_CONFIRMATION — used by AdminOrderCard (single order) and
// MergedEstimateCard (several orders combined into one estimate bill), so
// both stay in sync on how "today's price" vs "the price at checkout" is
// decided and displayed.
import { computeOrderPricing } from "../services/ordersFirestore";

/**
 * Recomputes an order's cartItems/totals from the live product catalog —
 * same numbers the customer would see if they checked out again right now.
 * Never touches Firestore itself.
 */
export function repriceFromCatalog(order, productsById) {
  const rawItems = order.cartItems || [];
  const pricingInputs = rawItems.map((item) => {
    const liveProduct = productsById[item.productId];
    return {
      product: liveProduct
        ? { id: liveProduct.id, mrp: liveProduct.mrp, sale: liveProduct.sale }
        // Product no longer in the catalog (e.g. deleted) — keep whatever
        // was billed originally rather than losing the line item.
        : { id: item.productId, mrp: item.mrp ?? item.unitPrice, sale: item.unitPrice },
      qty: item.quantity,
    };
  });
  const pricing = computeOrderPricing(pricingInputs);
  return {
    ...order,
    cartItems: rawItems.map((item, i) => ({
      ...item,
      unitPrice: pricing.cartItems[i].unitPrice,
      mrp: pricing.cartItems[i].mrp,
      lineTotal: pricing.cartItems[i].lineTotal,
    })),
    subtotal: pricing.subtotal,
    discount: pricing.discount,
    packingCharges: pricing.packingCharges,
    deliveryCharges: pricing.deliveryCharges,
    grandTotal: pricing.grandTotal,
    totalSavings: pricing.totalSavings,
  };
}

/**
 * Resolves the order the admin should actually see/send:
 *  - Not awaiting payment (already confirmed etc.) → the order as stored,
 *    untouched — its numbers are locked in for good.
 *  - Awaiting payment, and the admin has explicitly chosen to keep the
 *    original checkout price (`order.priceOverride === "original"`) → the
 *    order as stored, i.e. the price the customer was originally quoted.
 *  - Awaiting payment, no override (the default) → repriced against the
 *    live catalog, same as before this override existed.
 */
export function getEffectivePricedOrder(order, productsById) {
  const isAwaitingPayment = order.status === "AWAITING_ADMIN_CONFIRMATION";
  if (!isAwaitingPayment) return order;
  if (order.priceOverride === "original") return order;
  return repriceFromCatalog(order, productsById);
}
