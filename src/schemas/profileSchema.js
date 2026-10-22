import { z } from 'zod';

// Mobile isn't part of this schema — it's the customer's locked identity
// (Firestore doc id under users/{mobile}) and is rendered read-only in
// Profile.jsx rather than registered into this form.
export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Full name must be at least 3 characters')
    .max(60, 'Full name looks too long'),

  // Delivery address — one free-text box, same rule as checkoutSchema.
  address: z
    .string()
    .trim()
    .min(1, 'Delivery address is required')
    .max(600, 'Address is too long'),
});

export const profileDefaultValues = {
  fullName: '',
  address: '',
};
