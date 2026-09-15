// Firestore-backed packing state — packingProgress/{mobileKey}
//
// One doc per customer mobile number, holding everything the Packing screen
// needs to remember for that customer:
//
//   {
//     mobile: "9876543210",
//     merged: false,                       // admin's explicit choice — never auto-on
//     packedKeysMerged: ["p1", "p2"],       // ticks when merged=true
//     perOrder: {
//       "ABSO2026...": { packedKeys: ["p1"], updatedAt },   // ticks per order when merged=false
//       "ABSO2026...": { packedKeys: [],     updatedAt },
//     },
//     updatedAt,
//   }
//
// Merging is opt-in per customer (see PackingClusterCard's "Merge" toggle) —
// two orders from the same number are NOT combined automatically, since some
// customers want two separate boxes even when they share a mobile number.
// Keeping both the merge flag and both progress shapes in one small doc
// means switching the toggle later doesn't lose whichever progress was
// tracked under the other mode.
//
// Deliberately NOT written on every checkbox click — only when the admin
// taps "Save Progress" (see PackingChecklistModal) — so concurrent packers
// don't race each other with rapid writes. Unsaved ticks are cached in
// localStorage instead (src/utils/packingDraftStorage.js) purely as a
// refresh-safety net.

import {
  doc,
  setDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

const COLLECTION = "packingProgress";

/** Firestore doc ids can't contain slashes; mobile numbers won't normally
 * have anything else unsafe, but strip non-alphanumerics defensively. */
export function packingKeyForMobile(mobile) {
  return (mobile || "unknown").toString().trim().replace(/[^a-zA-Z0-9]/g, "") || "unknown";
}

/**
 * Live-subscribes to every packing-progress doc — small collection (one doc
 * per customer currently mid-pack), safe to hold open for the lifetime of
 * the admin panel alongside the orders/users listeners in AdminDataContext.
 */
export function subscribeAllPackingProgress(db, onChange, onError) {
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
      console.error("Failed to load packing progress", err);
      onError?.(err);
    },
  );
}

/**
 * Sets whether this customer's confirmed orders should be packed as one
 * merged job or as separate per-order jobs. Always an explicit admin action
 * — never defaulted to true — since some customers want separate boxes for
 * separate orders even if they share a mobile number.
 */
export async function setPackingMergeToggle(db, mobile, merged) {
  const ref = doc(db, COLLECTION, packingKeyForMobile(mobile));
  await setDoc(
    ref,
    { mobile: mobile || "", merged, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Saves which merged line-items are checked off. Pass `merged: true` to
 * save against the combined job for this customer, or `merged: false` with
 * an `orderId` to save that one order's own checklist. `packedKeys` is an
 * array of item keys (productId, or name when a product has no id) — not a
 * percentage — so reopening the checklist restores exactly which boxes were
 * ticked.
 */
export async function savePackingProgress(db, mobile, { merged, orderId, packedKeys }) {
  const ref = doc(db, COLLECTION, packingKeyForMobile(mobile));
  const patch = { mobile: mobile || "", updatedAt: serverTimestamp() };
  if (merged) {
    patch.packedKeysMerged = packedKeys;
  } else {
    // Dot-notation top-level keys let setDoc({merge:true}) patch just this
    // one order's nested entry without clobbering sibling orders already
    // stored under perOrder.
    patch[`perOrder.${orderId}.packedKeys`] = packedKeys;
    patch[`perOrder.${orderId}.updatedAt`] = serverTimestamp();
  }
  await setDoc(ref, patch, { merge: true });
}
