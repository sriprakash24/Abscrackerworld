import { isComboProduct } from '../../utils/packingCharge';
import { useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Plus, Minus, Trash2, LayoutGrid, PencilLine } from 'lucide-react';
import CustomItemModal from './CustomItemModal';
import InvoiceProductPickerModal from './InvoiceProductPickerModal';

const QUICK_QTYS = [2, 5, 10, 15, 20, 25];

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
  const [customOpen, setCustomOpen] = useState(false);

  // What's already on the bill, by product — fed to the picker so re-opening
  // it shows those products as "In bill ×N" instead of looking untouched.
  const inBill = {};
  (watch('items') || []).forEach((it) => {
    if (it?.productId) inBill[it.productId] = (inBill[it.productId] || 0) + (Number(it.qty) || 0);
  });

  const bumpQty = (index, delta) => {
    const current = Number(watch(`items.${index}.qty`)) || 0;
    const next = Math.max(1, current + delta);
    setValue(`items.${index}.qty`, String(next), { shouldValidate: true, shouldDirty: true });
  };

  const handlePickProduct = (index, productId) => {
    setValue(`items.${index}.productId`, productId);
    if (!productId) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setValue(`items.${index}.isCombo`, isComboProduct(product));
    setValue(`items.${index}.description`, product.name, { shouldValidate: true });
    setValue(`items.${index}.rate`, String(product.sale ?? ''), { shouldValidate: true });
  };

  /** Appends rows, replacing the pristine blank default line instead of leaving it dangling. */
  const appendRows = (newRows) => {
    const currentItems = watch('items') || [];
    const onlyBlankRow = currentItems.length === 1 && !currentItems[0].description && !currentItems[0].productId;
    if (onlyBlankRow) replace(newRows);
    else append(newRows);
  };

  /** One-off line for this invoice only — never touches the product catalog. */
  const handleAddCustom = ({ description, qty, rate }) => {
    appendRows([{ productId: '', isCustom: true, description, qty: String(qty), rate: String(rate) }]);
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
        isCombo: isComboProduct(product),
        description: product?.name || '',
        qty: String(qty),
        rate: String(product?.sale ?? ''),
      });
    });

    if (newRows.length === 0) return;

    appendRows(newRows);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-wide text-muted">Items</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCustomOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-brown/20 bg-white px-3 py-1 text-[10.5px] font-bold text-brown"
          >
            <PencilLine size={12} />
            Custom item
          </button>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-orange/40 bg-orange/10 px-3 py-1 text-[10.5px] font-bold text-orange"
          >
            <LayoutGrid size={12} />
            Add products
          </button>
        </div>
      </div>

      {fields.map((field, index) => {
        const qty = Number(watch(`items.${index}.qty`)) || 0;
        const rate = Number(watch(`items.${index}.rate`)) || 0;
        const itemErrors = errors?.items?.[index];

        return (
          <div key={field.id} className="rounded-xl border border-brown/12 bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
              {watch(`items.${index}.productId`) ? (
                <div className="flex-1 truncate rounded-lg bg-brown/6 px-2.5 py-1.5 text-[10.5px] font-semibold text-muted">
                  Catalog item
                </div>
              ) : watch(`items.${index}.isCustom`) ? (
                <div className="flex-1 truncate rounded-lg bg-gold/15 px-2.5 py-1.5 text-[10.5px] font-bold text-gold">
                  Custom item · this invoice only
                </div>
              ) : (
              <select
                onChange={(e) => handlePickProduct(index, e.target.value)}
                defaultValue={field.productId || ''}
                className="w-full rounded-lg border border-brown/12 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-muted outline-none focus:border-orange/60"
              >
                <option value="">Pick from catalog (optional) — or type a custom line below</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.nameTa ? ` (${p.nameTa})` : ''} · ₹{p.sale}
                  </option>
                ))}
              </select>
              )}
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

            <div className="grid grid-cols-[1fr_104px_76px] gap-2">
              <div>
                <input
                  {...register(`items.${index}.description`)}
                  placeholder="Description of crackers"
                  className={`w-full rounded-lg border bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-brown outline-none ${
                    itemErrors?.description ? 'border-[#e35226]' : 'border-brown/12 focus:border-orange/60'
                  }`}
                />
                {itemErrors?.description && (
                  <p className="mt-1 text-[9.5px] font-semibold text-[#e35226]">{itemErrors.description.message}</p>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => bumpQty(index, -1)}
                  className="orb-3d flex h-7 w-6 shrink-0 items-center justify-center !rounded-md text-orange"
                  aria-label="Decrease quantity"
                >
                  <Minus size={10} />
                </button>
                <input
                  type="number"
                  step="1"
                  inputMode="numeric"
                  onFocus={(e) => e.target.select()}
                  {...register(`items.${index}.qty`)}
                  placeholder="Qty"
                  className={`w-full min-w-0 rounded-lg border bg-white px-1 py-1.5 text-center text-[11.5px] font-semibold text-brown outline-none ${
                    itemErrors?.qty ? 'border-[#e35226]' : 'border-brown/12 focus:border-orange/60'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => bumpQty(index, 1)}
                  className="orb-3d flex h-7 w-6 shrink-0 items-center justify-center !rounded-md text-orange"
                  aria-label="Increase quantity"
                >
                  <Plus size={10} />
                </button>
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  {...register(`items.${index}.rate`)}
                  placeholder="Rate ₹"
                  className={`w-full rounded-lg border-2 bg-orange/10 px-2 py-1.5 text-right text-[12.5px] font-extrabold text-[#c2410c] outline-none ${
                    itemErrors?.rate ? 'border-[#e35226]' : 'border-orange/40 focus:border-orange'
                  }`}
                />
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1">
              {QUICK_QTYS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setValue(`items.${index}.qty`, String(n), { shouldValidate: true, shouldDirty: true })}
                  className={`h-6 min-w-8 rounded-full border px-2 text-[10.5px] font-bold transition-colors ${
                    qty === n ? 'border-orange/60 bg-orange/20 text-orange' : 'border-brown/15 bg-white text-muted'
                  }`}
                >
                  {n}
                </button>
              ))}
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

      <CustomItemModal open={customOpen} onAdd={handleAddCustom} onClose={() => setCustomOpen(false)} />

      <InvoiceProductPickerModal
        open={pickerOpen}
        products={products}
        inBill={inBill}
        onAdd={handleAddFromPicker}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

