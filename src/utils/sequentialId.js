// Shared "ABS-style" sequential ID generator — used by both orders
// (ABSO...) and invoices (ABSI...), so the format lives in exactly one
// place instead of being duplicated per feature.
//
// Format:  <PREFIX><YYYY><MM><DD><SEQ>
//   e.g.   ABSO 2026 08 01 108  ->  "ABSO20260801108"
//          ABSI 2026 08 01 108  ->  "ABSI20260801108"
//
// - PREFIX  — "ABSO" for orders, "ABSI" for invoices.
// - YYYYMMDD — today's date (local time).
// - SEQ     — a 3-digit, zero-padded counter that resets every day. Backed
//   by an atomic Firestore transaction on counters/{counterKey}_{YYYYMMDD},
//   so two admins/customers hitting "Confirm" at the same instant never
//   collide, and the counter starts back at 001 the next day automatically
//   (a new counter doc — nothing to reset by hand). If a single day ever
//   passes 999, the sequence just grows past 3 digits (1000, 1001, ...)
//   instead of colliding or breaking.
//
// Usage:
//   reserveSequentialId(db, { prefix: 'ABSO', counterKey: 'orders' })
//   reserveSequentialId(db, { prefix: 'ABSI', counterKey: 'invoices' })

import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

/** Today's date as YYYYMMDD (local time), e.g. "20260801". */
function todayStamp() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Atomically reserves and returns the next sequential id for today, e.g.
 * "ABSO20260801108". `counterKey` namespaces the counter doc so orders and
 * invoices (or any future id type) each keep their own daily sequence.
 */
export async function reserveSequentialId(db, { prefix, counterKey }) {
  const stamp = todayStamp();
  const counterRef = doc(db, 'counters', `${counterKey}_${stamp}`);

  const seq = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? snap.data().value || 0 : 0;
    const next = current + 1;
    tx.set(counterRef, { value: next, updatedAt: serverTimestamp() }, { merge: true });
    return next;
  });

  const seqStr = String(seq).padStart(3, '0');
  return `${prefix}${stamp}${seqStr}`;
}
