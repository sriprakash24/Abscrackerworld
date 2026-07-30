import { z } from 'zod';

// Same India-format mobile rule used at checkout — 10 digits, starting 6-9.
const mobileRegex = /^[6-9]\d{9}$/;

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(60, 'Name looks too long'),
  mobile: z
    .string()
    .trim()
    .min(1, 'Mobile number is required')
    .regex(mobileRegex, 'Enter a valid 10-digit mobile number'),
});

export const customerDefaultValues = {
  name: '',
  mobile: '',
};
