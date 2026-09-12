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
// Editing an ORDER-linked invoice (updateInvoice, with orderDocId passed in)
// writes the same item list back onto orders/{orderDocId}.cartItems in the
// same batch, so admin Order Management and the customer's Order History /
// Track Order screens — which all read the order doc live — pick up the
// change immediately. Editing a MANUAL invoice only ever touches the
// invoice, since there's no order doc behind it.
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
  writeBatch,
} from 'firebase/firestore';
import { DEFAULT_PACKAGE_PERCENT, INVOICE_SOURCE } from '../constants/invoiceConstants';
import { reserveSequentialId } from '../utils/sequentialId';

/** Atomically reserves and returns the next invoice number, e.g. "ABSI20260801108". */
function reserveNextInvoiceNumber(db) {
  return reserveSequentialId(db, { prefix: 'ABSI', counterKey: 'invoices' });
}

/**
 * Computes total amount/packing/grand-total from line items — shared by
 * order-derived and manual invoices.
 *
 * Discount is deliberately NOT part of this math. For website orders the
 * items here already carry the cart's sale price (discount already baked
 * in) — subtracting a discount % again on top of that double-counts it and
 * was pushing (and sometimes clamping) the grand total toward zero. Any
 * discount the customer got is informational only on the invoice now (see
 * `cartDiscountAmount` in createInvoiceForOrder) and never touches this
 * calculation. No delivery charge here either — that's an order-time
 * concern, not an invoice line.
 */
export function computeInvoiceTotals({ items, packagePercent = DEFAULT_PACKAGE_PERCENT }) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const packageAmount = Math.round((subtotal * Number(packagePercent || 0)) / 100);
  const grandTotal = Math.max(subtotal + packageAmount, 0);
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
  const { subtotal, packageAmount, grandTotal } = computeInvoiceTotals({ items, packagePercent });

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
    packagePercent,
    subtotal,
    packageAmount,
    grandTotal,
    // Reference-only figure pulled straight from the cart's own discount
    // (already reflected in the sale prices above) — shown on the invoice
    // separately from the totals box, never subtracted again here.
    cartDiscountAmount: order.discount || 0,
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

/**
 * Maps invoice line items (description/qty/rate, optionally productId) into
 * the orders/{id}.cartItems shape, so an invoice edit can be written back
 * onto the linked order in the same format the order was created with.
 * When a line was picked from the catalog (has productId), the live product
 * fills in name/nameTa/image/category/mrp; a hand-typed custom line has no
 * catalog match, so it falls back to the invoice's own description/rate and
 * treats mrp as equal to the rate (no discount to report on that line).
 */
function invoiceItemsToOrderCartItems(items, products = []) {
  const byId = new Map(products.map((p) => [p.id, p]));
  return (items || []).map((item) => {
    const product = item.productId ? byId.get(item.productId) : null;
    const quantity = Number(item.qty) || 0;
    const unitPrice = Number(item.rate) || 0;
    const lineTotal = Number(item.amount ?? unitPrice * quantity);
    return {
      productId: item.productId || '',
      name: product?.name || item.description || '',
      nameTa: product?.nameTa || '',
      image: product?.img || '',
      category: product?.category || '',
      unitPrice,
      mrp: product?.mrp ?? unitPrice,
      quantity,
      lineTotal,
    };
  });
}

/**
 * Edits an existing invoice (either source) from the admin Invoices page.
 * Recomputes totals from the submitted items.
 *
 * When the invoice is linked to a website order (`orderDocId` passed in
 * `opts`), the order's `cartItems` and pricing fields are rewritten in the
 * same write so both the admin Order Management screen and the customer's
 * Order History / Track Order pages (all of which read straight from the
 * order doc, live) reflect the edited item list immediately — not just the
 * invoice. `opts.products` is the live catalog, used to fill in
 * name/mrp/image/category for lines that were picked from a product; a
 * writeBatch keeps the invoice and order writes atomic.
 */
export async function updateInvoice(db, invoiceDocId, values, opts = {}) {
  const { orderDocId = null, products = [] } = opts;
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
    paymentMode: values.paymentMode || 'CASH',
    transactionRef: values.transactionRef || '',
    notes: values.notes || '',
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.update(doc(db, 'invoices', invoiceDocId), patch);

  if (orderDocId) {
    const cartItems = invoiceItemsToOrderCartItems(values.items, products);
    const orderSubtotalMrp = cartItems.reduce((sum, it) => sum + it.mrp * it.quantity, 0);
    const orderSubtotalSale = cartItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    const discount = Math.max(0, orderSubtotalMrp - orderSubtotalSale);

    batch.update(doc(db, 'orders', orderDocId), {
      cartItems,
      subtotal: orderSubtotalMrp,
      discount,
      packingCharges: packageAmount,
      grandTotal,
      totalSavings: discount,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
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
