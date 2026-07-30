import { z } from 'zod';

export const adminCategorySchema = z.object({
  categoryName: z
    .string()
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(40, 'Category name looks too long'),
});

export const adminCategoryDefaultValues = {
  categoryName: '',
};
