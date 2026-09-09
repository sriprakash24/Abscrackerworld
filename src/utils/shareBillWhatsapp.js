// Manual, one-order-at-a-time "share this bill on WhatsApp" flow for the
// admin dashboard.
//
// There is no public WhatsApp link (wa.me or otherwise) that can push a
// file into a specific chat — wa.me only pre-fills text. The closest real
// equivalent is the device's native share sheet (Web Share API, level 2,
// which supports files): the admin taps one button, picks WhatsApp from
// the share sheet, then picks the customer's chat. That works on Android
// Chrome/Samsung Internet and iOS Safari 15+. Desktop browser support for
// sharing *files* this way is inconsistent, so there's a fallback: download
// the PDF and open the customer's WhatsApp chat (prefilled with a message),
// so the admin just attaches the file that's already in Downloads.
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

// function buildShareText(order) {
//   return `Hi ${order.customer?.name || ''}, please find the estimate bill for your order ${
//     order.orderId || order.id
//   } from ${'ABS Crackers World'}. Grand Total: Rs. ${Number(order.grandTotal || 0).toLocaleString('en-IN')} (Payment Pending).`;
// }

function buildShareText(order) {
  return `அன்பிற்கினிய ${order.customer?.name || ""} அவர்களுக்கு, வணக்கம் 🙏

✨ ABS Crackers World குடும்பத்திற்கு உங்களை அன்புடன் வரவேற்கிறோம்!

🎉 உங்கள் கொண்டாட்டத்திற்கான Estimated Bill விவரங்கள்:

🧾 Order ID: ${order.orderId || order.id}
💰 Grand Total: ₹${Number(order.grandTotal || 0).toLocaleString("en-IN")}
💳 Payment Status: Payment Pending

📌 Please review your estimate and proceed with the payment at your convenience.

உங்கள் ஆர்டரை எங்களிடம் நம்பிக்கையுடன் வழங்கியதற்கு மிக்க நன்றி. ❤️
உங்கள் ஒவ்வொரு கொண்டாட்டமும் சிறப்பாக அமைய, எங்களால் முடிந்த சிறந்த சேவையை வழங்குவது எங்கள் மகிழ்ச்சி. ✨

ABS Crackers World ❤️
Your Celebration, Our Responsibility!`;
}

/**
 * Shares the estimate bill PDF for `order` on WhatsApp.
 * Returns { method: 'share' | 'fallback' | 'cancelled' } so the caller can
 * decide what (if anything) to toast.
 */
export async function shareBillOnWhatsapp(order) {
  const filename = getBillFilename(order);
  const blob = getBillPdfBlob(order);
  const text = buildShareText(order);
  const mobileDigits = (order.customer?.mobile || "")
    .replace(/\D/g, "")
    .slice(-10);

  const file = new File([blob], filename, { type: "application/pdf" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename, text });
      return { method: "share" };
    } catch (err) {
      // AbortError = admin cancelled the share sheet — respect that silently.
      if (err?.name === "AbortError") return { method: "cancelled" };
      // Any other failure (unsupported target, etc.) — fall through to the
      // download + open-chat fallback below instead of leaving admin stuck.
    }
  }

  downloadBlob(blob, filename);
  window.open(
    `https://wa.me/91${mobileDigits}?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
  return { method: "fallback" };
}
