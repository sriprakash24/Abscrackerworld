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
 * shopping?" sheet (users/{mobile}). Only the name is editable — mobile is
 * the document id, and orders/invoices reference the customer by that same
 * mobile number, so changing it here isn't offered to avoid breaking those
 * lookups.
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
    reset({ name: user?.name || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const onSubmit = async ({ name }) => {
    if (!user) return;
    setSubmitting(true);
    try {
      await updateUserProfile(db, user.id, { name });
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
            className="surface-3d w-full max-w-sm rounded-2xl p-5"
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
