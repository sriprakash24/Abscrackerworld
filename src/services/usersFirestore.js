// Firestore customer profile — users/{mobile}
//
// Written the moment a visitor submits the name + mobile bottom sheet
// (triggered on their first "Add to Cart" tap). No auth/OTP — the mobile
// number itself is used as the document id, and doubles as the `userId`
// that src/services/cartFirestore.js was already scaffolded to accept, so
// cart activity can now mirror to users/{mobile}/cart/{productId}.

import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, orderBy, onSnapshot } from 'firebase/firestore';

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

/**
 * Live-subscribes to every captured customer profile, newest first —
 * powers the admin Users page (total count + list).
 */
export function subscribeAllUsers(db, onChange, onError) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onChange(users);
    },
    (err) => {
      console.error('Failed to load users', err);
      onError?.(err);
    }
  );
}

/**
 * Edits a customer profile's name — and, from the admin Users page's edit
 * modal, their delivery address too — so a staff-side correction (e.g. a
 * misheard PIN code) stays in sync with whatever the customer sees on their
 * own "My Profile" page. Mobile number is the doc id and isn't editable
 * here. `address` is optional so the plain rename flow keeps working.
 */
export async function updateUserProfile(db, mobile, { name, address }) {
  const patch = { name: name.trim(), updatedAt: serverTimestamp() };
  if (address) patch.address = address;
  await updateDoc(doc(db, 'users', mobile), patch);
}

/**
 * Fetches a single customer profile doc by mobile — powers the customer-facing
 * "My Profile" page (see src/pages/Profile.jsx) so it can prefill the saved
 * name + delivery address. Returns null if this mobile has never been captured.
 */
export async function getUserProfile(db, mobile) {
  if (!db || !mobile) return null;
  const snap = await getDoc(doc(db, 'users', mobile));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Saves the customer's own edits from the "My Profile" page — name plus a
 * single reusable delivery `address` object (same shape as an order's
 * `address` field). Mobile stays the doc id and is never touched here; the
 * merge keeps `createdAt` if the doc already exists (e.g. from the earlier
 * name+mobile capture), same as saveUserProfile above.
 */
export async function saveUserAddress(db, mobile, { name, address }) {
  if (!db || !mobile) return;
  const ref = doc(db, 'users', mobile);
  const existing = await getDoc(ref);

  await setDoc(
    ref,
    {
      name: name.trim(),
      mobile: mobile.trim(),
      address,
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );
}

/** Permanently deletes a customer profile doc — admin-only. Doesn't touch that customer's past orders/invoices. */
export async function deleteUserProfile(db, mobile) {
  await deleteDoc(doc(db, 'users', mobile));
}
