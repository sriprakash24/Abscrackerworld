/**
 * Drives the admin Order Management page: for a given order `status`, what
 * single "advance" action is available, what it's called, and what patch it
 * writes to Firestore. Icons are attached in AdminOrderCard.jsx to keep this
 * file JSX-free (same pattern as orderStages.js).
 *
 * ORDER_FLOW mirrors the manual-payment lifecycle:
 *   AWAITING_ADMIN_CONFIRMATION -> CONFIRMED -> PACKED -> OUT_FOR_DELIVERY -> DELIVERED
 * CANCELLED can be reached from any non-final state.
 */
export const ORDER_FLOW = [
  'AWAITING_ADMIN_CONFIRMATION',
  'CONFIRMED',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const FINAL_STATUSES = ['DELIVERED', 'CANCELLED'];

export const NEXT_ACTION_BY_STATUS = {
  AWAITING_ADMIN_CONFIRMATION: {
    label: 'Confirm Payment Received',
    shortLabel: 'Confirm Payment',
    icon: 'CircleDollarSign',
    patch: { status: 'CONFIRMED', paymentStatus: 'RECEIVED' },
  },
  CONFIRMED: {
    label: 'Mark as Packed',
    shortLabel: 'Mark Packed',
    icon: 'PackageCheck',
    patch: { status: 'PACKED' },
  },
  PACKED: {
    label: 'Mark Out for Delivery',
    shortLabel: 'Out for Delivery',
    icon: 'Truck',
    patch: { status: 'OUT_FOR_DELIVERY' },
  },
  OUT_FOR_DELIVERY: {
    label: 'Mark Delivered',
    shortLabel: 'Mark Delivered',
    icon: 'CheckCheck',
    patch: { status: 'DELIVERED' },
  },
};

/** Order list/filter chips on the admin page — 'ALL' plus every real status. */
export const ADMIN_STATUS_FILTERS = [
  'ALL',
  'AWAITING_ADMIN_CONFIRMATION',
  'CONFIRMED',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

export function canAdvance(status) {
  return Boolean(NEXT_ACTION_BY_STATUS[status]);
}

export function canCancel(status) {
  return !FINAL_STATUSES.includes(status);
}

/**
 * Reverse of NEXT_ACTION_BY_STATUS — lets the admin undo an accidental tap
 * (e.g. "Confirm Payment" hit by mistake) by moving the order back one step
 * in ORDER_FLOW. Reverting out of CONFIRMED also resets paymentStatus back
 * to PENDING, mirroring what advancing into it set. Intentionally has no
 * entry for AWAITING_ADMIN_CONFIRMATION (nothing before it) or CANCELLED
 * (we don't track which stage an order was cancelled from).
 */
export const PREVIOUS_ACTION_BY_STATUS = {
  CONFIRMED: {
    label: 'Revoke payment confirmation',
    patch: { status: 'AWAITING_ADMIN_CONFIRMATION', paymentStatus: 'PENDING' },
  },
  PACKED: {
    label: 'Revoke — back to Confirmed',
    patch: { status: 'CONFIRMED' },
  },
  OUT_FOR_DELIVERY: {
    label: 'Revoke — back to Packed',
    patch: { status: 'PACKED' },
  },
  DELIVERED: {
    label: 'Revoke — back to Out for Delivery',
    patch: { status: 'OUT_FOR_DELIVERY' },
  },
};

export function canRevoke(status) {
  return Boolean(PREVIOUS_ACTION_BY_STATUS[status]);
}
