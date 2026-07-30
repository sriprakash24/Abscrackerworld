// Firestore cart sync — prepared for users/{userId}/cart.
// The cart currently persists to localStorage via zustand/persist (see
// src/store/useCartStore.js). These helpers are ready to wire up once
// Firebase Authentication is enabled, so each cart line item mirrors to:
//
//   users/{userId}/cart/{productId}
//     - productId: number
//     - name: string
//     - image: string
//     - price: number   (offer price)
//     - mrp: number
//     - quantity: number
//     - category: string
//     - stock: 'in' | 'low' | 'out'
//
// Intentionally not imported anywhere yet — the module wires in cleanly
// once an authenticated user is available, without touching the local
// cart UX in the meantime.

import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

/**
 * Builds the Firestore-shaped payload for a single cart line item.
 */
export function toCartDocument(product, quantity) {
  return {
    productId: product.id,
    name: product.name,
    image: product.img || '',
    price: product.sale,
    mrp: product.mrp,
    quantity,
    category: product.category,
    stock: product.stock,
  };
}

/**
 * Writes one cart line item to users/{userId}/cart/{productId}.
 * `db` is a Firestore instance (getFirestore(firebaseApp)) supplied by the caller.
 */
export async function syncCartItem(db, userId, product, quantity) {
  if (!db || !userId) return;
  const ref = doc(db, 'users', userId, 'cart', String(product.id));
  await setDoc(ref, toCartDocument(product, quantity));
}

/** Removes a single cart line item from Firestore. */
export async function deleteCartItem(db, userId, productId) {
  if (!db || !userId) return;
  const ref = doc(db, 'users', userId, 'cart', String(productId));
  await deleteDoc(ref);
}

/** Reads the full remote cart for a user (used to hydrate on login). */
export async function fetchRemoteCart(db, userId) {
  if (!db || !userId) return [];
  const snap = await getDocs(collection(db, 'users', userId, 'cart'));
  return snap.docs.map((d) => d.data());
}
