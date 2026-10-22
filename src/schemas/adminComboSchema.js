import { z } from 'zod';

// Same number-input coercion the product form uses: react-hook-form gives us
// strings, we want numbers, with a friendly "required" message.
const numberField = (label, { min = 0, allowZero = true } = {}) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((val) => !Number.isNaN(Number(val)), `${label} must be a number`)
    .transform((val) => Number(val))
    .refine((val) => (allowZero ? val >= min : val > min), `${label} must be ${allowZero ? 'at least' : 'more than'} ${min}`);

const comboItemSchema = z.object({
  name: z.string().trim().max(120, 'Item name looks too long').optional(),
  qty: z.union([z.string(), z.number()]).optional(),
  image: z.string().trim().optional(),
  productId: z.string().optional(),
});

export const adminComboSchema = z
  .object({
    name: z.string().trim().min(2, 'Combo name must be at least 2 characters').max(80, 'Combo name looks too long'),
    nameTa: z.string().trim().max(120).optional(),
    badge: z.string().trim().max(20, 'Keep the badge under 20 characters').optional(),
    unit: z.string().trim().max(30).optional(),
    mrp: numberField('MRP', { min: 0, allowZero: false }),
    salePrice: numberField('Offer price', { min: 0, allowZero: false }),
    stockQty: numberField('Stock quantity', { min: 0, allowZero: true }),
    displayOrder: z
      .string()
      .trim()
      .optional()
      .refine((val) => !val || !Number.isNaN(Number(val)), 'Display order must be a number')
      .transform((val) => (val ? Number(val) : 0)),
    description: z.string().trim().max(500, 'Keep the description under 500 characters').optional(),
    image: z.string().trim().optional(),
    comboImage: z.string().trim().optional(),
    comboItems: z.array(comboItemSchema).optional(),
    hidden: z.boolean().optional(),
    bestSeller: z.boolean().optional(),
  })
  .refine((data) => data.salePrice <= data.mrp, {
    message: 'Offer price cannot be higher than MRP',
    path: ['salePrice'],
  });

export const adminComboDefaultValues = {
  name: '',
  nameTa: '',
  badge: '',
  unit: '1 COMBO',
  mrp: '',
  salePrice: '',
  stockQty: '50',
  displayOrder: '',
  description: '',
  image: '',
  comboImage: '',
  comboItems: [],
  hidden: false,
  bestSeller: false,
};

/** Maps a normalized combo product back into form values for editing. */
export function comboToFormValues(combo) {
  return {
    name: combo.name || '',
    nameTa: combo.nameTa || '',
    badge: combo.badge || '',
    unit: combo.unit || '1 COMBO',
    mrp: String(combo.mrp ?? ''),
    salePrice: String(combo.sale ?? ''),
    stockQty: String(combo.stockQty ?? ''),
    displayOrder: String(combo.displayOrder ?? ''),
    description: combo.description || '',
    image: combo.rawImage ?? '',
    comboImage: combo.rawComboImage ?? '',
    comboItems: (combo.comboItems || []).map((it) => ({
      name: it.name,
      qty: String(it.qty ?? 1),
      image: it.rawImage || '',
      productId: it.productId || '',
    })),
    hidden: !!combo.hidden,
    bestSeller: !!combo.bestSeller,
  };
}
