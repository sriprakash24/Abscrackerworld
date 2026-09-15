// Opens a customer's WhatsApp chat directly — no prefilled text, just the
// chat itself — so the admin can send whatever's actually needed for that
// moment (a delivery photo, a receipt, a quick note) themselves. Same
// last-10-digits + "91" country code convention already used for the
// invoice/bill WhatsApp shares (see shareInvoiceWhatsapp.js), pulled out
// here so the Delivery screen's per-customer chat button can reuse it
// without duplicating the digit-cleanup logic.

export function getMobileDigits(mobile) {
  return (mobile || "").replace(/\D/g, "").slice(-10);
}

export function getWhatsappChatUrl(mobile) {
  return `https://wa.me/91${getMobileDigits(mobile)}`;
}

export function openWhatsappChat(mobile) {
  window.open(getWhatsappChatUrl(mobile), "_blank", "noopener,noreferrer");
}
