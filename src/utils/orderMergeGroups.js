// Shared clustering logic for AWAITING_ADMIN_CONFIRMATION orders that share
// a mobile number — used by both the Order Management page (AdminDashboard)
// and the Payment Confirmation page (AdminPaymentConfirmation), so a merge
// decision made in one place is read identically in the other instead of
// each screen re-implementing its own grouping and drifting apart.
//
// Any two-or-more AWAITING_ADMIN_CONFIRMATION orders sharing a mobile number
// become a "cluster" (candidate for merging into a single estimate bill —
// see MergedEstimateCard). Everything else, including a lone AWAITING order
// or any order past that stage, renders as its own single card. Order of
// the incoming list (newest first) is preserved — a cluster is placed
// where its first/newest member would have appeared.
export function buildAwaitingMergeGroups(list) {
  const seen = new Set();
  const groups = [];
  for (const order of list) {
    if (seen.has(order.id)) continue;
    const mobile = order.customer?.mobile;
    if (order.status === 'AWAITING_ADMIN_CONFIRMATION' && mobile) {
      const siblings = list.filter(
        (o) => !seen.has(o.id) && o.status === 'AWAITING_ADMIN_CONFIRMATION' && o.customer?.mobile === mobile,
      );
      if (siblings.length > 1) {
        siblings.forEach((o) => seen.add(o.id));
        groups.push({ type: 'cluster', mobile, orders: siblings });
        continue;
      }
    }
    seen.add(order.id);
    groups.push({ type: 'single', order });
  }
  return groups;
}

/**
 * Groups already-CONFIRMED orders that share one invoice (invoiceId set by
 * createInvoiceForMergedOrders — see invoicesFirestore.js) into a single
 * "confirmed cluster". This is what makes a merge decision made pre-payment
 * keep showing as one card after "Confirm Payment for All" — no separate
 * merge flag needed post-confirm, the shared invoiceId already is that
 * signal. A lone order (or one whose invoice isn't shared with anyone else
 * in the current list) renders as its own single card as before.
 */
export function buildConfirmedInvoiceGroups(list) {
  const byInvoice = new Map();
  for (const order of list) {
    if (!order.invoiceId) continue;
    if (!byInvoice.has(order.invoiceId)) byInvoice.set(order.invoiceId, []);
    byInvoice.get(order.invoiceId).push(order);
  }

  const seen = new Set();
  const groups = [];
  for (const order of list) {
    if (seen.has(order.id)) continue;
    const siblings = order.invoiceId ? byInvoice.get(order.invoiceId) : null;
    if (siblings && siblings.length > 1) {
      siblings.forEach((o) => seen.add(o.id));
      groups.push({ type: 'cluster', invoiceId: order.invoiceId, orders: siblings });
      continue;
    }
    seen.add(order.id);
    groups.push({ type: 'single', order });
  }
  return groups;
}

/**
 * The Order Management page (AdminDashboard) shows every order status at
 * once — unlike Payment Confirmation's separate tabs — so it needs both
 * clustering rules layered together: still-AWAITING orders sharing a mobile
 * number become a merge *candidate* (`awaitingCluster` — the admin then
 * picks which ones actually get merged, see the selection banner in
 * AdminDashboard.jsx), and anything already CONFIRMED-or-later that shares
 * one invoice (from a completed "Confirm Payment for All") stays grouped
 * as a `confirmedCluster` instead of splitting back into separate cards
 * the moment payment lands — see MergedConfirmedCard.
 *
 * Kept as its own function (rather than composing the two above) since a
 * confirmed-invoice cluster's members aren't necessarily contiguous with
 * where each member would otherwise sort in the awaiting-only pass, and
 * splicing two independently-ordered outputs back together correctly is
 * more error-prone than a single combined walk over `list`.
 */
export function buildOrderManagementGroups(list) {
  const byInvoice = new Map();
  for (const order of list) {
    if (!order.invoiceId) continue;
    if (!byInvoice.has(order.invoiceId)) byInvoice.set(order.invoiceId, []);
    byInvoice.get(order.invoiceId).push(order);
  }

  const seen = new Set();
  const groups = [];
  for (const order of list) {
    if (seen.has(order.id)) continue;
    const mobile = order.customer?.mobile;

    if (order.status === 'AWAITING_ADMIN_CONFIRMATION' && mobile) {
      const siblings = list.filter(
        (o) => !seen.has(o.id) && o.status === 'AWAITING_ADMIN_CONFIRMATION' && o.customer?.mobile === mobile,
      );
      if (siblings.length > 1) {
        siblings.forEach((o) => seen.add(o.id));
        groups.push({ type: 'awaitingCluster', mobile, orders: siblings });
        continue;
      }
    }

    const invoiceSiblings = order.invoiceId ? byInvoice.get(order.invoiceId) : null;
    if (invoiceSiblings && invoiceSiblings.length > 1) {
      const unseen = invoiceSiblings.filter((o) => !seen.has(o.id));
      if (unseen.length > 1) {
        unseen.forEach((o) => seen.add(o.id));
        groups.push({ type: 'confirmedCluster', invoiceId: order.invoiceId, orders: unseen });
        continue;
      }
    }

    seen.add(order.id);
    groups.push({ type: 'single', order });
  }
  return groups;
}
