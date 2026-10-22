import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCustomerStore } from '../store/useCustomerStore';
import { useCartStore } from '../store/useCartStore';

/**
 * Customer "logout". There's no real auth session — identity is just the
 * name + mobile kept in localStorage — so logging out means forgetting that
 * identity on this device, plus the device-local cart / wishlist so the next
 * person using the phone starts clean.
 *
 * Order matters: the customer is cleared FIRST so the Firestore cart mirror
 * (useCartFirestoreSync) sees "no mobile" and skips — otherwise emptying the
 * local cart would delete the customer's saved cart from Firestore.
 */
export function useLogout() {
  const navigate = useNavigate();

  return useCallback(() => {
    useCustomerStore.getState().clearCustomer();
    useCartStore.setState({
      cart: {},
      wishlist: {},
      couponCode: null,
      couponStatus: null,
      couponMessage: null,
      editingOrderId: null,
      preEditCart: null,
    });
    toast.success('Logged out. See you again! 🎆');
    navigate('/', { replace: true });
  }, [navigate]);
}
