import { z } from 'zod';

// Same PIN code rule used at checkout.
const pincodeRegex = /^\d{6}$/;

// Mobile isn't part of this schema — it's the customer's locked identity
// (Firestore doc id under users/{mobile}) and is rendered read-only in
// Profile.jsx rather than registered into this form.
export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Full name must be at least 3 characters')
    .max(60, 'Full name looks too long'),

  // Delivery address — same shape/validation as checkoutSchema's address
  // fields, so a profile edit and a checkout submission stay compatible.
  houseNumber: z.string().trim().min(1, 'Door / house number is required'),
  street: z.string().trim().min(1, 'Street is required'),
  area: z.string().trim().min(1, 'Area / locality is required'),
  city: z.string().trim().min(1, 'Village / town / city is required'),
  district: z.string().trim().min(1, 'District is required'),
  state: z.string().trim().min(1, 'State is required'),
  pincode: z
    .string()
    .trim()
    .min(1, 'PIN code is required')
    .regex(pincodeRegex, 'Enter a valid 6-digit PIN code'),
});

export const profileDefaultValues = {
  fullName: '',
  houseNumber: '',
  street: '',
  area: '',
  city: '',
  district: '',
  state: '',
  pincode: '',
};
