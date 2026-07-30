/**
 * Order lifecycle stages for the manual-payment checkout flow.
 * `id` should match values you'll eventually drive from Firestore
 * (e.g. orders/{orderId}.orderStage) once admin status updates are wired in.
 * Icons are attached in OrderStatusStepper.jsx to keep this file JSX-free.
 */
export const ORDER_STAGE_IDS = ['RECEIVED', 'CONTACT', 'PAYMENT', 'DELIVERED'];

export const ORDER_STAGE_LABELS = {
  RECEIVED: 'Order Received',
  CONTACT: "We'll Contact You Soon",
  PAYMENT: 'Payment & Confirmation',
  DELIVERED: 'Order Packed & Delivered',
};
