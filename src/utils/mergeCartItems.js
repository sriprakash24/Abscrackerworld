/** Sums quantity for the same product across one or more orders' cartItems.
 * Shared by the admin Packing screen (src/pages/admin/AdminPacking.jsx) and
 * the customer-facing "packing list" download on Order History, so both
 * build the exact same item+quantity breakdown from the exact same orders. */
export function mergeCartItems(orders) {
  const itemMap = new Map();
  for (const order of orders) {
    for (const item of order.cartItems || []) {
      const key = item.productId || item.name;
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          key,
          name: item.name,
          nameTa: item.nameTa,
          image: item.image,
          quantity: 0,
        });
      }
      itemMap.get(key).quantity += item.quantity || 0;
    }
  }
  return Array.from(itemMap.values());
}
