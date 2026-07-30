import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import FormField from '../checkout/FormField';
import { adminCategorySchema, adminCategoryDefaultValues } from '../../schemas/adminCategorySchema';
import { createCategoryDoc, updateCategoryDoc } from '../../services/products';

/**
 * Add/edit category modal. `category` is present when editing (an item from
 * subscribeToCategoryDocs — {id, categoryName, displayOrder}), null when
 * adding. New categories are appended to the end of the display order;
 * reordering happens from the up/down arrows on the Categories list itself.
 */
export default function CategoryFormModal({ open, category, existingCategories, onClose }) {
  const isEdit = !!category;
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adminCategorySchema),
    defaultValues: adminCategoryDefaultValues,
  });

  useEffect(() => {
    if (!open) return;
    reset(isEdit ? { categoryName: category.categoryName } : adminCategoryDefaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  const onSubmit = async ({ categoryName }) => {
    const nameTaken = existingCategories.some(
      (c) => c.categoryName.trim().toLowerCase() === categoryName.trim().toLowerCase() && c.id !== category?.id
    );
    if (nameTaken) {
      toast.error('A category with that name already exists.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateCategoryDoc(category.id, { categoryName: categoryName.trim() });
        toast.success('Category updated');
      } else {
        await createCategoryDoc({ categoryName, existingCategories });
        toast.success('Category added');
      }
      onClose();
    } catch (err) {
      console.error('Failed to save category', err);
      toast.error("Couldn't save the category. Please try again.");
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
              <h2 className="text-[15px] font-extrabold text-gradient-gold">
                {isEdit ? 'Edit Category' : 'Add Category'}
              </h2>
              <button
                onClick={onClose}
                className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
              <FormField
                label="Category name"
                required
                placeholder="e.g. SPARKLERS"
                registration={register('categoryName')}
                error={errors.categoryName}
              />

              {!isEdit && (
                <p className="text-[11px] font-medium leading-relaxed text-muted">
                  New categories are added to the bottom of the list — use the up/down arrows afterwards to reorder.
                </p>
              )}

              <div className="mt-1 flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-3d-outline flex-1 rounded-xl py-2.5 text-[12.5px] font-bold text-[#f2ece2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12.5px] font-bold text-white disabled:opacity-60"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  {isEdit ? 'Save Changes' : 'Add Category'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
