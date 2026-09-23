// Firestore-backed merge state for the Order Management screen —
// orderMergeProgress/{mobileKey}
//
// One tiny doc per customer mobile number:
//
//   { mobile: "9876543210", merged: true, updatedAt }
//
// This is deliberately separate from packingProgress (src/services/
// packingFirestore.js), which merges CONFIRMED orders for the packing
// checklist. This collection instead drives merging AWAITING_ADMIN_
// CONFIRMATION orders — before payment — into a single combined estimate
// bill on the Order Management page (see MergedEstimateCard.jsx). The two
// stages are independent: an admin might want separate estimate bills sent
// out, then merge the same customer's orders once they're confirmed for
// packing, or vice versa.
//
// Merging is always an explicit admin action — never automatic — since two
// orders from the same number aren't necessarily meant to be combined.

import { doc, setDoc, collection, onSnapshot, serverTimestamp } from "firebase/firestore";

const COLLECTION = "orderMergeProgress";

/** Firestore doc ids can't contain slashes; strip anything unsafe defensively. */
export function orderMergeKeyForMobile(mobile) {
  return (mobile || "unknown").toString().trim().replace(/[^a-zA-Z0-9]/g, "") || "unknown";
}

/**
 * Live-subscribes to every order-merge doc — a tiny collection (one doc per
 * customer who currently has more than one awaiting-confirmation order),
 * safe to hold open for the lifetime of the admin panel.
 */
export function subscribeAllOrderMerges(db, onChange, onError) {
  if (!db) {
    onChange({});
    return () => {};
  }
  return onSnapshot(
    collection(db, COLLECTION),
    (snapshot) => {
      const byKey = {};
      snapshot.docs.forEach((d) => {
        byKey[d.id] = d.data();
      });
      onChange(byKey);
    },
    (err) => {
      console.error("Failed to load order-merge progress", err);
      onError?.(err);
    },
  );
}

/**
 * Sets whether this customer's awaiting-confirmation orders should be
 * combined into one estimate bill (merged) or shown/sent separately.
 */
export async function setOrderMergeToggle(db, mobile, merged) {
  const ref = doc(db, COLLECTION, orderMergeKeyForMobile(mobile));
  await setDoc(ref, { mobile: mobile || "", merged, updatedAt: serverTimestamp() }, { merge: true });
}
