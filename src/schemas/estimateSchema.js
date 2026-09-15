import { z } from 'zod';
import { DEFAULT_PACKAGE_PERCENT } from '../constants/estimateConstants';
import { invoiceItemSchema } from './invoiceSchema';

// Estimate bills reuse the exact same line-item shape as invoices (see
// invoiceSchema.js) since both are "customer + items + package %" — the
// only difference is estimates skip payment-mode fields entirely, since
// nothing has been paid yet.
export const estimateSchema = z.object({
  customerName: z.string().trim().min(2, 'Customer name must be at least 2 characters'),
  customerMobile: z.string().trim().min(10, 'Enter a valid mobile number').max(13, 'Enter a valid mobile number'),
  customerAddress: z.string().trim().optional(),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one item'),
  packagePercent: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || !Number.isNaN(Number(val)), 'Package % must be a number')
    .transform((val) => (val ? Number(val) : 0)),
  notes: z.string().trim().max(300, 'Keep notes under 300 characters').optional(),
});

export const estimateDefaultValues = {
  customerName: '',
  customerMobile: '',
  customerAddress: '',
  items: [{ productId: '', description: '', qty: '1', rate: '' }],
  packagePercent: String(DEFAULT_PACKAGE_PERCENT),
  notes: '',
};

/** Maps a stored estimate doc back into form values for the edit modal. */
export function estimateToFormValues(estimate) {
  return {
    customerName: estimate.customer?.name || '',
    customerMobile: estimate.customer?.mobile || '',
    customerAddress: estimate.customer?.address || '',
    items: (estimate.items || []).map((item) => ({
      productId: item.productId || '',
      description: item.description || '',
      qty: String(item.qty ?? ''),
      rate: String(item.rate ?? ''),
    })),
    packagePercent: String(estimate.packagePercent ?? DEFAULT_PACKAGE_PERCENT),
    notes: estimate.notes || '',
  };
}

/** Maps validated form values into the shape estimatesFirestore.js's create/update functions expect. */
export function formValuesToEstimatePayload(values) {
  return {
    customer: {
      name: values.customerName,
      mobile: values.customerMobile,
      address: values.customerAddress || '',
    },
    items: values.items.map((item, i) => ({
      id: `${i + 1}`,
      productId: item.productId || '',
      description: item.description,
      qty: item.qty,
      rate: item.rate,
      amount: Math.round(item.qty * item.rate),
    })),
    packagePercent: values.packagePercent,
    notes: values.notes,
  };
}
