// Compares two cart-item snapshots (shape: [{ productId, name, quantity,
// unitPrice, lineTotal, ... }]) from before/after a customer edits an
// already-placed order — see updateOrderItems in ordersFirestore.js, which
// calls this right before overwriting an order's cartItems so the diff can
// be stored alongside the new pricing instead of recomputed later from two
// full snapshots every time a card renders.
//
// Returned shape is intentionally small (id/name/qty only, no pricing) since
// its only two jobs are: (1) let AdminOrderCard highlight which line items
// changed, and (2) render a one-line "what changed" summary in the edit
// history modal.
export function computeCartDiff(previousItems = [], newItems = []) {
  const prevById = new Map(previousItems.map((i) => [i.productId, i]));
  const newById = new Map(newItems.map((i) => [i.productId, i]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const item of newItems) {
    const prev = prevById.get(item.productId);
    if (!prev) {
      added.push({ productId: item.productId, name: item.name, quantity: item.quantity });
    } else if (prev.quantity !== item.quantity) {
      changed.push({
        productId: item.productId,
        name: item.name,
        fromQty: prev.quantity,
        toQty: item.quantity,
      });
    }
  }

  for (const item of previousItems) {
    if (!newById.has(item.productId)) {
      removed.push({ productId: item.productId, name: item.name, quantity: item.quantity });
    }
  }

  return {
    added,
    removed,
    changed,
    hasChanges: added.length > 0 || removed.length > 0 || changed.length > 0,
  };
}

/** One-line human summary of a diff object, e.g. "+2 items, 1 qty changed,
 * 1 removed" — used in the edit history modal and can double as a toast/
 * WhatsApp note. Returns null when nothing actually changed (e.g. the
 * customer opened edit and re-confirmed the same items). */
export function summarizeCartDiff(diff) {
  if (!diff?.hasChanges) return null;
  const parts = [];
  if (diff.added.length) parts.push(`+${diff.added.length} added`);
  if (diff.removed.length) parts.push(`-${diff.removed.length} removed`);
  if (diff.changed.length) parts.push(`${diff.changed.length} qty changed`);
  return parts.join(', ');
}
