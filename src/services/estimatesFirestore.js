// Firestore estimate-bill service — estimates/{estimateDocId}
//
// Estimate bills are always created manually from the admin Estimate Bill
// page, for a customer who hasn't paid yet (a phone-in "how much would
// this cost" quote). There's no ORDER-linked flavor like invoices have —
// every estimate stands alone. Numbers use their own ABSE-prefixed daily
// sequence (see sequentialId.js) so they never collide with invoice numbers.

import {
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { DEFAULT_PACKAGE_PERCENT } from '../constants/estimateConstants';
import { computeInvoiceTotals } from './invoicesFirestore';
import { reserveSequentialId } from '../utils/sequentialId';

/** Atomically reserves and returns the next estimate number, e.g. "ABSE20260801007". */
function reserveNextEstimateNumber(db) {
  return reserveSequentialId(db, { prefix: 'ABSE', counterKey: 'estimates' });
}

/** Creates a new estimate bill from the admin "New Estimate" form. */
export async function createEstimate(db, values) {
  const packagePercent = values.packagePercent ?? DEFAULT_PACKAGE_PERCENT;
  const { subtotal, packageAmount, grandTotal } = computeInvoiceTotals({
    items: values.items,
    packagePercent,
  });

  const estimateNo = await reserveNextEstimateNumber(db);

  const payload = {
    estimateNo,
    date: serverTimestamp(),
    customer: values.customer,
    items: values.items,
    packagePercent,
    subtotal,
    packageAmount,
    grandTotal,
    notes: values.notes || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'estimates'), payload);
  return { id: ref.id, ...payload };
}

/** Edits an existing estimate bill. Recomputes totals from the submitted items. */
export async function updateEstimate(db, estimateDocId, values) {
  const packagePercent = values.packagePercent ?? DEFAULT_PACKAGE_PERCENT;
  const { subtotal, packageAmount, grandTotal } = computeInvoiceTotals({
    items: values.items,
    packagePercent,
  });

  const patch = {
    customer: values.customer,
    items: values.items,
    packagePercent,
    subtotal,
    packageAmount,
    grandTotal,
    notes: values.notes || '',
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, 'estimates', estimateDocId), patch);
  return patch;
}

/** Permanently deletes an estimate bill — admin-only, irreversible. */
export async function deleteEstimateDoc(db, estimateDocId) {
  await deleteDoc(doc(db, 'estimates', estimateDocId));
}

/** Live-subscribes to every estimate bill, newest first — powers the admin Estimate Bill list page. */
export function subscribeAllEstimates(db, onChange, onError) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  const q = query(collection(db, 'estimates'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const estimates = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onChange(estimates);
    },
    (err) => {
      console.error('Failed to load estimates', err);
      onError?.(err);
    }
  );
}
