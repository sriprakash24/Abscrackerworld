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
