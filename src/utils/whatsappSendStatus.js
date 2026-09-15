/**
 * The estimate-bill "sent to customer" tracking (billMessageSentAt /
 * billFileSentAt on the order doc — see markBillWhatsappSent in
 * ordersFirestore.js) is only meaningful while the order is still in the
 * pre-invoice bill stage. Once an invoice exists, that job is done and the
 * ticks stop being tracked/shown on the card, so status is "NA" from then on.
 *
 * Used by AdminOrderCard (to shape/badge the card) and AdminDashboard (to
 * power the WhatsApp-sent filter), so both stay in sync on one definition
 * of "fully sent".
 *
 * This is keyed off the *message* tick only (billMessageSentAt) — the bill
 * FILE tick (billFileSentAt) is tracked separately on the card but doesn't
 * factor into this status/filter. Previously "SENT" required both ticks,
 * which meant an order sat in "WA Pending" even after the message itself
 * had gone out, just because the file tick hadn't been ticked yet.
 *
 * Returns:
 *   'NA'      - order already has an invoice, tracking no longer applies
 *   'SENT'    - the bill message tick is ticked
 *   'PENDING' - still in bill stage and the message tick is missing
 */
export function getWhatsappSendStatus(order) {
  if (order?.invoiceId) return 'NA';
  return order?.billMessageSentAt ? 'SENT' : 'PENDING';
}
