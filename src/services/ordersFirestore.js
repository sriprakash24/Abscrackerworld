// Firestore order submission — orders/{orderId}
//
// Manual payment workflow: the customer never pays inside the app. An order
// is written with status AWAITING_ADMIN_CONFIRMATION / paymentStatus PENDING,
// and the ABS Crackers World team follows up over WhatsApp or phone.

import {
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { reserveSequentialId } from '../utils/sequentialId';

/**
 * Generates the order id, e.g. "ABSO20260801108" — ABSO + today's date +
 * a 3-digit counter that resets daily. See src/utils/sequentialId.js for
 * the shared format (invoices use the same helper with the ABSI prefix).
 */
export function generateOrderId(db) {
  return reserveSequentialId(db, { prefix: 'ABSO', counterKey: 'orders' });
}

/**
 * Shapes the Firestore payload for a new order from the checkout form values,
 * the derived cart pricing, and the cart line items.
 */
export function buildOrderPayload({ orderId, formValues, pricing }) {
  const {
    fullName,
    mobile,
    alternateMobile,
    email,
    houseNumber,
    street,
    area,
    city,
    district,
    state,
    pincode,
    landmark,
    deliveryNotes,
    orderNotes,
  } = formValues;

  return {
    orderId,
    customer: {
      name: fullName.trim(),
      mobile: mobile.trim(),
      alternateMobile: alternateMobile?.trim() || '',
      email: email?.trim() || '',
    },
    address: {
      houseNumber: houseNumber.trim(),
      street: street.trim(),
      area: area.trim(),
      city: city.trim(),
      district: district.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      landmark: landmark?.trim() || '',
      deliveryNotes: deliveryNotes?.trim() || '',
    },
    orderNotes: orderNotes?.trim() || '',
    cartItems: pricing.items.map(({ product, qty }) => ({
      productId: product.id,
      name: product.name,
      image: product.img || '',
      category: product.category,
      unitPrice: product.sale,
      mrp: product.mrp,
      quantity: qty,
      lineTotal: product.sale * qty,
    })),
    subtotal: pricing.subtotalMrp,
    discount: pricing.discount + pricing.couponDiscount,
    packingCharges: pricing.packingCharges,
    deliveryCharges: pricing.deliveryCharges,
    grandTotal: pricing.grandTotal,
    totalSavings: pricing.totalSavings,
    orderStage: 'ORDER_SUBMITTED',
    status: 'AWAITING_ADMIN_CONFIRMATION',
    paymentStatus: 'PENDING',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/** Writes a new order document to orders/{orderId}. */
export async function submitOrder(db, { formValues, pricing }) {
  const orderId = await generateOrderId(db);
  const payload = buildOrderPayload({ orderId, formValues, pricing });
  const ref = doc(db, 'orders', orderId);
  await setDoc(ref, payload);
  return { orderId };
}

/**
 * Live-subscribes to every order placed by this mobile number, newest first
 * — powers the Order History screen so admin status updates (confirmed,
 * packed, delivered...) reflect instantly without a manual refresh.
 *
 * Usage: `const unsub = subscribeOrdersByMobile(db, mobile, setOrders, onError);`
 * — call the returned function on unmount to detach the listener.
 */
export function subscribeOrdersByMobile(db, mobile, onChange, onError) {
  if (!db || !mobile) {
    onChange([]);
    return () => {};
  }

  const q = query(
    collection(db, 'orders'),
    where('customer.mobile', '==', mobile.trim()),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onChange(orders);
    },
    (err) => {
      console.error('Failed to load order history', err);
      onError?.(err);
    }
  );
}

/**
 * Live-subscribes to every order in the store, newest first — powers the
 * admin Order Management page. Unlike `subscribeOrdersByMobile`, this has
 * no `where` filter, so it relies only on the `createdAt` index Firestore
 * creates automatically for a single-field `orderBy`.
 *
 * Usage: `const unsub = subscribeAllOrders(db, setOrders, onError);`
 * — call the returned function on unmount to detach the listener.
 */
export function subscribeAllOrders(db, onChange, onError) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onChange(orders);
    },
    (err) => {
      console.error('Failed to load orders', err);
      onError?.(err);
    }
  );
}

/**
 * Applies an admin-driven status change to orders/{orderDocId} — e.g.
 * confirming payment, moving to packed/out-for-delivery/delivered, or
 * cancelling. Always stamps `updatedAt` so the customer's live order
 * history reflects the change immediately.
 *
 * `patch` is a partial object, e.g. `{ status: 'PACKED' }` or
 * `{ status: 'CONFIRMED', paymentStatus: 'RECEIVED' }`.
 */
export async function updateOrderStatus(db, orderDocId, patch) {
  const ref = doc(db, 'orders', orderDocId);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

/**
 * Permanently deletes an order document — admin-only, irreversible. Used
 * from the "Delete Order" action on the Order Management page. Note: this
 * does not touch a linked invoice (orders/{id}.invoiceId), if one exists —
 * the invoice stays on the Invoices page and can be deleted separately.
 */
export async function deleteOrderDoc(db, orderDocId) {
  await deleteDoc(doc(db, 'orders', orderDocId));
}
