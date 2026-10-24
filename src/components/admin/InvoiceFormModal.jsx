import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { X, Minus, Plus, Eye } from 'lucide-react';
import FormField from '../checkout/FormField';
import InvoiceItemsEditor from './InvoiceItemsEditor';
import InvoicePreviewModal from './InvoicePreviewModal';
import {
  invoiceSchema,
  invoiceDefaultValues,
  invoiceToFormValues,
  formValuesToInvoicePayload,
} from '../../schemas/invoiceSchema';
import { PAYMENT_MODES, PAYMENT_MODE_LABELS } from '../../constants/invoiceConstants';
import { db } from '../../firebase/config';
import { createManualInvoice, updateInvoice, computeInvoiceTotals } from '../../services/invoicesFirestore';
import { useProducts } from '../../contexts/ProductsContext';

/**
 * Add/edit invoice modal. `invoice` (a doc from invoices/{id}) is present
 * when editing, null when creating a brand-new manual invoice for a
 * phone-in order. ORDER-sourced invoices can also be edited here — e.g. the
 * customer added or swapped an item after the invoice was generated.
 * Editing items on an ORDER-linked invoice also rewrites the linked order's
 * cartItems/totals in the same write (see updateInvoice), so admin Order
 * Management and the customer's Order History / Track Order pages stay in
 * sync automatically.
 */
// Internal "bump the bill" size for the +/- buttons. Intentionally not shown
// anywhere in the UI or on the customer's invoice.
const ADJUST_STEP = 300;

// An unsaved NEW invoice is kept in localStorage as the admin types, so an
// accidental close / refresh / tab switch never loses the products already
// picked. Cleared once the invoice is created or the admin taps "Start fresh".
export const INVOICE_DRAFT_KEY = 'abs.invoice.draft.v1';

function loadSavedDraft() {
  try {
    const raw = window.localStorage.getItem(INVOICE_DRAFT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    const hasContent =
      (v.items || []).some((it) => it.description || it.productId) ||
      v.customerName || v.customerMobile || v.customerAddress || Number(v.adjustment);
    return hasContent ? { ...invoiceDefaultValues, ...v } : null;
  } catch {
    return null;
  }
}

function clearSavedDraft() {
  try {
    window.localStorage.removeItem(INVOICE_DRAFT_KEY);
    window.localStorage.removeItem('abs.invoice.picker.v1');
  } catch {
    /* storage unavailable */
  }
}

export default function InvoiceFormModal({ open, invoice, onClose }) {
  const isEdit = !!invoice;
  const { products } = useProducts();
  const [submitting, setSubmitting] = useState(false);
  // Validated form values + built invoice, while the preview is showing.
  const [draft, setDraft] = useState(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoiceDefaultValues,
  });

  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(null);
    if (isEdit) {
      reset(invoiceToFormValues(invoice));
      setRestored(false);
      return;
    }
    const saved = loadSavedDraft();
    reset(saved || invoiceDefaultValues);
    setRestored(!!saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice]);

  // Keep the unsaved new-invoice draft in localStorage while the form is open.
  useEffect(() => {
    if (!open || isEdit) return undefined;
    const sub = watch((values) => {
      try {
        window.localStorage.setItem(INVOICE_DRAFT_KEY, JSON.stringify(values));
      } catch {
        /* storage full/unavailable — draft just won't be kept */
      }
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, watch]);

  const startFresh = () => {
    clearSavedDraft();
    reset(invoiceDefaultValues);
    setRestored(false);
  };

  const items = watch('items');
  const packagePercent = Number(watch('packagePercent')) || 0;
  const subtotal = (items || []).reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  const packableAmount = (items || []).reduce(
    (sum, it) => (it.isCombo ? sum : sum + (Number(it.qty) || 0) * (Number(it.rate) || 0)),
    0,
  );
  const packageAmount = Math.round((packableAmount * packagePercent) / 100);
  const adjustment = Math.round(Number(watch('adjustment')) || 0);
  const grandTotal = Math.max(subtotal + packageAmount + adjustment, 0);

  const bumpAdjustment = (direction) => {
    setValue('adjustment', String(adjustment + direction * ADJUST_STEP), { shouldDirty: true });
  };

  // Validates the form, then shows the invoice exactly as it will print
  // before anything is saved. "Create Invoice" lives on the preview.
  const onPreview = (values) => {
    const payload = formValuesToInvoicePayload(values);
    const totals = computeInvoiceTotals({
      items: payload.items,
      packagePercent: payload.packagePercent,
      adjustmentAmount: payload.adjustmentAmount,
    });
    setDraft({
      values,
      invoice: {
        ...payload,
        ...totals,
        invoiceNo: '',
        source: isEdit ? invoice.source : 'MANUAL',
        orderId: isEdit ? invoice.orderId : null,
        cartDiscountAmount: isEdit ? invoice.cartDiscountAmount : 0,
        date: isEdit ? invoice.date : new Date(),
      },
    });
  };

  const doSave = async (values) => {
    setSubmitting(true);
    try {
      const payload = formValuesToInvoicePayload(values);
      if (isEdit) {
        await updateInvoice(db, invoice.id, payload, {
          orderDocId: invoice.source === 'ORDER' ? invoice.orderDocId : null,
          products,
        });
        toast.success(
          invoice.source === 'ORDER' ? 'Invoice and order updated' : 'Invoice updated'
        );
      } else {
        await createManualInvoice(db, payload);
        clearSavedDraft();
        toast.success('Invoice created');
      }
      setDraft(null);
      onClose();
    } catch (err) {
      console.error('Failed to save invoice', err);
      toast.error("Couldn't save the invoice. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-brown/60 px-4 py-6"
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
              <h2 className="text-[15px] font-extrabold text-gradient-gold">
                {isEdit ? `Edit Invoice ${invoice.invoiceNo || ''}` : 'New Manual Invoice'}
              </h2>
              <button type="button" onClick={onClose} className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted">
                <X size={14} />
              </button>
            </div>

            {isEdit && invoice.source === 'ORDER' && (
              <div className="mb-3.5 rounded-xl border border-orange/25 bg-orange/10 px-3 py-2 text-[10.5px] font-semibold text-orange">
                Linked to website order {invoice.orderId} — saving here also updates the item list and totals on that order, so it reflects everywhere (admin Orders, customer Order History &amp; Track Order).
              </div>
            )}

            {restored && !isEdit && (
              <div className="mb-3.5 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10.5px] font-semibold text-emerald-700">
                <span>Restored your unsaved invoice.</span>
                <button type="button" onClick={startFresh} className="shrink-0 font-extrabold underline">
                  Start fresh
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit(onPreview)} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Customer name"
                  placeholder="Walk-in Customer"
                  autoComplete="off"
                  registration={register('customerName')}
                  error={errors.customerName}
                />
                <FormField
                  label="Mobile No. (optional)"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="Optional"
                  registration={register('customerMobile')}
                  error={errors.customerMobile}
                />
              </div>
              <FormField label="Address" as="textarea" rows={2} registration={register('customerAddress')} error={errors.customerAddress} />

              <InvoiceItemsEditor
                control={control}
                register={register}
                watch={watch}
                setValue={setValue}
                errors={errors}
                products={products}
              />

              <FormField label="Package %" type="number" step="0.5" registration={register('packagePercent')} error={errors.packagePercent} />
              <input type="hidden" {...register('adjustment')} />

              {isEdit && invoice.source === 'ORDER' && invoice.cartDiscountAmount > 0 && (
                <div className="rounded-xl border border-gold/25 bg-gold/10 px-3.5 py-2.5 text-[10.5px] font-semibold text-gold">
                  Cart discount applied at checkout: ₹{Number(invoice.cartDiscountAmount).toLocaleString('en-IN')}.
                  Already reflected in the item rates below — shown here for reference only, not part of this invoice's total.
                </div>
              )}

              <div className="rounded-xl bg-brown/8 px-3.5 py-3 text-[10.5px] text-muted">
                <div className="flex justify-between"><span>Total Amount</span><span>₹{(subtotal + adjustment).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span>Packing Charge ({packagePercent}%)</span><span>₹{packageAmount.toLocaleString('en-IN')}</span></div>
                <div className="mt-1 flex justify-between border-t border-dashed border-brown/12 pt-1.5 text-[12.5px] font-extrabold text-brown">
                  <span>Grand Total</span><span>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-muted">Payment Mode</span>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_MODES.map((mode) => (
                    <label
                      key={mode}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                        watch('paymentMode') === mode ? 'border-orange/50 bg-orange/15 text-orange' : 'border-brown/12 bg-white text-muted'
                      }`}
                    >
                      <input type="radio" value={mode} {...register('paymentMode')} className="hidden" />
                      {PAYMENT_MODE_LABELS[mode]}
                    </label>
                  ))}
                </div>
              </div>

              <FormField label="Transaction / UTR No." registration={register('transactionRef')} error={errors.transactionRef} />
              <FormField label="Notes" as="textarea" rows={2} registration={register('notes')} error={errors.notes} />

              {/* Sticky action bar — grand total + "Adjust bill" stay on screen while scrolling a long item list */}
              <div className="sticky bottom-0 -mx-5 -mb-5 mt-1 rounded-b-2xl border-t border-orange/25 bg-bg/95 px-5 pb-4 pt-3 shadow-[0_-10px_24px_-14px_rgba(80,40,10,0.35)] backdrop-blur-sm sm:-mx-6 sm:-mb-6 sm:px-6">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[9.5px] font-bold uppercase tracking-wide text-muted">Grand total</div>
                    <div className="text-[18px] font-extrabold leading-tight text-gradient-gold">₹{grandTotal.toLocaleString('en-IN')}</div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-orange/35 bg-orange/10 p-1">
                    <button
                      type="button"
                      onClick={() => bumpAdjustment(-1)}
                      aria-label="Decrease total"
                      className="orb-3d flex h-9 w-9 items-center justify-center !rounded-full text-orange active:scale-95"
                    >
                      <Minus size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => bumpAdjustment(1)}
                      aria-label="Increase total"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-[#ff8a3d] to-[#e35226] text-white shadow-[0_6px_14px_-6px_rgba(227,82,38,0.7)] active:scale-95"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button type="button" onClick={onClose} className="btn-3d-outline flex-1 rounded-xl py-2.5 text-[12.5px] font-bold text-brown">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12.5px] font-bold text-white"
                  >
                    <Eye size={13} />
                    Preview
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
      <InvoicePreviewModal
        open={!!draft}
        draft
        invoice={draft?.invoice}
        confirming={submitting}
        confirmLabel={isEdit ? 'Save Changes' : 'Create Invoice'}
        onConfirm={() => doSave(draft.values)}
        onClose={() => setDraft(null)}
      />
    </>
  );
}
