// Firestore invoice service — invoices/{invoiceDocId}
//
// Two ways an invoice comes into existence:
//   1. ORDER-linked — auto-generated the moment admin taps "Confirm Payment
//      Received" on a website order (see createInvoiceForOrder, called from
//      AdminOrderCard.jsx). The order doc is patched with `invoiceId` /
//      `invoiceNumber` so both admin and the customer can look it up directly
//      without a query.
//   2. MANUAL — created from scratch on the admin Invoices page for phone-in
//      orders that never went through the website (createManualInvoice).
//
// Invoice numbers, e.g. "ABSI20260801108" — ABSI + today's date + a 3-digit
// counter that resets daily, via an atomic Firestore transaction, so two
// admins confirming payment at the same moment never collide. Orders use
// the same generator with the ABSO prefix — see src/utils/sequentialId.js.

import {
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { DEFAULT_PACKAGE_PERCENT, INVOICE_SOURCE } from '../constants/invoiceConstants';
import { reserveSequentialId } from '../utils/sequentialId';

/** Atomically reserves and returns the next invoice number, e.g. "ABSI20260801108". */
function reserveNextInvoiceNumber(db) {
  return reserveSequentialId(db, { prefix: 'ABSI', counterKey: 'invoices' });
}

/** Computes subtotal/package/grand-total from line items — shared by order-derived and manual invoices. */
export function computeInvoiceTotals({ items, discount = 0, packagePercent = DEFAULT_PACKAGE_PERCENT }) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const afterDiscount = Math.max(subtotal - Number(discount || 0), 0);
  const packageAmount = Math.round((afterDiscount * Number(packagePercent || 0)) / 100);
  const grandTotal = afterDiscount + packageAmount;
  return { subtotal, packageAmount, grandTotal };
}

/** Maps a website order (orders/{orderId} data) into an invoice line-item + customer shape. */
function orderToInvoiceItems(order) {
  return (order.cartItems || []).map((item, i) => ({
    id: `${i + 1}`,
    description: item.name,
    qty: item.quantity,
    rate: item.unitPrice,
    amount: item.lineTotal ?? item.unitPrice * item.quantity,
  }));
}

/**
 * Auto-creates (or returns the existing) invoice for a website order —
 * called right when admin confirms payment. Idempotent: if the order
 * already has `invoiceId`, that invoice is fetched and returned instead of
 * creating a duplicate.
 */
export async function createInvoiceForOrder(db, order) {
  if (order.invoiceId) {
    const existing = await getInvoice(db, order.invoiceId);
    if (existing) return existing;
  }

  const items = orderToInvoiceItems(order);
  const packagePercent = DEFAULT_PACKAGE_PERCENT;
  const { subtotal, packageAmount, grandTotal } = computeInvoiceTotals({
    items,
    discount: order.discount || 0,
    packagePercent,
  });

  const invoiceNo = await reserveNextInvoiceNumber(db);

  const payload = {
    invoiceNo,
    source: INVOICE_SOURCE.ORDER,
    orderId: order.orderId || order.id,
    orderDocId: order.id,
    date: serverTimestamp(),
    customer: {
      name: order.customer?.name || '',
      mobile: order.customer?.mobile || '',
      address: [order.address?.houseNumber, order.address?.street, order.address?.area, order.address?.city, order.address?.district, order.address?.state, order.address?.pincode]
        .filter(Boolean)
        .join(', '),
    },
    items,
    discount: order.discount || 0,
    packagePercent,
    subtotal,
    packageAmount,
    grandTotal,
    paymentMode: 'OTHER',
    transactionRef: '',
    notes: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'invoices'), payload);

  await updateDoc(doc(db, 'orders', order.id), {
    invoiceId: ref.id,
    invoiceNo,
    updatedAt: serverTimestamp(),
  });

  return { id: ref.id, ...payload };
}

/** Creates a standalone invoice from the admin "New Invoice" form (phone-in orders, no website order behind it). */
export async function createManualInvoice(db, values) {
  const packagePercent = values.packagePercent ?? DEFAULT_PACKAGE_PERCENT;
  const { subtotal, packageAmount, grandTotal } = computeInvoiceTotals({
    items: values.items,
    discount: values.discount || 0,
    packagePercent,
  });

  const invoiceNo = await reserveNextInvoiceNumber(db);

  const payload = {
    invoiceNo,
    source: INVOICE_SOURCE.MANUAL,
    orderId: null,
    orderDocId: null,
    date: serverTimestamp(),
    customer: values.customer,
    items: values.items,
    discount: values.discount || 0,
    packagePercent,
    subtotal,
    packageAmount,
    grandTotal,
    paymentMode: values.paymentMode || 'CASH',
    transactionRef: values.transactionRef || '',
    notes: values.notes || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'invoices'), payload);
  return { id: ref.id, ...payload };
}

/** Edits an existing invoice (either source) from the admin Invoices page. Recomputes totals from the submitted items. */
export async function updateInvoice(db, invoiceDocId, values) {
  const packagePercent = values.packagePercent ?? DEFAULT_PACKAGE_PERCENT;
  const { subtotal, packageAmount, grandTotal } = computeInvoiceTotals({
    items: values.items,
    discount: values.discount || 0,
    packagePercent,
  });

  const patch = {
    customer: values.customer,
    items: values.items,
    discount: values.discount || 0,
    packagePercent,
    subtotal,
    packageAmount,
    grandTotal,
    paymentMode: values.paymentMode || 'CASH',
    transactionRef: values.transactionRef || '',
    notes: values.notes || '',
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, 'invoices', invoiceDocId), patch);
  return patch;
}

/** One-off fetch — used by the customer "Download Invoice" button (order.invoiceId -> invoice doc). */
export async function getInvoice(db, invoiceDocId) {
  if (!invoiceDocId) return null;
  const snap = await getDoc(doc(db, 'invoices', invoiceDocId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Permanently deletes an invoice document — admin-only, irreversible. Used
 * from the "Delete Invoice" action on the Invoices page. Note: if this
 * invoice was auto-generated from a website order, the order doc still
 * keeps its `invoiceId`/`invoiceNo` fields pointing at the now-deleted
 * invoice — use "Generate Invoice" on that order again to create a fresh
 * one if needed.
 */
export async function deleteInvoiceDoc(db, invoiceDocId) {
  await deleteDoc(doc(db, 'invoices', invoiceDocId));
}

/** Live-subscribes to every invoice, newest first — powers the admin Invoices list page. */
export function subscribeAllInvoices(db, onChange, onError) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const invoices = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onChange(invoices);
    },
    (err) => {
      console.error('Failed to load invoices', err);
      onError?.(err);
    }
  );
}
