#!/usr/bin/env node
// One-off / repeatable utility: sets stockQty (and the matching `stock`
// status) on every existing product doc in Firestore's `products`
// collection — WITHOUT touching name, price, image, or any other field.
//
// Unlike seedProducts.mjs (which uses batch.set() and rewrites the whole
// document), this script uses batch.update(), which only writes the fields
// you give it and leaves everything else in the doc untouched.
//
// Usage:
//   node scripts/updateStockQty.mjs           # sets stockQty: 99, stock: "in" for ALL products
//   node scripts/updateStockQty.mjs 50         # sets stockQty: 50, stock: "in" for ALL products
//
// Requires the same serviceAccountKey.json in the project root that
// seedProducts.mjs uses.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const keyPath = join(rootDir, 'serviceAccountKey.json');

if (!existsSync(keyPath)) {
  console.error(
    'Missing serviceAccountKey.json in the project root.\n' +
    'Generate one via Firebase Console → Project Settings → Service accounts\n' +
    '→ "Generate new private key", then save it as serviceAccountKey.json here.'
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

// stockQty value to apply to every product — override via CLI arg,
// e.g. `node scripts/updateStockQty.mjs 50`
const targetQty = Number.isFinite(Number(process.argv[2])) && process.argv[2]
  ? Number(process.argv[2])
  : 99;

// Derive the `stock` status from the quantity so the two fields stay
// consistent (0 = out, 1-9 = low, 10+ = in). Adjust the thresholds here
// if your app's low-stock cutoff is different.
function stockStatusFor(qty) {
  if (qty <= 0) return 'out';
  if (qty < 10) return 'low';
  return 'in';
}

async function updateStockQty() {
  console.log(`Fetching all products from Firestore project "${serviceAccount.project_id}"...`);
  const snapshot = await db.collection('products').get();
  const docs = snapshot.docs;
  console.log(`Found ${docs.length} products. Setting stockQty: ${targetQty}, stock: "${stockStatusFor(targetQty)}" on each (all other fields left untouched)...`);

  const chunkSize = 400; // Firestore batch write cap is 500
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const batch = db.batch();
    for (const doc of chunk) {
      batch.update(doc.ref, {
        stockQty: targetQty,
        stock: stockStatusFor(targetQty),
      });
    }
    await batch.commit();
    console.log(`  updated ${i + chunk.length}/${docs.length}`);
  }
  console.log('Done.');
}

updateStockQty()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Update failed:', err);
    process.exit(1);
  });
