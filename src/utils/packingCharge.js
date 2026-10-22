// Single source of truth for the packing-charge rule.
//
//   • 3% packing applies to every normal product.
//   • Combo packs ("COMBO ABS") are exempt — a ₹7,000 combo adds exactly
//     ₹7,000 to the bill. In a mixed cart only the non-combo items are
//     charged packing.
import { COMBO_CATEGORY_NAME } from '../constants/catalog';

export const PACKING_CHARGE_RATE = 0.03;

/** True for a product / cart line that is a combo pack. */
export const isComboProduct = (p) => !!(p && (p.isCombo || p.category === COMBO_CATEGORY_NAME));

/** Sale-price total of the items that attract packing. `items` = [{ product, qty }]. */
export function packableSubtotal(items) {
  return items.reduce((sum, { product, qty }) => (isComboProduct(product) ? sum : sum + product.sale * qty), 0);
}

/** Sale-price total of the combo items (packing-exempt). */
export function comboSubtotal(items) {
  return items.reduce((sum, { product, qty }) => (isComboProduct(product) ? sum + product.sale * qty : sum), 0);
}

export function computePackingCharge(items, rate = PACKING_CHARGE_RATE) {
  return Math.round(packableSubtotal(items) * rate);
}

/** Invoice / estimate variant: items are `{ amount, isCombo }`. */
export function packableInvoiceAmount(items) {
  return (items || []).reduce((sum, it) => (it.isCombo ? sum : sum + Number(it.amount || 0)), 0);
}
