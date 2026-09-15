// Estimate Bill constants — ABS Crackers World.
//
// Estimate bills are pre-payment quotes for a customer (phone-in or
// walk-in), created the same way a manual invoice is, but before any
// money has changed hands. They share the shop header/branding with
// invoices (see invoiceConstants.js) but get their own numbering series
// (ABSE) so estimate numbers never collide with invoice numbers.
export { SHOP_INFO, DEFAULT_PACKAGE_PERCENT } from './invoiceConstants';

export const ESTIMATE_TERMS_LINE = 'This is an estimate only — prices and stock are subject to change until confirmed as an order.';
