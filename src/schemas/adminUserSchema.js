import { z } from 'zod';

export const adminUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(60, 'Name looks too long'),
});

export const adminUserDefaultValues = {
  name: '',
};
