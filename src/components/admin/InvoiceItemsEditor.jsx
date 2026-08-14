import { useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Plus, Trash2, LayoutGrid } from 'lucide-react';
import InvoiceProductPickerModal from './InvoiceProductPickerModal';

/**
 * Renders the editable item rows for the invoice form. Each row has an
 * optional "pick from catalog" dropdown (auto-fills description + rate from
 * a live product) alongside always-editable description/qty/rate inputs, so
 * staff can either pick a real product or type a custom line for a phone-in
 * order that doesn't match anything in the catalog.
 *
 * For orders with a lot of line items, "Add products" opens a category-wise
 * bulk picker (InvoiceProductPickerModal) instead of repeating "Add Line" +
 * dropdown-search one product at a time.
 */
export default function InvoiceItemsEditor({ control, register, watch, setValue, errors, products }) {
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' });
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePickProduct = (index, productId) => {
    setValue(`items.${index}.productId`, productId);
    if (!productId) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setValue(`items.${index}.description`, product.name, { shouldValidate: true });
    setValue(`items.${index}.rate`, String(product.sale ?? ''), { shouldValidate: true });
  };

  /** Merges a batch of {productId, qty} picks from the bulk picker into the item rows. */
  const handleAddFromPicker = (picks) => {
    const currentItems = watch('items') || [];
    const newRows = [];

    picks.forEach(({ productId, qty }) => {
      const existingIndex = currentItems.findIndex((it) => it.productId === productId);
      if (existingIndex !== -1) {
        const newQty = (Number(currentItems[existingIndex].qty) || 0) + qty;
        setValue(`items.${existingIndex}.qty`, String(newQty), { shouldValidate: true });
        return;
      }
      const product = products.find((p) => p.id === productId);
      newRows.push({
        productId,
        description: product?.name || '',
        qty: String(qty),
        rate: String(product?.sale ?? ''),
      });
    });

    if (newRows.length === 0) return;

    // If the only row so far is the pristine default blank line, replace it
    // instead of leaving it dangling (it would fail validation unfilled).
    const onlyBlankRow = currentItems.length === 1 && !currentItems[0].description && !currentItems[0].productId;
    if (onlyBlankRow) {
      replace(newRows);
    } else {
      append(newRows);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-wide text-[#cfc7bd]">Items</span>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-orange/40 bg-orange/10 px-3 py-1 text-[10.5px] font-bold text-orange"
        >
          <LayoutGrid size={12} />
          Add products
        </button>
      </div>

      {fields.map((field, index) => {
        const qty = Number(watch(`items.${index}.qty`)) || 0;
        const rate = Number(watch(`items.${index}.rate`)) || 0;
        const itemErrors = errors?.items?.[index];

        return (
          <div key={field.id} className="rounded-xl border border-white/10 bg-[#0c0906] p-3">
            <div className="mb-2 flex items-center gap-2">
              <select
                onChange={(e) => handlePickProduct(index, e.target.value)}
                defaultValue={field.productId || ''}
                className="w-full rounded-lg border border-white/10 bg-[#111111] px-2.5 py-1.5 text-[11px] font-semibold text-[#cfc7bd] outline-none focus:border-orange/60"
              >
                <option value="">Pick from catalog (optional) — or type a custom line below</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.nameTa ? ` (${p.nameTa})` : ''} · ₹{p.sale}
                  </option>
                ))}
              </select>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-full text-muted hover:text-[#e35226]"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-[1fr_64px_84px] gap-2">
              <div>
                <input
                  {...register(`items.${index}.description`)}
                  placeholder="Description of crackers"
                  className={`w-full rounded-lg border bg-[#111111] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#f2ece2] outline-none ${
                    itemErrors?.description ? 'border-[#e35226]' : 'border-white/10 focus:border-orange/60'
                  }`}
                />
                {itemErrors?.description && (
                  <p className="mt-1 text-[9.5px] font-semibold text-[#e35226]">{itemErrors.description.message}</p>
                )}
              </div>
              <div>
                <input
                  type="number"
                  step="1"
                  {...register(`items.${index}.qty`)}
                  placeholder="Qty"
                  className={`w-full rounded-lg border bg-[#111111] px-2 py-1.5 text-center text-[11.5px] font-semibold text-[#f2ece2] outline-none ${
                    itemErrors?.qty ? 'border-[#e35226]' : 'border-white/10 focus:border-orange/60'
                  }`}
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  {...register(`items.${index}.rate`)}
                  placeholder="Rate ₹"
                  className={`w-full rounded-lg border bg-[#111111] px-2 py-1.5 text-right text-[11.5px] font-semibold text-[#f2ece2] outline-none ${
                    itemErrors?.rate ? 'border-[#e35226]' : 'border-white/10 focus:border-orange/60'
                  }`}
                />
              </div>
            </div>

            <div className="mt-1.5 text-right text-[10.5px] font-bold text-gold">
              Amount: ₹{(qty * rate || 0).toLocaleString('en-IN')}
            </div>
          </div>
        );
      })}

      {errors?.items?.root && (
        <p className="text-[10.5px] font-semibold text-[#e35226]">{errors.items.root.message}</p>
      )}

      <button
        type="button"
        onClick={() => append({ productId: '', description: '', qty: '1', rate: '' })}
        className="btn-3d-outline flex items-center justify-center gap-1.5 self-start rounded-lg px-3 py-1.5 text-[11px] font-bold text-[#f2ece2]"
      >
        <Plus size={12} />
        Add Line
      </button>

      <InvoiceProductPickerModal
        open={pickerOpen}
        products={products}
        onAdd={handleAddFromPicker}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

