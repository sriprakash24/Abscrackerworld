import { z } from 'zod';

// India-format mobile number: 10 digits, starting 6-9.
const mobileRegex = /^[6-9]\d{9}$/;

const optionalMobile = z
  .string()
  .trim()
  .optional()
  .refine((val) => !val || mobileRegex.test(val), {
    message: 'Enter a valid 10-digit mobile number',
  });

export const checkoutSchema = z.object({
  // Customer information
  fullName: z
    .string()
    .trim()
    .min(3, 'Full name must be at least 3 characters')
    .max(60, 'Full name looks too long'),
  mobile: z
    .string()
    .trim()
    .min(1, 'Mobile number is required')
    .regex(mobileRegex, 'Enter a valid 10-digit mobile number'),
  alternateMobile: optionalMobile,

  // Delivery address — one free-text box (transport delivery, so no
  // door-number / street / PIN breakdown). Mandatory, otherwise anything goes.
  address: z
    .string()
    .trim()
    .min(1, 'Delivery address is required')
    .max(600, 'Address is too long'),
});

export const checkoutDefaultValues = {
  fullName: '',
  mobile: '',
  alternateMobile: '',
  address: '',
};
