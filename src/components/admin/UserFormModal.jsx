import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import FormField from '../checkout/FormField';
import { adminUserSchema, adminUserDefaultValues } from '../../schemas/adminUserSchema';
import { db } from '../../firebase/config';
import { updateUserProfile } from '../../services/usersFirestore';

/**
 * Edit modal for a customer profile captured via the storefront's "who's
 * shopping?" sheet (users/{mobile}), plus their delivery address — the same
 * `address` field the customer's own "My Profile" page reads and writes, so
 * an edit from either side stays in sync. Mobile is the document id and
 * orders/invoices reference the customer by that same number, so changing
 * it here isn't offered to avoid breaking those lookups.
 */
export default function UserFormModal({ open, user, onClose }) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adminUserSchema),
    defaultValues: adminUserDefaultValues,
  });

  useEffect(() => {
    if (!open) return;
    const address = user?.address;
    reset({
      name: user?.name || '',
      houseNumber: address?.houseNumber || '',
      street: address?.street || '',
      area: address?.area || '',
      city: address?.city || '',
      district: address?.district || '',
      state: address?.state || '',
      pincode: address?.pincode || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const onSubmit = async (values) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const hasAnyAddressField = [
        values.houseNumber,
        values.street,
        values.area,
        values.city,
        values.district,
        values.state,
        values.pincode,
      ].some(Boolean);

      await updateUserProfile(db, user.id, {
        name: values.name,
        ...(hasAnyAddressField
          ? {
              address: {
                houseNumber: values.houseNumber.trim(),
                street: values.street.trim(),
                area: values.area.trim(),
                city: values.city.trim(),
                district: values.district.trim(),
                state: values.state.trim(),
                pincode: values.pincode.trim(),
              },
            }
          : {}),
      });
      toast.success('User updated');
      onClose();
    } catch (err) {
      console.error('Failed to update user', err);
      toast.error("Couldn't update the user. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="surface-3d max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-gradient-gold">Edit User</h2>
              <button onClick={onClose} className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
              <FormField label="Name" required registration={register('name')} error={errors.name} />

              <div className="rounded-xl bg-black/20 px-3.5 py-2.5 text-[11px] font-semibold text-muted">
                Mobile: {user?.mobile} <span className="text-[10px] font-medium">(can't be changed here)</span>
              </div>

              <div className="mt-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <p className="text-[11px] font-bold tracking-wide text-[#cfc7bd]">Delivery Address</p>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Door / House No." placeholder="e.g. 12-A" registration={register('houseNumber')} error={errors.houseNumber} />
                <FormField label="Street" placeholder="e.g. Gandhi Street" registration={register('street')} error={errors.street} />
              </div>

              <FormField label="Area / Locality" placeholder="e.g. Anna Nagar" registration={register('area')} error={errors.area} />

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Village / Town / City" placeholder="e.g. Sivakasi" registration={register('city')} error={errors.city} />
                <FormField label="District" placeholder="e.g. Virudhunagar" registration={register('district')} error={errors.district} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="State" placeholder="e.g. Tamil Nadu" registration={register('state')} error={errors.state} />
                <FormField
                  label="PIN Code"
                  type="tel"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="626123"
                  registration={register('pincode')}
                  error={errors.pincode}
                />
              </div>

              <div className="mt-1 flex gap-2.5">
                <button type="button" onClick={onClose} className="btn-3d-outline flex-1 rounded-xl py-2.5 text-[12.5px] font-bold text-[#f2ece2]">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12.5px] font-bold text-white disabled:opacity-60"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
