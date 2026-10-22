import { z } from 'zod';

export const adminUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(60, 'Name looks too long'),
  // Optional here — admin may just want to fix the name for a customer
  // whose address isn't on file yet.
  address: z.string().trim().max(600, 'Address is too long').optional().default(''),
});

export const adminUserDefaultValues = {
  name: '',
  address: '',
};
