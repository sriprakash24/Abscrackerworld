import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, ShoppingBag, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { customerSchema, customerDefaultValues } from '../../schemas/customerSchema';
import { useCustomerGateStore } from '../../store/useCustomerGateStore';
import { useCustomerStore } from '../../store/useCustomerStore';
import { db } from '../../firebase/config';
import { saveUserProfile } from '../../services/usersFirestore';
import FormField from '../checkout/FormField';

/**
 * Bottom-up "who's shopping?" sheet. Fired once, on the very first Add to
 * Cart tap (see useCustomerGateStore). No password, no OTP — just enough
 * to attach a name + mobile number to this visitor's cart/order activity.
 * Closing it cancels the pending add; submitting saves locally + to
 * Firestore, then lets the original Add to Cart action continue.
 */
export default function CustomerDetailsSheet() {
  const isOpen = useCustomerGateStore((s) => s.isOpen);
  const cancel = useCustomerGateStore((s) => s.cancel);
  const resolve = useCustomerGateStore((s) => s.resolve);
  const setCustomer = useCustomerStore((s) => s.setCustomer);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: customerDefaultValues,
  });

  const handleClose = () => {
    if (submitting) return;
    reset(customerDefaultValues);
    cancel();
  };

  const onSubmit = async (values) => {
    const customer = { name: values.name.trim(), mobile: values.mobile.trim() };
    setSubmitting(true);
    try {
      await saveUserProfile(db, customer);
    } catch {
      // Non-blocking — the local flow still continues even if the write fails.
      toast('Saved locally — will sync once you\'re back online');
    } finally {
      setSubmitting(false);
    }
    setCustomer(customer);
    reset(customerDefaultValues);
    resolve(customer);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="panel-3d fixed inset-x-0 bottom-0 z-[70] mx-auto w-full max-w-[430px] rounded-t-[26px] px-5 pb-6 pt-3"
            style={{ background: 'linear-gradient(165deg, #1c1611 0%, #100c09 60%, #0a0706 100%)' }}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/15" />

            <button
              onClick={handleClose}
              aria-label="Close"
              className="orb-3d absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white/70"
            >
              <X size={15} />
            </button>

            <div className="orb-3d mb-3 flex h-12 w-12 items-center justify-center !rounded-2xl">
              <ShoppingBag size={20} className="text-gold" />
            </div>

            <h2 className="text-[16px] font-extrabold text-embossed text-[#f2ece2]">
              Just one quick step
            </h2>
            <p className="mt-1 text-[11.5px] font-medium leading-snug text-muted">
              Tell us who's shopping so we can keep your cart and order updates ready for you.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-3.5">
              <FormField
                label="Your Name"
                required
                registration={register('name')}
                error={errors.name}
                placeholder="e.g. Arun Kumar"
                autoComplete="name"
              />
              <FormField
                label="Mobile Number"
                required
                registration={register('mobile')}
                error={errors.mobile}
                placeholder="10-digit mobile number"
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel"
              />

              <button
                type="submit"
                disabled={submitting}
                className={`btn-3d mt-1 flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-extrabold text-black transition-opacity ${
                  submitting ? 'cursor-not-allowed opacity-60' : ''
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} />
                    Continue to Cart
                  </>
                )}
              </button>

              <p className="text-center text-[9.5px] font-semibold text-muted">
                No password, no OTP — we'll only use this to reach you about your order.
              </p>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
