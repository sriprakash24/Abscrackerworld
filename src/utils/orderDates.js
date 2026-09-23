// Manual-payment orders are placed (logged in the DB) on one date but the
// customer often only actually pays a few days later, over WhatsApp. The
// order doc's `createdAt` only reflects the enquiry date, not the payment
// date — but the invoice number generated the moment admin taps "Confirm
// Payment Received" is stamped with the real confirmation date:
//
//   ABSI 2026 09 13 004  ->  "ABSI20260913004"
//          YYYY MM DD SEQ
//
// (see src/utils/sequentialId.js — orders use the same generator with the
// ABSO prefix, invoices use ABSI). The Packing screen cares about *when
// payment actually landed*, so it sorts/groups by this date instead of the
// enquiry date wherever a real invoice number is available.

const INVOICE_NO_PATTERN = /^ABSI(\d{4})(\d{2})(\d{2})/;

/**
 * Returns a Date for when this order's payment was actually confirmed,
 * derived from its invoice number when one exists. Falls back to
 * `updatedAt` (stamped on every status change, including the
 * AWAITING_ADMIN_CONFIRMATION -> CONFIRMED transition) and finally to
 * `createdAt` for orders that somehow have neither.
 */
export function getConfirmedDate(order) {
  // Admin can override the confirmation date when confirming payment (e.g.
  // approving today for a payment that actually landed a couple of days
  // ago). When that override is present it wins over everything else,
  // including the date baked into the invoice number.
  const override = order?.paymentConfirmedAt;
  if (override) {
    const overrideDate = override?.toDate ? override.toDate() : new Date(override);
    if (!Number.isNaN(overrideDate.getTime())) return overrideDate;
  }

  const match = INVOICE_NO_PATTERN.exec(order?.invoiceNo || "");
  if (match) {
    const [, y, m, d] = match;
    const parsed = new Date(Number(y), Number(m) - 1, Number(d));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const fallback = order?.updatedAt || order?.createdAt;
  if (fallback?.toDate) return fallback.toDate();
  if (fallback) {
    const d = new Date(fallback);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export function confirmedDateMillis(order) {
  const date = getConfirmedDate(order);
  return date ? date.getTime() : 0;
}

export function formatConfirmedDate(order) {
  const date = getConfirmedDate(order);
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** YYYY-MM-DD in local time — matches the value a native <input type="date"> gives you, for filtering. */
export function toDateInputValue(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
