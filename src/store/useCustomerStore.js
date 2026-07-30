import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Lightweight customer identity — captured once (name + mobile) via the
// bottom-sheet prompt shown on the first "Add to Cart" tap. No auth, no
// OTP — this is just enough to attach a real person to their cart/order
// activity in Firestore. Persists locally so returning visitors are never
// asked twice.
// ---------------------------------------------------------------------------

export const useCustomerStore = create(
  persist(
    (set) => ({
      customer: null, // { name, mobile } | null

      setCustomer: (customer) => set({ customer }),

      clearCustomer: () => set({ customer: null }),
    }),
    { name: 'abs_customer' }
  )
);
