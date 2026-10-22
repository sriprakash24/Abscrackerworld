// Invoice-wide constants — ABS Crackers World
//
// SHOP_INFO powers the invoice PDF header/footer (see src/utils/generateInvoicePdf.js).
// Fill in the real address/phone/WhatsApp/UPI details before going live —
// these currently mirror the placeholders on the printed invoice design.
export const SHOP_INFO = {
  name: "ABS CRACKERS WORLD",
  tagline: "Festival Fireworks Store",
  addressLine1: "Chinnakamanpatti",
  addressLine2: "Sivakasi - 626189, Tamil Nadu.",
  phone: "+91 9597189599",
  whatsapp: "+91 9597189599",
  upiId: "abscrackersworld@tmb",
  termsLine: "Goods once sold will not be taken back or exchanged.",
  thankYouLine: "Have a Safe & Prosperous Festival",
};

// Single place the shop's contact number is turned into links — the success
// screen, floating WhatsApp button and side menu all use these, so changing
// SHOP_INFO.whatsapp / SHOP_INFO.phone above updates every one of them.
const lastTenDigits = (s) => String(s).replace(/\D/g, "").slice(-10);
export const SHOP_WHATSAPP_URL = `https://wa.me/91${lastTenDigits(SHOP_INFO.whatsapp)}`;
export const SHOP_TEL_URL = `tel:+91${lastTenDigits(SHOP_INFO.phone)}`;

export const PAYMENT_MODES = ["CASH", "UPI", "CARD", "OTHER"];

export const PAYMENT_MODE_LABELS = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  OTHER: "Other",
};

export const INVOICE_SOURCE = {
  ORDER: "ORDER",
  MANUAL: "MANUAL",
};

/** Package/handling percentage default, matching the printed invoice's "PACKAGE % (3%)" line. */
export const DEFAULT_PACKAGE_PERCENT = 3;
