import { z } from 'zod';

// India-format mobile number: 10 digits, starting 6-9.
const mobileRegex = /^[6-9]\d{9}$/;
const pincodeRegex = /^\d{6}$/;

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

  // Delivery address
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

export const checkoutDefaultValues = {
  fullName: '',
  mobile: '',
  alternateMobile: '',
  houseNumber: '',
  street: '',
  area: '',
  city: '',
  district: '',
  state: '',
  pincode: '',
};
