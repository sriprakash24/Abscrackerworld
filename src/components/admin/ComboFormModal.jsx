import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { X, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Gift } from 'lucide-react';
import FormField from '../checkout/FormField';
import ComboImageField from './ComboImageField';
import {
  adminComboSchema,
  adminComboDefaultValues,
  comboToFormValues,
} from '../../schemas/adminComboSchema';
import { createCombo, updateCombo } from '../../services/combos';

const BADGE_SUGGESTIONS = ['BEST VALUE', 'MOST POPULAR', 'NEW', 'FAMILY PACK', 'LIMITED'];

/**
 * Create / edit a combo pack. `combo` (normalized product, isCombo) when
 * editing; `initialValues` pre-fills a new one (used by "Duplicate").
 * `catalog` is the live product list for the "add from catalog" picker.
 * Saves straight into Firestore — the storefront updates live.
 */
export default function ComboFormModal({ open, combo, initialValues, catalog = [], onClose }) {
  const isEdit = !!combo;
  const [submitting, setSubmitting] = useState(false);
  const [pickerValue, setPickerValue] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adminComboSchema),
    defaultValues: adminComboDefaultValues,
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: 'comboItems' });

  useEffect(() => {
    if (!open) return;
    if (isEdit) reset(comboToFormValues(combo));
    else reset({ ...adminComboDefaultValues, ...(initialValues || {}) });
    setPickerValue('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, combo]);

  const catalogByCategory = useMemo(() => {
    const groups = new Map();
    catalog
      .filter((p) => !p.isCombo)
      .forEach((p) => {
        if (!groups.has(p.category)) groups.set(p.category, []);
        groups.get(p.category).push(p);
      });
    return [...groups.entries()];
  }, [catalog]);

  const mrp = Number(watch('mrp')) || 0;
  const sale = Number(watch('salePrice')) || 0;
  const discount = mrp > sale && sale > 0 ? Math.round(((mrp - sale) / mrp) * 100) : 0;

  const addFromCatalog = (productId) => {
    const p = catalog.find((x) => x.id === productId);
    if (!p) return;
    append({ name: p.name, qty: '1', image: p.rawImage || '', productId: p.id });
    setPickerValue('');
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateCombo(combo.id, values);
        toast.success('Combo updated');
      } else {
        await createCombo(values);
        toast.success('Combo added — it is live on the storefront');
      }
      onClose();
    } catch (err) {
      console.error('Failed to save combo', err);
      toast.error("Couldn't save the combo. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const labelCls = 'mb-1.5 flex items-center gap-1 text-[11px] font-bold tracking-wide text-muted';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-brown/60 px-4 py-6 sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="surface-3d w-full max-w-2xl rounded-2xl p-5 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-gradient-gold">
                <Gift size={16} className="text-red" />
                {isEdit ? 'Edit Combo' : initialValues ? 'Duplicate Combo' : 'Add Combo'}
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {/* ---------- basics ---------- */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Combo name" required placeholder="e.g. FAMILY COMBO" registration={register('name')} error={errors.name} />
                <FormField label="Tamil name" placeholder="optional" registration={register('nameTa')} error={errors.nameTa} />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <FormField label="MRP (₹)" required type="number" step="0.01" registration={register('mrp')} error={errors.mrp} />
                <FormField label="Offer price (₹)" required type="number" step="0.01" registration={register('salePrice')} error={errors.salePrice} />
                <FormField label="Stock qty" required type="number" registration={register('stockQty')} error={errors.stockQty} />
                <FormField label="Unit" placeholder="1 COMBO" registration={register('unit')} error={errors.unit} />
              </div>
              {discount > 0 && (
                <p className="-mt-2 text-[11px] font-bold text-[#1E8E4A]">Customers will see {discount}% OFF on this combo.</p>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <span className={labelCls}>Ribbon badge</span>
                  <input
                    {...register('badge')}
                    list="combo-badges"
                    placeholder="e.g. BEST VALUE (optional)"
                    className="w-full rounded-xl border border-brown/12 bg-white px-3.5 py-2.5 text-[12.5px] font-semibold uppercase text-brown outline-none placeholder:font-normal placeholder:normal-case placeholder:text-muted focus:border-orange/70"
                  />
                  <datalist id="combo-badges">
                    {BADGE_SUGGESTIONS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                  {errors.badge && <p className="mt-1 text-[10.5px] font-semibold text-[#e35226]">{errors.badge.message}</p>}
                </div>
                <FormField
                  label="Display order"
                  type="number"
                  placeholder="Lower shows first"
                  registration={register('displayOrder')}
                  error={errors.displayOrder}
                />
              </div>

              <FormField label="Description" as="textarea" rows={2} placeholder="Shown in the View popup (optional)" registration={register('description')} error={errors.description} />

              {/* ---------- images ---------- */}
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-coral/30 bg-peach-light/60 p-3.5 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="image"
                  render={({ field }) => (
                    <ComboImageField
                      label="Card image"
                      hint="Shown on the combo card on the home page."
                      value={field.value}
                      previewSrc={isEdit ? combo.img : ''}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="comboImage"
                  render={({ field }) => (
                    <ComboImageField
                      label="“What's inside” image"
                      hint="The picture listing all the items — opens when a customer taps View."
                      value={field.value}
                      previewSrc={isEdit ? combo.comboImage : ''}
                      onChange={field.onChange}
                      wide
                    />
                  )}
                />
              </div>

              {/* ---------- items ---------- */}
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] font-extrabold uppercase tracking-wide text-orange">
                    Items in this combo ({fields.length})
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={pickerValue}
                      onChange={(e) => {
                        setPickerValue(e.target.value);
                        addFromCatalog(e.target.value);
                      }}
                      className="max-w-[210px] rounded-lg border border-brown/15 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-brown outline-none focus:border-red/60"
                    >
                      <option value="">+ Add from catalog…</option>
                      {catalogByCategory.map(([cat, list]) => (
                        <optgroup key={cat} label={cat}>
                          {list.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => append({ name: '', qty: '1', image: '', productId: '' })}
                      className="btn-3d-outline flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold"
                    >
                      <Plus size={12} /> Custom item
                    </button>
                  </div>
                </div>

                {fields.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-coral/40 bg-white px-3 py-4 text-center text-[11.5px] font-medium text-muted">
                    Optional — add items here to show a list (with photos &amp; quantities) in the popup. You can also rely
                    only on the “What's inside” image above.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {fields.map((f, i) => (
                      <li key={f.id} className="flex items-start gap-2 rounded-xl border border-coral/25 bg-white p-2.5">
                        <div className="flex shrink-0 flex-col gap-0.5">
                          <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move up" className="rounded p-0.5 text-muted hover:text-brown disabled:opacity-25">
                            <ChevronUp size={14} />
                          </button>
                          <button type="button" onClick={() => move(i, i + 1)} disabled={i === fields.length - 1} aria-label="Move down" className="rounded p-0.5 text-muted hover:text-brown disabled:opacity-25">
                            <ChevronDown size={14} />
                          </button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <input
                              {...register(`comboItems.${i}.name`)}
                              placeholder="Item name"
                              className="min-w-0 flex-1 rounded-lg border border-brown/15 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-brown outline-none placeholder:font-normal placeholder:text-muted focus:border-red/60"
                            />
                            <span className="text-[11px] font-bold text-muted">×</span>
                            <input
                              {...register(`comboItems.${i}.qty`)}
                              type="number"
                              min="1"
                              inputMode="numeric"
                              aria-label="Quantity"
                              className="w-16 rounded-lg border border-brown/15 bg-white px-2 py-1.5 text-center text-[12px] font-bold text-brown outline-none focus:border-red/60"
                            />
                          </div>
                          <div className="mt-2">
                            <Controller
                              control={control}
                              name={`comboItems.${i}.image`}
                              render={({ field }) => (
                                <ComboImageField
                                  compact
                                  value={field.value}
                                  previewSrc={combo?.comboItems?.[i]?.image || ''}
                                  onChange={field.onChange}
                                />
                              )}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          aria-label="Remove item"
                          className="shrink-0 rounded-lg p-1.5 text-[#e35226] hover:bg-[#e35226]/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ---------- visibility ---------- */}
              <div className="flex flex-wrap gap-2">
                <Toggle label="Hide from customers" registration={register('hidden')} active={watch('hidden')} />
                <Toggle label="Best seller" registration={register('bestSeller')} active={watch('bestSeller')} />
              </div>

              <div className="mt-1 flex gap-2.5">
                <button type="button" onClick={onClose} className="btn-3d-outline flex-1 rounded-xl py-2.5 text-[12.5px] font-bold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12.5px] font-bold text-white disabled:opacity-60"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  {isEdit ? 'Save Changes' : 'Add Combo'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Toggle({ label, registration, active }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
        active ? 'border-red/50 bg-red/10 text-red' : 'border-brown/12 bg-white text-muted'
      }`}
    >
      <input type="checkbox" {...registration} className="hidden" />
      {label}
    </label>
  );
}
