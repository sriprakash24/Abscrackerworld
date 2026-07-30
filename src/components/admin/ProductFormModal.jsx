import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { X, Loader2, UploadCloud, ImageOff } from 'lucide-react';
import FormField from '../checkout/FormField';
import {
  adminProductSchema,
  adminProductDefaultValues,
  productToFormValues,
} from '../../schemas/adminProductSchema';
import { createProduct, updateProductDoc, uploadProductImageFile } from '../../services/products';

const TOGGLES = [
  { key: 'featured', label: 'Featured' },
  { key: 'bestSeller', label: 'Best Seller' },
  { key: 'newArrival', label: 'New Arrival' },
  { key: 'flashDeal', label: 'Flash Deal' },
];

/**
 * Add/edit product modal. `product` (normalized, from useProducts()) is
 * present when editing, null when adding. `categories` is the live list of
 * category docs ({id, categoryName, displayOrder}) used to populate the
 * category dropdown — categories are managed on the separate /admin/categories
 * screen, this form only lets you pick one.
 */
export default function ProductFormModal({ open, product, categories, onClose }) {
  const isEdit = !!product;
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adminProductSchema),
    defaultValues: adminProductDefaultValues,
  });

  const imageValue = watch('image');

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      reset(productToFormValues(product));
      setImagePreview(product.img || '');
    } else {
      reset({ ...adminProductDefaultValues, category: categories[0]?.categoryName || '' });
      setImagePreview('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  useEffect(() => {
    // Live-preview a pasted https:// URL as the user types it.
    if (imageValue && /^https?:\/\//i.test(imageValue)) setImagePreview(imageValue);
  }, [imageValue]);

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImageFile(file);
      setValue('image', url, { shouldValidate: true });
      setImagePreview(url);
      toast.success('Image uploaded');
    } catch (err) {
      console.error('Image upload failed', err);
      toast.error("Couldn't upload the image. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        category: values.category,
        subcategory: values.subcategory || '',
        unit: values.unit,
        mrp: values.mrp,
        salePrice: values.salePrice,
        discountPercentage:
          values.mrp > values.salePrice ? Math.round(((values.mrp - values.salePrice) / values.mrp) * 100) : 0,
        stockQty: values.stockQty,
        stock: values.stockQty <= 0 ? 'out' : values.stockQty <= 5 ? 'low' : 'in',
        displayOrder: values.displayOrder || 0,
        description: values.description || '',
        image: values.image || '',
        featured: !!values.featured,
        bestSeller: !!values.bestSeller,
        newArrival: !!values.newArrival,
        flashDeal: !!values.flashDeal,
      };

      if (isEdit) {
        await updateProductDoc(product.id, payload);
        toast.success('Product updated');
      } else {
        await createProduct(payload);
        toast.success('Product added');
      }
      onClose();
    } catch (err) {
      console.error('Failed to save product', err);
      toast.error("Couldn't save the product. Please try again.");
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
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="surface-3d w-full max-w-lg rounded-2xl p-5 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-gradient-gold">
                {isEdit ? 'Edit Product' : 'Add Product'}
              </h2>
              <button
                onClick={onClose}
                className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
              <FormField label="Product name" required registration={register('name')} error={errors.name} />

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold tracking-wide text-[#cfc7bd]">
                    Category <span className="text-orange">*</span>
                  </span>
                  <select
                    {...register('category')}
                    className={`w-full rounded-xl border bg-[#0c0906] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#f2ece2] outline-none transition-all duration-200 ${
                      errors.category
                        ? 'border-[#e35226] shadow-[0_0_0_3px_rgba(227,82,38,0.15)]'
                        : 'border-white/10 focus:border-orange/70'
                    }`}
                  >
                    <option value="" disabled>
                      Select category
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.categoryName}>
                        {c.categoryName}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-[10.5px] font-semibold text-[#e35226]">{errors.category.message}</p>
                  )}
                </label>

                <FormField label="Unit" required placeholder='e.g. "1 PCS", "BOX"' registration={register('unit')} error={errors.unit} />
              </div>

              <FormField label="Subcategory" registration={register('subcategory')} error={errors.subcategory} />

              <div className="grid grid-cols-3 gap-3">
                <FormField label="MRP (₹)" required type="number" step="0.01" registration={register('mrp')} error={errors.mrp} />
                <FormField label="Sale price (₹)" required type="number" step="0.01" registration={register('salePrice')} error={errors.salePrice} />
                <FormField label="Stock qty" required type="number" registration={register('stockQty')} error={errors.stockQty} />
              </div>

              <FormField
                label="Display order"
                type="number"
                placeholder="Lower shows first"
                registration={register('displayOrder')}
                error={errors.displayOrder}
              />

              <FormField
                label="Description"
                as="textarea"
                rows={2}
                registration={register('description')}
                error={errors.description}
              />

              <div>
                <span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold tracking-wide text-[#cfc7bd]">
                  Product image
                </span>
                <div className="flex items-center gap-3">
                  <div className="orb-3d flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden !rounded-xl">
                    {imagePreview ? (
                      <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageOff size={16} className="text-muted" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <FormField
                      label=""
                      className="!mb-0"
                      placeholder="Paste an image URL…"
                      registration={register('image')}
                      error={errors.image}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="btn-3d-outline flex items-center justify-center gap-1.5 self-start rounded-lg px-3 py-1.5 text-[11px] font-bold text-[#f2ece2] disabled:opacity-50"
                    >
                      {uploading ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                      {uploading ? 'Uploading…' : 'Upload image'}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} className="hidden" />
                  </div>
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-[#cfc7bd]">Tags</span>
                <div className="flex flex-wrap gap-2">
                  {TOGGLES.map(({ key, label }) => (
                    <ToggleChip key={key} label={label} registration={register(key)} watchValue={watch(key)} />
                  ))}
                </div>
              </div>

              <div className="mt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-3d-outline flex-1 rounded-xl py-2.5 text-[12.5px] font-bold text-[#f2ece2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12.5px] font-bold text-white disabled:opacity-60"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  {isEdit ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ToggleChip({ label, registration, watchValue }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
        watchValue
          ? 'border-orange/50 bg-orange/15 text-orange'
          : 'border-white/10 bg-[#0c0906] text-muted'
      }`}
    >
      <input type="checkbox" {...registration} className="hidden" />
      {label}
    </label>
  );
}
