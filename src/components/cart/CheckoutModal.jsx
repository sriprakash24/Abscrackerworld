import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useCartStore } from '../../store/useCartStore';
import { useCustomerStore } from '../../store/useCustomerStore';
import { checkoutSchema, checkoutDefaultValues } from '../../schemas/checkoutSchema';
import { db } from '../../firebase/config';
import { submitOrder } from '../../services/ordersFirestore';

import CustomerForm from '../checkout/CustomerForm';
import AddressForm from '../checkout/AddressForm';
import OrderReview from '../checkout/OrderReview';
import OrderNotes from '../checkout/OrderNotes';
import TermsCheckbox from '../checkout/TermsCheckbox';
import PlaceOrderButton from '../checkout/PlaceOrderButton';
import OrderSuccessScreen from '../checkout/OrderSuccessScreen';
import OrderSummary from './OrderSummary';

/**
 * Checkout, as a bottom sheet over the Cart page instead of a full page
 * navigation — same form, same submit logic, just in place.
 */
export default function CheckoutModal({ open, onClose, pricing }) {
  const navigate = useNavigate();
  const clearCart = useCartStore((s) => s.clearCart);
  const customer = useCustomerStore((s) => s.customer);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null); // { orderId, grandTotal } | null
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
    reset,
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

  // Lock background scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const scrollEl = document.getElementById('app-scroll');
    const prevOverflow = scrollEl?.style.overflow;
    if (scrollEl) scrollEl.style.overflow = 'hidden';
    return () => {
      if (scrollEl) scrollEl.style.overflow = prevOverflow || '';
    };
  }, [open]);

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

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
    if (submittedOrder) {
      // Reset for next time, after the close animation finishes.
      setTimeout(() => {
        setSubmittedOrder(null);
        reset();
      }, 300);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="absolute inset-x-0 bottom-0 top-[5%] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] bg-[#150007]"
            style={{ boxShadow: '0 -12px 40px rgba(0,0,0,.6)' }}
          >
            {/* Ambient layers — matches the app-wide dark navy background */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#080c17] via-transparent to-[#080c17]" />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1/3"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,213,79,0.10) 0%, rgba(0,0,0,0) 65%)' }}
            />

            <div className="relative z-10 flex justify-center pt-2.5">
              <span className="h-1 w-10 rounded-full bg-white/15" />
            </div>

            <div className="relative z-10 flex items-center gap-2.5 px-4 pb-3 pt-2">
              <div className="min-w-0 flex-1">
                <div className="text-embossed truncate text-[14.5px] font-extrabold leading-tight text-[#f2ece2]">
                  {submittedOrder ? 'Order Confirmed' : 'Checkout'}
                </div>
                {!submittedOrder && (
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-muted">
                    <ShieldCheck size={11} className="text-[#8fe3a0]" />
                    Secure Order · No Payment Now
                  </div>
                )}
              </div>
              <button
                onClick={handleClose}
                aria-label="Close checkout"
                className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-orange"
              >
                <X size={18} strokeWidth={2.4} />
              </button>
            </div>

            <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain">
              {submittedOrder ? (
                <OrderSuccessScreen
                  orderId={submittedOrder.orderId}
                  grandTotal={submittedOrder.grandTotal}
                  orderStage="RECEIVED"
                  onContinueShopping={() => {
                    handleClose();
                    navigate('/');
                  }}
                  onViewOrders={() => {
                    handleClose();
                    navigate('/orders');
                  }}
                />
              ) : (
                <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
                  <div className="flex flex-col gap-3 px-4 pb-4">
                    <div {...sectionFocusHandlers('customer')}>
                      <CustomerForm register={register} errors={errors} isActive={activeSection === 'customer'} />
                    </div>
                    <div {...sectionFocusHandlers('address')}>
                      <AddressForm register={register} errors={errors} isActive={activeSection === 'address'} />
                    </div>
                    <OrderReview items={pricing.items} />
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

                  <PlaceOrderButton disabled={!agreeTerms} loading={isSubmitting} grandTotal={pricing.grandTotal} />
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
