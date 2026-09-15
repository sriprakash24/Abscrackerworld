// Local-only "safety net" for the packing checklist — every tap writes
// here immediately (cheap, synchronous, no network), so a refresh or a
// crashed tab never loses progress that hasn't been pushed to Firestore
// yet via the "Save Progress" button. This is NOT the source of truth
// (Firestore is, via packingFirestore.js) — it's only consulted to
// recover unsaved work when a checklist is reopened.
//
// Stores a per-item tally object { [itemKey]: unitsPackedSoFar }, not
// just a flat list of "fully packed" keys — that's what lets the
// checklist remember a partially-counted item (e.g. 3 of 4 units tapped)
// across a refresh, not just all-or-nothing per item. Older drafts saved
// before this existed are a plain array of fully-packed keys; those are
// still read correctly (loadDraft flags them via `legacyPackedKeys` so
// the caller can convert using each item's own quantity).

const PREFIX = "abscracker:packing-draft:";

export function loadDraft(jobKey) {
  try {
    const raw = localStorage.getItem(PREFIX + jobKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { legacyPackedKeys: parsed };
    if (parsed && typeof parsed === "object") return { tally: parsed };
    return null;
  } catch {
    return null;
  }
}

export function saveDraft(jobKey, tally) {
  try {
    localStorage.setItem(PREFIX + jobKey, JSON.stringify(tally));
  } catch {
    // Storage full/unavailable (private browsing etc.) — the Firestore
    // "Save Progress" button still works, this is just the extra safety net.
  }
}

export function clearDraft(jobKey) {
  try {
    localStorage.removeItem(PREFIX + jobKey);
  } catch {
    // ignore
  }
}
