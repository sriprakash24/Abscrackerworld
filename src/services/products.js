// Live product catalog — products/{productId} in Firestore, with images
// served from Firebase Storage.
//
// Firestore document shape (per README "Wiring up the backend"):
//   name, category, subcategory, unit, mrp, salePrice, discountPercentage,
//   image, stock, stockQty, featured, bestSeller, newArrival, flashDeal,
//   description, displayOrder
//
// `image` can be either:
//   - a Storage path relative to your bucket, e.g. "products/sparkler-10cm.jpg"
//     (uploaded via the Firebase Console / Admin SDK) — resolved to a
//     download URL via getDownloadURL() and cached, or
//   - a ready-to-use https:// URL — used as-is, no extra Storage round trip.
//
// `stock` can be provided directly as 'in' | 'low' | 'out', or omitted and
// derived from `stockQty` (0 -> out, 1-5 -> low, else -> in) so the catalog
// still works with a simple numeric stock count.

import {
  collection,
  getDocs,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { CATEGORY_ICONS, CATEGORY_TAGLINES, slugify } from '../constants/catalog';

const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'categories';

// Resolved Storage download-URL cache, keyed by path, so the same image
// is never re-resolved across snapshots or re-renders.
const imageUrlCache = new Map();

/** Resolves a product's `image` field to a renderable URL. */
export async function getProductImageUrl(image) {
  if (!image) return '';
  if (/^https?:\/\//i.test(image) || image.startsWith('data:')) return image;

  if (imageUrlCache.has(image)) return imageUrlCache.get(image);

  try {
    const url = await getDownloadURL(ref(storage, image));
    imageUrlCache.set(image, url);
    return url;
  } catch (err) {
    console.warn(`[products] could not resolve Storage image "${image}":`, err?.message || err);
    return '';
  }
}

function deriveStock(raw) {
  if (raw.stock === 'in' || raw.stock === 'low' || raw.stock === 'out') return raw.stock;
  const qty = Number(raw.stockQty ?? 0);
  if (qty <= 0) return 'out';
  if (qty <= 5) return 'low';
  return 'in';
}

function deriveDiscountPercentage(raw) {
  if (typeof raw.discountPercentage === 'number') return raw.discountPercentage;
  const mrp = Number(raw.mrp) || 0;
  const sale = Number(raw.salePrice ?? raw.sale) || 0;
  return mrp > sale ? Math.round(((mrp - sale) / mrp) * 100) : 0;
}

/** Normalizes one raw Firestore product doc into the shape the UI expects. */
async function normalizeProduct(id, raw) {
  const stock = deriveStock(raw);
  return {
    id,
    name: raw.name || 'Unnamed product',
    category: raw.category || 'UNCATEGORISED',
    subcategory: raw.subcategory || '',
    unit: raw.unit || '',
    mrp: Number(raw.mrp) || 0,
    sale: Number(raw.salePrice ?? raw.sale) || 0,
    discountPercentage: deriveDiscountPercentage(raw),
    img: await getProductImageUrl(raw.image || raw.img || ''),
    rawImage: raw.image || raw.img || '',
    stock,
    stockQty: Number(raw.stockQty ?? (stock === 'out' ? 0 : 99)),
    featured: !!raw.featured,
    bestSeller: !!raw.bestSeller,
    newArrival: !!raw.newArrival,
    flashDeal: !!raw.flashDeal,
    description: raw.description || '',
    displayOrder: Number(raw.displayOrder ?? 0),
  };
}

async function normalizeSnapshot(snapshot) {
  const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  const products = await Promise.all(docs.map((d) => normalizeProduct(d.id, d)));
  products.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  return products;
}

/** One-shot fetch — a Firestore query without a live subscription. */
export async function fetchProducts() {
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
  return normalizeSnapshot(snapshot);
}

/**
 * Live subscription to the products collection. `onData` fires with the
 * full, normalized product list every time the catalog changes in Firestore
 * (admin adds/edits a product, stock updates, etc). `onError` fires if the
 * read fails (missing/invalid Firebase env vars, security rules, etc).
 * Returns an unsubscribe function.
 */
export function subscribeToProducts(onData, onError) {
  return onSnapshot(
    collection(db, PRODUCTS_COLLECTION),
    async (snapshot) => {
      try {
        onData(await normalizeSnapshot(snapshot));
      } catch (err) {
        onError?.(err);
      }
    },
    onError
  );
}

/**
 * Live subscription to the `categories` collection — gives a
 * { [categoryName]: displayOrder } map (see scripts/seedProducts.mjs,
 * which writes categoryName + displayOrder per category from
 * src/starterData.js's CATEGORY_MASTER). Used to sort the category
 * grouping by the order set in that table, instead of by incidental
 * first-appearance in the product list.
 */
export function subscribeToCategoryOrder(onData, onError) {
  return onSnapshot(
    collection(db, CATEGORIES_COLLECTION),
    (snapshot) => {
      const order = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data?.categoryName) order[data.categoryName] = Number(data.displayOrder ?? 0);
      });
      onData(order);
    },
    onError
  );
}

/** Groups a flat product list into the CATEGORIES shape the UI renders. */
export function groupByCategory(products, categoryOrder = {}) {
  const order = [];
  const map = new Map();
  for (const p of products) {
    if (!map.has(p.category)) {
      map.set(p.category, []);
      order.push(p.category);
    }
    map.get(p.category).push(p);
  }
  // Sort by categoryOrder[name] when known (from the `categories` collection);
  // categories not present there keep falling back to first-appearance order,
  // placed after every category that does have an explicit order.
  const sorted = [...order].sort((a, b) => {
    const hasA = Object.prototype.hasOwnProperty.call(categoryOrder, a);
    const hasB = Object.prototype.hasOwnProperty.call(categoryOrder, b);
    if (hasA && hasB) return categoryOrder[a] - categoryOrder[b];
    if (hasA) return -1;
    if (hasB) return 1;
    return order.indexOf(a) - order.indexOf(b);
  });
  return sorted.map((name) => ({
    name,
    slug: slugify(name),
    icon: CATEGORY_ICONS[name] || '🎆',
    tagline: CATEGORY_TAGLINES[name] || 'Premium festival crackers',
    items: map.get(name),
  }));
}

export function getCategoryBySlug(categories, slug) {
  return categories.find((c) => c.slug === slug);
}

// ===================================================================
// Admin-only writes — Product & Category management.
// These are only ever called from /admin/* screens, which sit behind
// AdminRoute + Firebase Auth (see contexts/AdminAuthContext.jsx), so
// there's no extra guard here beyond what Firestore security rules
// enforce server-side (writes to `products`/`categories` should be
// locked to `request.auth != null`).
// ===================================================================

/**
 * Live-subscribes to the raw `categories` collection, sorted by
 * displayOrder — powers the Admin Categories screen (list + reorder),
 * as opposed to subscribeToCategoryOrder() above which only returns a
 * { [name]: order } lookup map for sorting the storefront.
 */
export function subscribeToCategoryDocs(onData, onError) {
  const q = query(collection(db, CATEGORIES_COLLECTION), orderBy('displayOrder', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(
        snapshot.docs.map((d) => ({
          id: d.id,
          categoryName: d.data().categoryName || '',
          displayOrder: Number(d.data().displayOrder ?? 0),
        }))
      );
    },
    onError
  );
}

/** Uploads a product image file to Storage and returns a ready-to-use download URL. */
export async function uploadProductImageFile(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `products/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/** Creates a new product document in `products`. Returns the new doc id. */
export async function createProduct(data) {
  const ref = await addDoc(collection(db, PRODUCTS_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Updates an existing product document by id with a partial patch. */
export async function updateProductDoc(id, patch) {
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), { ...patch, updatedAt: serverTimestamp() });
}

/** Deletes a product document by id. */
export async function deleteProductDoc(id) {
  await deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
}

/**
 * Creates a new category document in `categories`. If `displayOrder` is
 * omitted, the category is placed at the end of the existing list
 * (max displayOrder + 100, matching the 100/200/300... spacing used by
 * CATEGORY_MASTER in starterData.js).
 */
export async function createCategoryDoc({ categoryName, displayOrder, existingCategories = [] }) {
  const order =
    displayOrder ?? (existingCategories.length
      ? Math.max(...existingCategories.map((c) => c.displayOrder)) + 100
      : 100);
  const ref = await addDoc(collection(db, CATEGORIES_COLLECTION), {
    categoryName: categoryName.trim(),
    displayOrder: order,
  });
  return ref.id;
}

/** Updates an existing category document by id with a partial patch. */
export async function updateCategoryDoc(id, patch) {
  await updateDoc(doc(db, CATEGORIES_COLLECTION, id), patch);
}

/** Deletes a category document by id. Products already in that category are left untouched. */
export async function deleteCategoryDoc(id) {
  await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
}

/**
 * Swaps displayOrder between a category and its immediate neighbor
 * (direction: 'up' | 'down') within an already displayOrder-sorted list —
 * this is how the Admin Categories screen implements the up/down reorder
 * arrows. No-ops silently at the top/bottom of the list.
 */
export async function moveCategoryOrder(sortedCategories, categoryId, direction) {
  const idx = sortedCategories.findIndex((c) => c.id === categoryId);
  if (idx === -1) return;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sortedCategories.length) return;

  const current = sortedCategories[idx];
  const neighbor = sortedCategories[swapIdx];

  const batch = writeBatch(db);
  batch.update(doc(db, CATEGORIES_COLLECTION, current.id), { displayOrder: neighbor.displayOrder });
  batch.update(doc(db, CATEGORIES_COLLECTION, neighbor.id), { displayOrder: current.displayOrder });
  await batch.commit();
}

/** Best-effort delete of a Storage-hosted product image (ignores plain https:// URLs and failures). */
export async function deleteProductImageIfOwned(image) {
  if (!image || /^https?:\/\//i.test(image)) return;
  try {
    await deleteObject(ref(storage, image));
  } catch (err) {
    console.warn('[products] could not delete Storage image:', err?.message || err);
  }
}
