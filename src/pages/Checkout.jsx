import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { useCartStore } from '../store/useCartStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { useCartPricing } from '../hooks/useCartPricing';
import { checkoutSchema, checkoutDefaultValues } from '../schemas/checkoutSchema';
import { db } from '../firebase/config';
import { submitOrder } from '../services/ordersFirestore';
import { getUserProfile, saveUserAddress } from '../services/usersFirestore';

import CheckoutHeader from '../components/checkout/CheckoutHeader';
import CustomerForm from '../components/checkout/CustomerForm';
import AddressForm from '../components/checkout/AddressForm';
import PlaceOrderButton from '../components/checkout/PlaceOrderButton';
import OrderSuccessScreen from '../components/checkout/OrderSuccessScreen';
import FreeDeliveryProgress from '../components/cart/FreeDeliveryProgress';
import OrderSummary from '../components/cart/OrderSummary';
import FestiveBackdrop from '../components/ui/FestiveBackdrop';

export default function Checkout() {
  const navigate = useNavigate();
  const clearCart = useCartStore((s) => s.clearCart);
  const customer = useCustomerStore((s) => s.customer);
  const pricing = useCartPricing();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null); // { orderId } | null

  // Tracks which form section currently has focus so its card can show a
  // breathing glow (the "current step" treatment from the design spec).
  const [activeSection, setActiveSection] = useState(null);

  const sectionFocusHandlers = useCallback(
    (section) => ({
      onFocusCapture: () => setActiveSection(section),
      onBlurCapture: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setActiveSection((current) => (current === section ? null : current));
        }
      },
    }),
    []
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      ...checkoutDefaultValues,
      fullName: customer?.name ?? '',
      mobile: customer?.mobile ?? '',
    },
    mode: 'onTouched',
  });

  // Prefill the address fields from the customer's saved profile
  // (users/{mobile}.address — the same one "My Profile" edits), so returning
  // customers don't have to retype an address they've already given us.
  // Only fills fields still empty, so it never clobbers anything already
  // typed while this was loading.
  useEffect(() => {
    if (!customer?.mobile) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const profile = await getUserProfile(db, customer.mobile);
        if (cancelled || !profile?.address) return;
        const current = getValues();
        reset({
          ...current,
          houseNumber: current.houseNumber || profile.address.houseNumber || '',
          street: current.street || profile.address.street || '',
          area: current.area || profile.address.area || '',
          city: current.city || profile.address.city || '',
          district: current.district || profile.address.district || '',
          state: current.state || profile.address.state || '',
          pincode: current.pincode || profile.address.pincode || '',
        });
      } catch (err) {
        console.error('Failed to prefill address from profile', err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.mobile]);

  // Guard: nothing to check out with an empty cart (and no order just placed).
  useEffect(() => {
    if (!submittedOrder && pricing.items.length === 0) {
      navigate('/cart', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricing.items.length, submittedOrder]);

  const onValid = useCallback(
    async (values) => {
      if (isSubmitting || submittedOrder) return; // prevent duplicate submissions
      setIsSubmitting(true);
      try {
        const { orderId } = await submitOrder(db, { formValues: values, pricing });
        setSubmittedOrder({ orderId, grandTotal: pricing.grandTotal });
        clearCart();

        // Keep the saved profile address in sync with whatever they just
        // used here — best-effort, never blocks the success screen — so
        // "My Profile" and the admin Users page reflect their latest
        // address even if they never open "My Profile" directly.
        saveUserAddress(db, values.mobile.trim(), {
          name: values.fullName,
          address: {
            houseNumber: values.houseNumber.trim(),
            street: values.street.trim(),
            area: values.area.trim(),
            city: values.city.trim(),
            district: values.district.trim(),
            state: values.state.trim(),
            pincode: values.pincode.trim(),
          },
        }).catch((err) => console.error('Failed to sync profile address', err));
      } catch (err) {
        console.error('Order submission failed', err);
        toast.error("Couldn't place your order. Please check your connection and try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, submittedOrder, pricing, clearCart]
  );

  const onInvalid = useCallback(() => {
    toast.error('Please fix the highlighted fields before placing your order.');
  }, []);

  if (submittedOrder) {
    return (
      <OrderSuccessScreen
        orderId={submittedOrder.orderId}
        grandTotal={submittedOrder.grandTotal}
        orderStage="RECEIVED"
        onContinueShopping={() => navigate('/')}
        onViewOrders={() => navigate('/orders')}
      />
    );
  }

  if (pricing.items.length === 0) return null; // redirecting

  return (
    <div className="relative min-h-screen w-full pb-4">
      <FestiveBackdrop />

      <CheckoutHeader onBack={() => navigate(-1)} />

      <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
        <div className="mt-3 flex flex-col gap-3 px-4">
          <div {...sectionFocusHandlers('customer')}>
            <CustomerForm register={register} errors={errors} isActive={activeSection === 'customer'} />
          </div>
          <div {...sectionFocusHandlers('address')}>
            <AddressForm register={register} errors={errors} isActive={activeSection === 'address'} />
          </div>

          <FreeDeliveryProgress
            unlocked={pricing.freeDeliveryUnlocked}
            progressPct={pricing.deliveryProgressPct}
            amountRemaining={pricing.amountToFreeDelivery}
          />

          <OrderSummary pricing={pricing} />
        </div>

        <div className="mt-1">
          <PlaceOrderButton loading={isSubmitting} grandTotal={pricing.grandTotal} />
        </div>
      </form>
    </div>
  );
}
