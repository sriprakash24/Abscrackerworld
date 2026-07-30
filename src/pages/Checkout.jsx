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

import CheckoutHeader from '../components/checkout/CheckoutHeader';
import CustomerForm from '../components/checkout/CustomerForm';
import AddressForm from '../components/checkout/AddressForm';
import OrderReview from '../components/checkout/OrderReview';
import OrderNotes from '../components/checkout/OrderNotes';
import TermsCheckbox from '../components/checkout/TermsCheckbox';
import PlaceOrderButton from '../components/checkout/PlaceOrderButton';
import OrderSuccessScreen from '../components/checkout/OrderSuccessScreen';
import FreeDeliveryProgress from '../components/cart/FreeDeliveryProgress';
import OrderSummary from '../components/cart/OrderSummary';
import EmberParticles from '../components/ui/EmberParticles';

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
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      ...checkoutDefaultValues,
      fullName: customer?.name ?? '',
      mobile: customer?.mobile ?? '',
    },
    mode: 'onTouched',
  });

  const agreeTerms = watch('agreeTerms');

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
      <EmberParticles count={8} className="opacity-30" />

      <CheckoutHeader onBack={() => navigate(-1)} />

      <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
        <div className="mt-3 flex flex-col gap-3 px-4">
          <div {...sectionFocusHandlers('customer')}>
            <CustomerForm register={register} errors={errors} isActive={activeSection === 'customer'} />
          </div>
          <div {...sectionFocusHandlers('address')}>
            <AddressForm register={register} errors={errors} isActive={activeSection === 'address'} />
          </div>
          <OrderReview items={pricing.items} />

          <FreeDeliveryProgress
            unlocked={pricing.freeDeliveryUnlocked}
            progressPct={pricing.deliveryProgressPct}
            amountRemaining={pricing.amountToFreeDelivery}
          />

          <div {...sectionFocusHandlers('notes')}>
            <OrderNotes register={register} errors={errors} isActive={activeSection === 'notes'} />
          </div>
          <OrderSummary pricing={pricing} />

          <TermsCheckbox
            checked={!!agreeTerms}
            registration={register('agreeTerms')}
            error={errors.agreeTerms}
          />
        </div>

        <div className="mt-1">
          <PlaceOrderButton
            disabled={!agreeTerms}
            loading={isSubmitting}
            grandTotal={pricing.grandTotal}
          />
        </div>
      </form>
    </div>
  );
}
