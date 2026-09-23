import { z } from 'zod';

const pincodeRegex = /^\d{6}$/;

// Address fields are optional here (unlike checkoutSchema/profileSchema) —
// admin may just want to fix the name for a customer whose address isn't
// on file yet, so nothing below forces every field to be filled in.
const optionalText = z.string().trim().optional().default('');

const optionalPincode = z
  .string()
  .trim()
  .optional()
  .default('')
  .refine((val) => !val || pincodeRegex.test(val), {
    message: 'Enter a valid 6-digit PIN code',
  });

export const adminUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(60, 'Name looks too long'),
  houseNumber: optionalText,
  street: optionalText,
  area: optionalText,
  city: optionalText,
  district: optionalText,
  state: optionalText,
  pincode: optionalPincode,
});

export const adminUserDefaultValues = {
  name: '',
  houseNumber: '',
  street: '',
  area: '',
  city: '',
  district: '',
  state: '',
  pincode: '',
};
