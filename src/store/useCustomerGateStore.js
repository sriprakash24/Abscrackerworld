import { create } from 'zustand';
import { useCustomerStore } from './useCustomerStore';

// ---------------------------------------------------------------------------
// Gatekeeper for "we need the customer's name + mobile before this action
// can continue". Any Add-to-Cart button (home grid, category grid, etc.)
// calls `requestDetails(onConfirmed)`. If we already know who this visitor
// is, `onConfirmed` fires immediately — no interruption. Otherwise the
// bottom sheet opens; once the visitor submits, `onConfirmed` fires with
// the freshly saved { name, mobile }.
// ---------------------------------------------------------------------------

export const useCustomerGateStore = create((set, get) => ({
  isOpen: false,
  pendingAction: null,

  requestDetails: (onConfirmed) => {
    const { customer } = useCustomerStore.getState();
    if (customer?.name && customer?.mobile) {
      onConfirmed?.(customer);
      return;
    }
    set({ isOpen: true, pendingAction: onConfirmed });
  },

  resolve: (customer) => {
    const { pendingAction } = get();
    set({ isOpen: false, pendingAction: null });
    pendingAction?.(customer);
  },

  cancel: () => set({ isOpen: false, pendingAction: null }),
}));
