import { z } from 'zod';

// Coerces the react-hook-form string value of a number input into a number,
// while still producing a friendly "required" message on empty input.
const numberField = (label, { min = 0, allowZero = true } = {}) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((val) => !Number.isNaN(Number(val)), `${label} must be a number`)
    .transform((val) => Number(val))
    .refine((val) => (allowZero ? val >= min : val > min), `${label} must be ${allowZero ? 'at least' : 'more than'} ${min}`);

export const adminProductSchema = z
  .object({
    name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(120, 'Product name looks too long'),
    category: z.string().trim().min(1, 'Please choose a category'),
    subcategory: z.string().trim().optional(),
    unit: z.string().trim().min(1, 'Unit is required (e.g. "1 PCS", "BOX")'),
    mrp: numberField('MRP', { min: 0, allowZero: false }),
    salePrice: numberField('Sale price', { min: 0, allowZero: false }),
    stockQty: numberField('Stock quantity', { min: 0, allowZero: true }),
    displayOrder: z
      .string()
      .trim()
      .optional()
      .refine((val) => !val || !Number.isNaN(Number(val)), 'Display order must be a number')
      .transform((val) => (val ? Number(val) : 0)),
    description: z.string().trim().max(500, 'Keep the description under 500 characters').optional(),
    image: z.string().trim().optional(),
    featured: z.boolean().optional(),
    bestSeller: z.boolean().optional(),
    newArrival: z.boolean().optional(),
    flashDeal: z.boolean().optional(),
  })
  .refine((data) => data.salePrice <= data.mrp, {
    message: 'Sale price cannot be higher than MRP',
    path: ['salePrice'],
  });

export const adminProductDefaultValues = {
  name: '',
  category: '',
  subcategory: '',
  unit: '',
  mrp: '',
  salePrice: '',
  stockQty: '',
  displayOrder: '',
  description: '',
  image: '',
  featured: false,
  bestSeller: false,
  newArrival: false,
  flashDeal: false,
};

/** Maps a normalized product (from services/products.js) back into form values for editing. */
export function productToFormValues(product) {
  return {
    name: product.name || '',
    category: product.category || '',
    subcategory: product.subcategory || '',
    unit: product.unit || '',
    mrp: String(product.mrp ?? ''),
    salePrice: String(product.sale ?? ''),
    stockQty: String(product.stockQty ?? ''),
    displayOrder: String(product.displayOrder ?? ''),
    description: product.description || '',
    image: product.rawImage ?? product.img ?? '',
    featured: !!product.featured,
    bestSeller: !!product.bestSeller,
    newArrival: !!product.newArrival,
    flashDeal: !!product.flashDeal,
  };
}
