// Whether a customer has ever edited this order after placing it — the
// `edited` flag is written once by updateOrderItems (ordersFirestore.js)
// the first time the customer's "Edit Order" flow saves a change, and
// stays true from then on even if the order later gets edited again.
//
// Used by AdminOrderCard (badge) and AdminDashboard (the Edited-orders
// filter), same split as getWhatsappSendStatus, so both read one
// definition of "edited".
//
// Returns 'EDITED' | 'NOT_EDITED'.
export function getOrderEditStatus(order) {
  return order?.edited ? 'EDITED' : 'NOT_EDITED';
}
