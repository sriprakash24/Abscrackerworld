// Combo packs — stored as regular documents in the `products` collection
// with `isCombo: true` and category "COMBO ABS". That means everything that
// already works for products (cart, checkout, orders, invoices, stock,
// search, price update, order limits) works for combos with no extra code.
//
// Extra combo-only fields on the product document:
//   isCombo       true
//   badge         short ribbon text, e.g. "BEST VALUE" / "MOST POPULAR"
//   image         card photo (URL or Storage path)
//   comboImage    "what's inside" picture shown in the View popup
//   comboItems    [{ name, qty, image?, productId? }]  itemised list
//
// Admin screens: pages/admin/AdminCombos.jsx + components/admin/ComboFormModal.jsx

import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { COMBO_CATEGORY_NAME } from "../constants/catalog";
import {
  createProduct,
  updateProductDoc,
  deleteProductDoc,
  deleteProductImageIfOwned,
  setProductHidden,
  stockStatusForQty,
} from "./products";

export { COMBO_CATEGORY_NAME };

/** Turns the combo form values into the Firestore product payload. */
export function buildComboPayload(values) {
  const mrp = Number(values.mrp) || 0;
  const salePrice = Number(values.salePrice) || 0;
  const stockQty = Math.max(0, Math.round(Number(values.stockQty) || 0));
  return {
    isCombo: true,
    category: COMBO_CATEGORY_NAME,
    subcategory: "",
    name: values.name.trim(),
    name_ta: (values.nameTa || "").trim(),
    badge: (values.badge || "").trim(),
    unit: (values.unit || "").trim() || "1 COMBO",
    mrp,
    salePrice,
    discountPercentage:
      mrp > salePrice ? Math.round(((mrp - salePrice) / mrp) * 100) : 0,
    stockQty,
    stock: stockStatusForQty(stockQty),
    displayOrder: Number(values.displayOrder) || 0,
    description: (values.description || "").trim(),
    image: values.image || "",
    comboImage: values.comboImage || "",
    comboItems: (values.comboItems || [])
      .filter((it) => (it.name || "").trim())
      .map((it) => ({
        name: it.name.trim(),
        qty: Math.max(1, Math.round(Number(it.qty) || 1)),
        image: it.image || "",
        productId: it.productId || "",
      })),
    hidden: !!values.hidden,
    featured: false,
    bestSeller: !!values.bestSeller,
    newArrival: false,
    flashDeal: false,
  };
}

/**
 * Makes sure a `categories` doc exists for "COMBO ABS" so the combo group
 * also shows up in the Inventory / Price Update / Order Limits admin
 * screens (they list products per category doc). The storefront does not
 * depend on it — combos are pinned to the top by name regardless.
 */
export async function ensureComboCategoryDoc() {
  const snap = await getDocs(
    query(
      collection(db, "categories"),
      where("categoryName", "==", COMBO_CATEGORY_NAME),
    ),
  );
  if (!snap.empty) return;
  await addDoc(collection(db, "categories"), {
    categoryName: COMBO_CATEGORY_NAME,
    displayOrder: 0,
    image: "",
  });
}

export async function createCombo(values) {
  const id = await createProduct(buildComboPayload(values));
  try {
    await ensureComboCategoryDoc();
  } catch (err) {
    console.warn("[combos] could not ensure combo category doc:", err);
  }
  return id;
}

export async function updateCombo(id, values) {
  await updateProductDoc(id, buildComboPayload(values));
}

/** Deletes the combo and best-effort cleans up Storage images it owned. */
export async function deleteCombo(combo) {
  await deleteProductDoc(combo.id);
  await deleteProductImageIfOwned(combo.rawImage);
  await deleteProductImageIfOwned(combo.rawComboImage);
  for (const it of combo.comboItems || []) {
    await deleteProductImageIfOwned(it.rawImage);
  }
}

export const setComboHidden = setProductHidden;

/** Swaps displayOrder with the neighbour above/below in a sorted list. */
export async function moveCombo(sortedCombos, comboId, direction) {
  const idx = sortedCombos.findIndex((c) => c.id === comboId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= sortedCombos.length) return;
  // Re-number the whole list 100,200,300… so equal/zero orders still swap.
  const next = [...sortedCombos];
  [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
  await Promise.all(
    next.map((c, i) =>
      c.displayOrder === (i + 1) * 100
        ? null
        : updateProductDoc(c.id, { displayOrder: (i + 1) * 100 }),
    ),
  );
}
