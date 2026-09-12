// "Share this invoice on WhatsApp" for the admin dashboard — the
// post-payment counterpart to shareBillWhatsapp.js's estimate-bill share.
//
// Same constraint as the bill share: there's no public WhatsApp link that
// can push a file into a specific chat, wa.me only pre-fills text. So this
// offers the native share sheet for the invoice PDF (Android Chrome/Samsung
// Internet, iOS Safari 15+) so the admin can pick WhatsApp straight from the
// picker and land the file directly in the customer's chat. Falls back to
// download + open-chat (no text) only where the share sheet isn't
// supported, or doesn't complete.
//
// Takes an `invoice` doc (invoices/{id}) — not an order — since invoice
// numbers, payment mode, and totals shown here can differ from the order
// after an admin edit (see updateInvoice in invoicesFirestore.js).
import { getInvoicePdfBlob, getInvoiceFilename } from "./generateInvoicePdf";

function getMobileDigits(invoice) {
  return (invoice.customer?.mobile || "").replace(/\D/g, "").slice(-10);
}

function openWhatsappChat(invoice) {
  const mobileDigits = getMobileDigits(invoice);
  window.open(
    `https://wa.me/91${mobileDigits}`,
    "_blank",
    "noopener,noreferrer",
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Same iOS Safari native-share-hang guard as shareBillWhatsapp.js — see
// that file for the full explanation. Kept in sync deliberately rather than
// shared, so either file can be tuned independently later.
const SHARE_TIMEOUT_MS = 120000; // 2 minutes — plenty of time to pick an app, still bounded

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Sends the invoice PDF to the customer on WhatsApp. Where the device
 * supports sharing a file directly (Web Share API, level 2), the admin gets
 * the native share sheet and can pick the customer's WhatsApp chat directly.
 * Everywhere else: the PDF downloads and the customer's WhatsApp chat opens
 * with no pre-filled text — the admin attaches the file that just landed in
 * Downloads and sends it.
 * Returns { method: 'share' | 'fallback' | 'cancelled' } so the caller can
 * decide what (if anything) to toast.
 */
export async function sendInvoiceFile(invoice) {
  const filename = getInvoiceFilename(invoice);
  const blob = getInvoicePdfBlob(invoice);
  const file = new File([blob], filename, { type: "application/pdf" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await withTimeout(
        navigator.share({ files: [file], title: filename }),
        SHARE_TIMEOUT_MS,
      );
      return { method: "share" };
    } catch (err) {
      // AbortError = admin cancelled the share sheet — respect that silently.
      if (err?.name === "AbortError") return { method: "cancelled" };
      // Timeout, or any other failure (unsupported target, etc.) — fall
      // through to the download + open-chat fallback below instead of
      // leaving admin stuck on a spinner that will never resolve.
      console.warn("navigator.share didn't complete, falling back:", err);
    }
  }

  downloadBlob(blob, filename);
  openWhatsappChat(invoice);
  return { method: "fallback" };
}
