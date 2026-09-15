/**
 * A product can be capped by two independent things:
 *  - `stockQty` — how many are physically left (existing behaviour)
 *  - `maxOrderQty` — an admin-set "don't let one customer order more than
 *    N of this" limit, set in bulk from the admin Order Limits screen
 *    (see pages/admin/AdminOrderLimits.jsx), stored per-product in
 *    Firestore. 0 / undefined means "no limit set".
 *
 * Every add-to-cart / stepper / quantity-input entry point should use the
 * *smaller* of the two, and know which one is actually binding so the UI
 * can explain the right reason ("Only 3 in stock" vs "Limit 5 per order").
 */
export function getOrderQtyCap(product) {
  const stockCap = Number(product?.stockQty ?? 99);
  const orderCap = Number(product?.maxOrderQty ?? 0);

  if (orderCap > 0 && orderCap < stockCap) {
    return { cap: orderCap, limitedByOrder: true };
  }
  return { cap: stockCap, limitedByOrder: false };
}
