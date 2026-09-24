import { z } from 'zod';

// Same India-format mobile rule used at checkout — 10 digits, starting 6-9.
export const mobileRegex = /^[6-9]\d{9}$/;

const mobileField = z
  .string()
  .trim()
  .min(1, 'Mobile number is required')
  .regex(mobileRegex, 'Enter a valid 10-digit mobile number');

// First-time customer — this mobile number has no profile in Firestore yet,
// so we have nothing to fall back on and name stays mandatory.
export const customerSchemaNew = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(60, 'Name looks too long'),
  mobile: mobileField,
});

// Returning customer — the mobile number already matched a users/{mobile}
// profile doc, so we already have their name on file and don't need to ask.
export const customerSchemaReturning = z.object({
  name: z.string().trim().optional(),
  mobile: mobileField,
});

export const customerDefaultValues = {
  name: '',
  mobile: '',
};
