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
