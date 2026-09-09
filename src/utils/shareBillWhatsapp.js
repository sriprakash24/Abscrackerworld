// Two separate, one-order-at-a-time "share this bill on WhatsApp" actions
// for the admin dashboard.
//
// There is no public WhatsApp link (wa.me or otherwise) that can push a
// file into a specific chat — wa.me only pre-fills text. So instead of one
// button that tries to do both at once, this exposes two:
//
//   1. sendBillMessage — opens the customer's WhatsApp chat with the
//      ready-made welcome/bill message pre-filled. Admin just taps Send.
//   2. sendBillFile — offers the native share sheet for the file (Android
//      Chrome/Samsung Internet, iOS Safari 15+), so the admin can pick
//      WhatsApp straight from the picker and land the file directly in the
//      customer's chat. Falls back to download + open-chat (no text) only
//      where the share sheet isn't supported, or doesn't complete.
import { getBillPdfBlob, getBillFilename } from "./generateBillPdf";

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

function getMobileDigits(order) {
  return (order.customer?.mobile || "").replace(/\D/g, "").slice(-10);
}

function openWhatsappChat(order, text = "") {
  const mobileDigits = getMobileDigits(order);
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  window.open(
    `https://wa.me/91${mobileDigits}${query}`,
    "_blank",
    "noopener,noreferrer",
  );
}

// function buildShareText(order) {
//   return `Hi ${order.customer?.name || ''}, please find the estimate bill for your order ${
//     order.orderId || order.id
//   } from ${'ABS Crackers World'}. Grand Total: Rs. ${Number(order.grandTotal || 0).toLocaleString('en-IN')} (Payment Pending).`;
// }

// NOTE: deliberately no emoji here. Emoji (especially the ones needing a
// surrogate pair — 🙏 🎉 🧾 💰 💳 📌 etc.) render as broken "�" boxes on
// some phones/WhatsApp builds. *text* is WhatsApp's own bold markdown, so
// it's plain ASCII underneath and renders correctly everywhere, no font or
// encoding dependency.
function buildShareText(order) {
  return `*அன்பிற்கினிய ${order.customer?.name || ""} அவர்களுக்கு, வணக்கம்!*

ABS Crackers World குடும்பத்திற்கு உங்களை அன்புடன் வரவேற்கிறோம்.

*உங்கள் கொண்டாட்டத்திற்கான Estimated Bill விவரங்கள்:*

Order ID: ${order.orderId || order.id}
Grand Total: ₹${Number(order.grandTotal || 0).toLocaleString("en-IN")}
Payment Status: Payment Pending

Please review your estimate and proceed with the payment at your convenience.

உங்கள் ஆர்டரை எங்களிடம் நம்பிக்கையுடன் வழங்கியதற்கு மிக்க நன்றி.
உங்கள் ஒவ்வொரு கொண்டாட்டமும் சிறப்பாக அமைய, எங்களால் முடிந்த சிறந்த சேவையை வழங்குவது எங்கள் மகிழ்ச்சி.

*ABS Crackers World*
Your Celebration, Our Responsibility!`;
}

/**
 * Button 1 — opens the customer's WhatsApp chat with the ready-made bill
 * message pre-filled. No file, no download. Admin just taps Send in
 * WhatsApp.
 */
export function sendBillMessage(order) {
  const text = buildShareText(order);
  openWhatsappChat(order, text);
}

// Some browsers (notably iOS Safari) have a known bug where cancelling the
// native share sheet sometimes never rejects the navigator.share() promise
// — it just hangs forever, silently, with no error to catch. That leaves
// the button stuck on its loading spinner indefinitely. This wraps the
// share call with a generous timeout so a genuinely hung promise can't
// block the admin forever — but it's set long on purpose: on desktop, the
// OS-level share panel (e.g. Windows' Share flyout) can take a while to
// render and for the admin to click through, and a short timeout would
// fire mid-pick and silently fall back to just downloading the file
// before the admin ever got to choose WhatsApp.
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
 * Button 2 — sends just the bill PDF. Where the device supports sharing a
 * file directly (Web Share API, level 2 — Android Chrome/Samsung Internet,
 * iOS Safari 15+), the admin gets the native share sheet and can pick the
 * customer's WhatsApp chat directly, no text attached.
 * Everywhere else (desktop, unsupported browsers, or if the native share
 * hangs/fails for any reason): the PDF downloads and the customer's
 * WhatsApp chat opens with no pre-filled text — the admin attaches the
 * file that just landed in Downloads and sends it.
 * Returns { method: 'share' | 'fallback' | 'cancelled' } so the caller can
 * decide what (if anything) to toast.
 */
export async function sendBillFile(order) {
  const filename = getBillFilename(order);
  const blob = getBillPdfBlob(order);
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
  openWhatsappChat(order);
  return { method: "fallback" };
}
