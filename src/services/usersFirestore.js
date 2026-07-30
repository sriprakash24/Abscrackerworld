// Firestore customer profile — users/{mobile}
//
// Written the moment a visitor submits the name + mobile bottom sheet
// (triggered on their first "Add to Cart" tap). No auth/OTP — the mobile
// number itself is used as the document id, and doubles as the `userId`
// that src/services/cartFirestore.js was already scaffolded to accept, so
// cart activity can now mirror to users/{mobile}/cart/{productId}.

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Creates/updates the customer profile doc. Keeps the original `createdAt`
 * on repeat visits (e.g. captured again after clearing local storage) and
 * always bumps `updatedAt` / `lastActiveAt`.
 */
export async function saveUserProfile(db, { name, mobile }) {
  if (!db || !mobile) return;
  const ref = doc(db, 'users', mobile);
  const existing = await getDoc(ref);

  await setDoc(
    ref,
    {
      name: name.trim(),
      mobile: mobile.trim(),
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );
}
