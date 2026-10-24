import { z } from 'zod';
import { PAYMENT_MODES, DEFAULT_PACKAGE_PERCENT } from '../constants/invoiceConstants';

const numberField = (label, { min = 0, allowZero = true } = {}) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((val) => !Number.isNaN(Number(val)), `${label} must be a number`)
    .transform((val) => Number(val))
    .refine((val) => (allowZero ? val >= min : val > min), `${label} must be ${allowZero ? 'at least' : 'more than'} ${min}`);

const optionalNumberField = (label) =>
  z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || !Number.isNaN(Number(val)), `${label} must be a number`)
    .transform((val) => (val ? Number(val) : 0));

export const invoiceItemSchema = z.object({
  productId: z.string().optional(),
  isCombo: z.boolean().optional(),
  isCustom: z.boolean().optional(), // temporary one-off line, not from the catalog
  description: z.string().trim().min(1, 'Description is required'),
  qty: numberField('Qty', { min: 0, allowZero: false }),
  rate: numberField('Rate', { min: 0, allowZero: false }),
});

/** Name used on the invoice when the counter staff leave the name blank. */
export const WALK_IN_CUSTOMER = 'Walk-in Customer';

// Signed on purpose: a positive value bumps the bill total (bargaining
// headroom), a negative one gives a discount. Blank/invalid -> 0.
const adjustmentField = z
  .string()
  .trim()
  .optional()
  .refine((val) => !val || !Number.isNaN(Number(val)), 'Adjustment must be a number')
  .transform((val) => (val ? Math.round(Number(val)) : 0));

export const invoiceSchema = z.object({
  // Name and mobile are both optional for counter/manual invoices — a
  // blank name falls back to "Walk-in Customer". A mobile, when given, must
  // still look like a real number (10-13 chars incl. country code).
  customerName: z.string().trim().optional(),
  customerMobile: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || (val.replace(/\D/g, '').length >= 10 && val.length <= 13), 'Enter a valid mobile number'),
  customerAddress: z.string().trim().optional(),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one item'),
  packagePercent: optionalNumberField('Package %'),
  adjustment: adjustmentField,
  paymentMode: z.enum(PAYMENT_MODES),
  transactionRef: z.string().trim().optional(),
  notes: z.string().trim().max(300, 'Keep notes under 300 characters').optional(),
});

export const invoiceDefaultValues = {
  customerName: '',
  customerMobile: '',
  customerAddress: '',
  items: [{ productId: '', description: '', qty: '1', rate: '' }],
  packagePercent: String(DEFAULT_PACKAGE_PERCENT),
  adjustment: '0',
  paymentMode: 'CASH',
  transactionRef: '',
  notes: '',
};

/** Maps a stored invoice doc back into form values for the edit modal. */
export function invoiceToFormValues(invoice) {
  return {
    customerName: invoice.customer?.name || '',
    customerMobile: invoice.customer?.mobile || '',
    customerAddress: invoice.customer?.address || '',
    items: (invoice.items || []).map((item) => ({
      productId: item.productId || '',
      isCombo: !!item.isCombo,
      description: item.description || '',
      qty: String(item.qty ?? ''),
      rate: String(item.rate ?? ''),
    })),
    packagePercent: String(invoice.packagePercent ?? DEFAULT_PACKAGE_PERCENT),
    adjustment: String(invoice.adjustmentAmount ?? 0),
    paymentMode: invoice.paymentMode || 'CASH',
    transactionRef: invoice.transactionRef || '',
    notes: invoice.notes || '',
  };
}

/** Maps validated form values into the shape invoicesFirestore.js's create/update functions expect. */
export function formValuesToInvoicePayload(values) {
  return {
    customer: {
      name: values.customerName || WALK_IN_CUSTOMER,
      mobile: values.customerMobile || '',
      address: values.customerAddress || '',
    },
    items: values.items.map((item, i) => ({
      id: `${i + 1}`,
      productId: item.productId || '',
      isCombo: !!item.isCombo,
      description: item.description,
      qty: item.qty,
      rate: item.rate,
      amount: Math.round(item.qty * item.rate),
    })),
    packagePercent: values.packagePercent,
    adjustmentAmount: values.adjustment || 0,
    paymentMode: values.paymentMode,
    transactionRef: values.transactionRef,
    notes: values.notes,
  };
}
