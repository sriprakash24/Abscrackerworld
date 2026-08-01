import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { X, Loader2, UploadCloud, ImageOff } from "lucide-react";
import FormField from "../checkout/FormField";
import {
  adminCategorySchema,
  adminCategoryDefaultValues,
} from "../../schemas/adminCategorySchema";
import {
  createCategoryDoc,
  updateCategoryDoc,
  uploadCategoryImageFile,
} from "../../services/products";

/**
 * Add/edit category modal. `category` is present when editing (an item from
 * subscribeToCategoryDocs — {id, categoryName, displayOrder, image}), null
 * when adding. New categories are appended to the end of the display order;
 * reordering happens from the up/down arrows on the Categories list itself.
 */
export default function CategoryFormModal({
  open,
  category,
  existingCategories,
  onClose,
}) {
  const isEdit = !!category;
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adminCategorySchema),
    defaultValues: adminCategoryDefaultValues,
  });

  const imageValue = watch("image");

  useEffect(() => {
    if (!open) return;
    reset(
      isEdit
        ? { categoryName: category.categoryName, image: category.image || "" }
        : adminCategoryDefaultValues,
    );
    setImagePreview(isEdit ? category.image || "" : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  useEffect(() => {
    // Live-preview a pasted https:// URL as the user types it.
    if (imageValue && /^https?:\/\//i.test(imageValue))
      setImagePreview(imageValue);
  }, [imageValue]);

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadCategoryImageFile(file);
      setValue("image", url, { shouldValidate: true });
      setImagePreview(url);
      toast.success("Image uploaded");
    } catch (err) {
      console.error("Image upload failed", err);
      toast.error("Couldn't upload the image. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSubmit = async ({ categoryName, image }) => {
    const nameTaken = existingCategories.some(
      (c) =>
        c.categoryName.trim().toLowerCase() ===
          categoryName.trim().toLowerCase() && c.id !== category?.id,
    );
    if (nameTaken) {
      toast.error("A category with that name already exists.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateCategoryDoc(category.id, {
          categoryName: categoryName.trim(),
          image: image || "",
        });
        toast.success("Category updated");
      } else {
        await createCategoryDoc({ categoryName, image, existingCategories });
        toast.success("Category added");
      }
      onClose();
    } catch (err) {
      console.error("Failed to save category", err);
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
                {isEdit ? "Edit Category" : "Add Category"}
              </h2>
              <button
                onClick={onClose}
                className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted"
              >
                <X size={14} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-3.5"
            >
              <FormField
                label="Category name"
                required
                placeholder="e.g. SPARKLERS"
                registration={register("categoryName")}
                error={errors.categoryName}
              />

              <div>
                <span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold tracking-wide text-[#cfc7bd]">
                  Category image
                </span>
                <div className="flex items-center gap-3">
                  <div className="orb-3d flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden !rounded-xl">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageOff size={16} className="text-muted" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <FormField
                      label=""
                      className="!mb-0"
                      placeholder="Paste an image URL…"
                      registration={register("image")}
                      error={errors.image}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="btn-3d-outline flex items-center justify-center gap-1.5 self-start rounded-lg px-3 py-1.5 text-[11px] font-bold text-[#f2ece2] disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <UploadCloud size={12} />
                      )}
                      {uploading ? "Uploading…" : "Upload image"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFilePick}
                      className="hidden"
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-[10px] font-medium leading-relaxed text-muted">
                  Optional — falls back to the default emoji icon on the
                  storefront until an image is set.
                </p>
              </div>

              {!isEdit && (
                <p className="text-[11px] font-medium leading-relaxed text-muted">
                  New categories are added to the bottom of the list — use the
                  up/down arrows afterwards to reorder.
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
                  disabled={submitting || uploading}
                  className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12.5px] font-bold text-white disabled:opacity-60"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  {isEdit ? "Save Changes" : "Add Category"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
