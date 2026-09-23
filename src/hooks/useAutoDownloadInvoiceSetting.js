import { useEffect, useState } from "react";

// Shared across every screen that has a "Confirm Payment" action (Payment
// Confirmation page, Order Management page) so the admin only has to set
// this once and it applies everywhere — same localStorage key both read
// from, so flipping it on one screen is instantly in effect on the other.
const STORAGE_KEY = "ams_auto_download_invoice";

export function useAutoDownloadInvoiceSetting() {
  const [autoDownloadInvoice, setAutoDownloadInvoice] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, autoDownloadInvoice ? "1" : "0");
    } catch {
      // localStorage unavailable (private mode, etc.) — setting just won't persist.
    }
  }, [autoDownloadInvoice]);

  // Pick up a change made on another open tab/screen (e.g. toggled on the
  // Payment Confirmation page while the Order Management page is also open).
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) setAutoDownloadInvoice(e.newValue === "1");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return [autoDownloadInvoice, setAutoDownloadInvoice];
}
