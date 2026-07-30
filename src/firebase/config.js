// Firebase initialization.
// Fill in your Firebase project credentials via environment variables
// (create a .env file — see .env.example) before deploying.
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Firestore instance — the `products` collection is the live catalog
// (see src/services/products.js), and the checkout module writes orders
// to orders/{orderId}.
// Safe to call even without valid env vars filled in yet; it only throws once
// an actual read/write is attempted against the backend.
export const db = getFirestore(firebaseApp);

// Firebase Storage — product images live under the `products/` bucket path.
// Uploaded via the Firebase Console / Admin SDK (see scripts/seedProducts.mjs),
// then referenced from a Firestore product document's `image` field either as
// a ready-to-use download URL or as a storage path resolved on the fly by
// getProductImageUrl() in src/services/products.js.
export const storage = getStorage(firebaseApp);

// Firebase Authentication — used ONLY by the admin panel (/admin/*).
// The customer-facing flow stays anonymous/no-login by design; admin staff
// sign in with an email + password account created manually in the
// Firebase Console (see src/pages/admin/AdminLogin.jsx for details).
export const auth = getAuth(firebaseApp);
