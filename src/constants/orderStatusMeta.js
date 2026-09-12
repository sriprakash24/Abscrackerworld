/**
 * Display metadata for an order's overall `status` field (as distinct from
 * the step-by-step `orderStage` driven through OrderStatusStepper).
 * Falls back gracefully for any future admin-set status we haven't
 * explicitly styled yet.
 */
export const ORDER_STATUS_META = {
  AWAITING_ADMIN_CONFIRMATION: {
    label: 'Awaiting Confirmation',
    emoji: '🟡',
    className: 'border-gold/35 bg-gold/10 text-gold',
  },
  CONFIRMED: {
    label: 'Confirmed',
    emoji: '🟢',
    className: 'border-[#8fe3a0]/35 bg-[#8fe3a0]/10 text-[#8fe3a0]',
  },
  PACKED: {
    label: 'Packed',
    emoji: '📦',
    className: 'border-orange/35 bg-orange/10 text-orange',
  },
  OUT_FOR_DELIVERY: {
    label: 'Out For Delivery',
    emoji: '🚚',
    className: 'border-orange/35 bg-orange/10 text-orange',
  },
  DELIVERED: {
    label: 'Delivered',
    emoji: '✅',
    className: 'border-[#8fe3a0]/35 bg-[#8fe3a0]/10 text-[#8fe3a0]',
  },
  CANCELLED: {
    label: 'Cancelled',
    emoji: '⛔',
    className: 'border-[#e35226]/40 bg-[#e35226]/10 text-[#e35226]',
  },
};

export function getOrderStatusMeta(status) {
  return ORDER_STATUS_META[status] || {
    label: 'Processing',
    emoji: '🟡',
    className: 'border-gold/35 bg-gold/10 text-gold',
  };
}

/**
 * Normalizes whatever is in an order's `orderStage` field to one of the
 * ids OrderStatusStepper understands. Older/initial orders are written
 * with `orderStage: 'ORDER_SUBMITTED'`, which predates the 4-step stepper,
 * so we map that (and anything unrecognized) to the first step.
 *
 * Once `status` moves past AWAITING_ADMIN_CONFIRMATION, payment has been
 * confirmed — so the stage returned here is 'DELIVERED' (the *next* stage
 * now in progress), which has the side effect of correctly marking
 * "Payment & Confirmation" as done rather than still-in-progress. See
 * `isOrderStageComplete` below for the final Order-Packed-&-Delivered tick.
 */
export function normalizeOrderStage(orderStage, status) {
  const KNOWN = ['RECEIVED', 'CONTACT', 'PAYMENT', 'DELIVERED'];
  if (KNOWN.includes(orderStage)) return orderStage;
  if (status === 'CONFIRMED' || status === 'PACKED' || status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED') {
    return 'DELIVERED';
  }
  return 'RECEIVED';
}

/**
 * Whether every stage — including the final "Order Packed & Delivered"
 * one — should render as complete (ticked) rather than the last one just
 * sitting there as "in progress". Only true once the order has actually
 * been delivered.
 */
export function isOrderStageComplete(status) {
  return status === 'DELIVERED';
}
