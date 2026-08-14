#!/usr/bin/env node
// One-time / repeatable migration: seeds Firestore's `products` and
// `categories` collections from src/starterData.js (STARTER_ITEMS +
// CATEGORY_MASTER), so the app can read the live catalog via
// src/services/products.js instead of mock data. Re-run any time you
// edit starterData.js — writes are keyed by id, so it's an upsert, safe
// to run repeatedly.
//
// Usage:
//   npm run seed:products
//
// Uses the Firebase ADMIN SDK, authenticated with a service account key —
// this bypasses Firestore security rules entirely (as intended: see the
// comment on `match /products/{productId}` in firestore.rules, which locks
// out all client writes on purpose). This script is meant to run from your
// own machine/CI, never from the browser.
//
// One-time setup:
//   1. Firebase Console → Project Settings → Service accounts →
//      "Generate new private key". Save the downloaded JSON as
//      `serviceAccountKey.json` in the project root (already gitignored —
//      never commit it, it grants full admin access to your project).
//   2. npm install --save-dev firebase-admin
//   3. npm run seed:products
//
// Every product is written with its existing hosted image URL as `image` —
// getProductImageUrl() in src/services/products.js uses https:// URLs as-is.
// Once you've uploaded real photos to Firebase Storage, update a product's
// `image` field in the Firestore console to a Storage path instead (e.g.
// "products/sparkler-10cm.jpg") and it'll be resolved automatically.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const keyPath = join(rootDir, "serviceAccountKey.json");

if (!existsSync(keyPath)) {
  console.error(
    "Missing serviceAccountKey.json in the project root.\n" +
      "Generate one via Firebase Console → Project Settings → Service accounts\n" +
      '→ "Generate new private key", then save it as serviceAccountKey.json here.',
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

// --- Source catalog ---
// Pulled directly from src/starterData.js — the single source of truth for
// the catalog (STARTER_ITEMS) and category ordering (CATEGORY_MASTER). No
// data is duplicated here anymore, so editing starterData.js and re-running
// `npm run seed:products` is all it takes to update Firestore.
import { STARTER_ITEMS, CATEGORY_MASTER } from "../src/starterData.js";

// --- Tamil translations ---
// scripts/tamilTranslations.json holds { name, name_ta } per category and
// per product. Matched onto STARTER_ITEMS / CATEGORY_MASTER by name
// (case-insensitive, trimmed) so starterData.js doesn't need to duplicate
// Tamil text. Any product/category with no match gets name_ta: '' and is
// reported below so it's easy to add later.
const taPath = join(__dirname, "tamilTranslations.json");
const taData = existsSync(taPath)
  ? JSON.parse(readFileSync(taPath, "utf8"))
  : { categories: [] };

const norm = (s) => String(s).toLowerCase().trim();

const categoryTaMap = new Map(
  taData.categories.map((c) => [norm(c.name), c.name_ta]),
);
const productTaMap = new Map(
  taData.categories.flatMap((c) =>
    c.products.map((p) => [norm(p.name), p.name_ta]),
  ),
);

// Deterministic mock stock, preserved only so the seeded data isn't all
// identical — feel free to overwrite stockQty per-product in Firestore.
function getStock(id) {
  const m = id % 13;
  if (m === 0) return "out";
  if (m === 1 || m === 2) return "low";
  return "in";
}
function getStockQty(id, stock) {
  if (stock === "out") return 0;
  if (stock === "low") return 2 + (id % 3);
  return 99;
}

async function seedProducts() {
  const items = STARTER_ITEMS.filter((p) => p.isActive !== false);
  const missingProductTa = [];
  console.log(
    `Seeding ${items.length} products into Firestore project "${serviceAccount.project_id}"...`,
  );

  // Firestore batches cap at 500 writes — chunk in case the catalog grows.
  const chunkSize = 400;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = db.batch();
    for (const p of chunk) {
      const stock = getStock(p.id);
      const stockQty = getStockQty(p.id, stock);
      const ref = db.collection("products").doc(String(p.id));
      const name_ta = productTaMap.get(norm(p.name)) || "";
      if (!name_ta) missingProductTa.push(p.name);
      batch.set(ref, {
        name: p.name,
        name_ta,
        category: p.category,
        unit: p.unit,
        mrp: p.mrp,
        // starterData.js uses `sale` / `img` — mapped here to the field
        // names src/services/products.js actually reads (`salePrice`, `image`).
        salePrice: p.sale,
        discountPercentage:
          p.mrp > p.sale ? Math.round(((p.mrp - p.sale) / p.mrp) * 100) : 0,
        image: p.img,
        stock,
        stockQty,
        featured: false,
        bestSeller: p.id % 7 === 0,
        newArrival: p.id >= 120,
        flashDeal: p.id % 9 === 0,
        description: "",
        displayOrder: p.productDisplayOrder ?? p.id,
      });
    }
    await batch.commit();
    console.log(`  products: wrote ${i + chunk.length}/${items.length}`);
  }
  if (missingProductTa.length) {
    console.log(
      `  \u26a0 ${missingProductTa.length} product(s) had no Tamil name (seeded with name_ta: ""):`,
    );
    missingProductTa.forEach((n) => console.log(`    - ${n}`));
  }
}

async function seedCategories() {
  const cats = CATEGORY_MASTER.filter((c) => c.isActive !== false);
  console.log(`Seeding ${cats.length} categories into Firestore...`);
  const missingCategoryTa = [];
  const batch = db.batch();
  for (const c of cats) {
    const categoryName_ta = categoryTaMap.get(norm(c.categoryName)) || "";
    if (!categoryName_ta) missingCategoryTa.push(c.categoryName);
    const ref = db.collection("categories").doc(c.id);
    batch.set(ref, {
      categoryName: c.categoryName,
      categoryName_ta,
      displayOrder: c.categoryDisplayOrder,
    });
  }
  await batch.commit();
  console.log(`  categories: wrote ${cats.length}/${cats.length}`);
  if (missingCategoryTa.length) {
    console.log(
      `  \u26a0 ${missingCategoryTa.length} categor${missingCategoryTa.length === 1 ? "y" : "ies"} had no Tamil name:`,
    );
    missingCategoryTa.forEach((n) => console.log(`    - ${n}`));
  }
}

async function seed() {
  await seedProducts();
  await seedCategories();
  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
