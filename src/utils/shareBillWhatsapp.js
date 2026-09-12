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
import { SHOP_INFO } from "../constants/invoiceConstants";

// Where the customer can view/download their estimate bill. There's no
// per-order route yet (only /orders, which lists whatever orders match the
// customer's mobile once they've identified themselves) — that's the
// closest we've got to a "bill link" without standing up file hosting.
const ORDERS_URL = "https://abscrackerworld.vercel.app/orders";

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

// The delivery address's "state" field is free text (see AddressForm —
// there's no dropdown, just a placeholder of "e.g. Tamil Nadu"), so admins
// have typed it every which way: "Tamil Nadu", "TAMILNADU", "tamil nadu ",
// "TN", etc. Normalize by lowercasing and stripping all whitespace before
// comparing, and accept the common abbreviation too.
function isTamilNaduOrder(order) {
  const state = (order.address?.state || "").toLowerCase().replace(/\s+/g, "");
  return state === "tamilnadu" || state === "tn";
}

// function buildShareText(order) {
//   return `Hi ${order.customer?.name || ''}, please find the estimate bill for your order ${
//     order.orderId || order.id
//   } from ${'ABS Crackers World'}. Grand Total: Rs. ${Number(order.grandTotal || 0).toLocaleString('en-IN')} (Payment Pending).`;
// }

// NOTE on emoji: tried twice — first fixing the source encoding (Unicode
// escapes instead of literal characters), then confirming it wasn't a
// copy/paste artifact. Still showed as "?" in the actual WhatsApp message
// on a real phone, which means the device itself has no glyph for those
// emoji — a font/rendering limitation on that phone, not something fixable
// from this file. Since this message goes out to customers on all kinds of
// phones (not just one known-good device), and it's already failing on at
// least one real phone, emoji aren't reliable here. Using WhatsApp's own
// bold markdown (*text*) for visual structure instead — that's plain ASCII
// underneath, so it renders identically on every device.

// NOTE on blank lines: wa.me strips genuinely empty lines when it pre-fills
// the compose box, collapsing any "\n\n" back down to a single line break —
// so a real blank line needs something invisible sitting on it. A
// zero-width space (U+200B) does that: WhatsApp renders it as nothing, but
// it stops the line from being empty and getting stripped.
const BLANK = "\u200B";

// NOTE on the UPI ID line: this used to also include a upi://pay deep link
// (tap the line to open a UPI app with the payee pre-filled, or with the
// bill amount pre-filled for a second "Tap to Pay" line). Pulled both back
// out for now — the UPI-side setup for that isn't finished yet, so the
// links weren't reliably opening a payment app. Once that's sorted, add the
// upi://pay link back onto this line (and optionally a second one with
// "&am=<amount>" appended for a one-tap "pay this exact bill" link).
// WhatsApp itself has no way to show custom "click here"-style hypertext —
// it only auto-links a *raw* URL/URI sitting in the plain text, so whatever
// link goes here will always be visible in full, not hidden behind a label.
//
// NOTE on language: the message below is Tamil. Orders whose delivery
// address state isn't Tamil Nadu get the English version further down —
// see isTamilNaduOrder / buildShareText.
function buildShareTextTamil(order) {
  const amount = Number(order.grandTotal || 0);

  return `அன்பிற்கினிய ${order.customer?.name || ""} அவர்களுக்கு, வணக்கம்!
ABS Crackers World குடும்பத்திற்கு உங்களை அன்புடன் வரவேற்கிறோம்!
${BLANK}
*Estimated Bill விவரங்கள்:*
Order ID: ${order.orderId || order.id}
Grand Total: ₹${amount.toLocaleString("en-IN")}
Payment Status: Payment Pending
Download Estimate Bill: ${ORDERS_URL}
${BLANK}
*Payment Details:*
UPI ID: ${SHOP_INFO.upiId}
${BLANK}
தயவுசெய்து உங்கள் Estimate-ஐ சரிபார்த்து, பணம் செலுத்தவும்.
பணம் செலுத்திய பிறகு payment screenshot எங்களுக்கு அனுப்பவும்.
உங்கள் நம்பிக்கைக்கும் ஆதரவிற்கும் மிக்க நன்றி!
${BLANK}
ABS Crackers World
Your Celebration, Our Responsibility!`;
}

// English counterpart for non-Tamil Nadu orders. Same structure and same
// fields as the Tamil version above, so keep the two in sync if either one
// changes.
function buildShareTextEnglish(order) {
  const amount = Number(order.grandTotal || 0);

  return `Dear ${order.customer?.name || ""}, greetings!
Welcome to the ABS Crackers World family!
${BLANK}
*Estimated Bill details:*
Order ID: ${order.orderId || order.id}
Grand Total: ₹${amount.toLocaleString("en-IN")}
Payment Status: Payment Pending
Download Estimate Bill: ${ORDERS_URL}
${BLANK}
*Payment Details:*
UPI ID: ${SHOP_INFO.upiId}
${BLANK}
Kindly review your estimate and proceed with the payment.
After making the payment, please send us a screenshot of the payment.
Thank you for your trust and support!
${BLANK}
ABS Crackers World
Your Celebration, Our Responsibility!`;
}

function buildShareText(order) {
  return isTamilNaduOrder(order)
    ? buildShareTextTamil(order)
    : buildShareTextEnglish(order);
}

/**
 * Button 1 — opens the customer's WhatsApp chat with the ready-made bill
 * message pre-filled (Tamil for Tamil Nadu addresses, English otherwise).
 * No file, no download. Admin just taps Send in WhatsApp.
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
