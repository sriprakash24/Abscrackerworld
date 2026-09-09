// Firebase initialization.
// Fill in your Firebase project credentials via environment variables
// (create a .env file — see .env.example) before deploying.
import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
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
//
// IMPORTANT: initialized with a persistent (IndexedDB) local cache, with
// multi-tab support so several open tabs share one cache instead of each
// paying for their own reads. Without this, every page refresh / new tab /
// onSnapshot remount re-downloads the full result set from the server even
// when nothing has changed — this was the single biggest driver of our
// Firestore free-tier quota getting exceeded with only a handful of users.
// persistentMultipleTabManager lets several open tabs share the same
// IndexedDB cache instead of fighting over an exclusive lock.
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

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
