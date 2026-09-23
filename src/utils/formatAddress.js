/** Joins the street-level parts of an address into one short line,
 * leaving city/district/state out — those are shown separately as
 * highlighted pills on the packing screen since that's the part staff
 * actually sort/segregate boxes by. */
export function formatStreetLine(address) {
  if (!address) return '';
  return [address.houseNumber, address.street, address.area]
    .filter(Boolean)
    .join(', ');
}

/** Joins every part of an address into one full line — the single-string
 * shape invoices store their `customer.address` as (see invoicesFirestore.js
 * and ordersFirestore.js's syncAddressToOrders, which both rely on this
 * producing identical output so a re-sync matches what a fresh invoice
 * would have been generated with). */
export function formatFullAddress(address) {
  if (!address) return '';
  return [
    address.houseNumber,
    address.street,
    address.area,
    address.city,
    address.district,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(', ');
}
