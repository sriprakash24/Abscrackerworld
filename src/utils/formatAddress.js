// Addresses are now captured as ONE free-text box (checkout, profile, admin
// user edit) — delivery is by transport, so door-number / street / PIN
// granularity isn't needed. The text is stored on `address.fullAddress`.
//
// The older structured shape (houseNumber / street / area / city / ...) is
// still read everywhere so existing orders, invoices and profiles keep
// displaying correctly; new saves just leave those sub-fields empty.

/** Builds the stored address object from the single text box. */
export function textToAddress(text) {
  return {
    fullAddress: (text || '').trim(),
    houseNumber: '',
    street: '',
    area: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    landmark: '',
    deliveryNotes: '',
  };
}

/** Text for the address box — new free-text address, or old structured one joined up. */
export function addressToText(address) {
  if (!address) return '';
  return address.fullAddress || formatFullAddress(address);
}

/** Joins the street-level parts of an address into one short line,
 * leaving city/district/state out — those are shown separately as
 * highlighted pills on the packing screen since that's the part staff
 * actually sort/segregate boxes by. A free-text address is shown whole. */
export function formatStreetLine(address) {
  if (!address) return '';
  if (address.fullAddress) return address.fullAddress;
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
  if (address.fullAddress) return address.fullAddress;
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
