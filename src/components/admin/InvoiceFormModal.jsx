import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import FormField from '../checkout/FormField';
import InvoiceItemsEditor from './InvoiceItemsEditor';
import {
  invoiceSchema,
  invoiceDefaultValues,
  invoiceToFormValues,
  formValuesToInvoicePayload,
} from '../../schemas/invoiceSchema';
import { PAYMENT_MODES, PAYMENT_MODE_LABELS } from '../../constants/invoiceConstants';
import { db } from '../../firebase/config';
import { createManualInvoice, updateInvoice } from '../../services/invoicesFirestore';
import { useProducts } from '../../contexts/ProductsContext';

/**
 * Add/edit invoice modal. `invoice` (a doc from invoices/{id}) is present
 * when editing, null when creating a brand-new manual invoice for a
 * phone-in order. ORDER-sourced invoices can also be edited here (e.g. to
 * fix a typo or add a discount after the fact) — editing never touches the
 * linked order doc, only the invoice.
 */
export default function InvoiceFormModal({ open, invoice, onClose }) {
  const isEdit = !!invoice;
  const { products } = useProducts();
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    if (!open) return;
    reset(isEdit ? invoiceToFormValues(invoice) : invoiceDefaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice]);

  const items = watch('items');
  const packagePercent = Number(watch('packagePercent')) || 0;
  const subtotal = (items || []).reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  const packageAmount = Math.round((subtotal * packagePercent) / 100);
  const grandTotal = Math.max(subtotal + packageAmount, 0);

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = formValuesToInvoicePayload(values);
      if (isEdit) {
        await updateInvoice(db, invoice.id, payload);
        toast.success('Invoice updated');
      } else {
        await createManualInvoice(db, payload);
        toast.success('Invoice created');
      }
      onClose();
    } catch (err) {
      console.error('Failed to save invoice', err);
      toast.error("Couldn't save the invoice. Please try again.");
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
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6"
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
              <button onClick={onClose} className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted">
                <X size={14} />
              </button>
            </div>

            {isEdit && invoice.source === 'ORDER' && (
              <div className="mb-3.5 rounded-xl border border-orange/25 bg-orange/10 px-3 py-2 text-[10.5px] font-semibold text-orange">
                Linked to website order {invoice.orderId} — editing here only changes the invoice, not the order.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Customer name" required registration={register('customerName')} error={errors.customerName} />
                <FormField label="Mobile No." required registration={register('customerMobile')} error={errors.customerMobile} />
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

              {isEdit && invoice.source === 'ORDER' && invoice.cartDiscountAmount > 0 && (
                <div className="rounded-xl border border-gold/25 bg-gold/10 px-3.5 py-2.5 text-[10.5px] font-semibold text-gold">
                  Cart discount applied at checkout: ₹{Number(invoice.cartDiscountAmount).toLocaleString('en-IN')}.
                  Already reflected in the item rates below — shown here for reference only, not part of this invoice's total.
                </div>
              )}

              <div className="rounded-xl bg-black/20 px-3.5 py-3 text-[10.5px] text-[#cfc7bd]">
                <div className="flex justify-between"><span>Total Amount</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span>Packing Charge ({packagePercent}%)</span><span>₹{packageAmount.toLocaleString('en-IN')}</span></div>
                <div className="mt-1 flex justify-between border-t border-dashed border-white/10 pt-1.5 text-[12.5px] font-extrabold text-[#f2ece2]">
                  <span>Grand Total</span><span>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-[#cfc7bd]">Payment Mode</span>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_MODES.map((mode) => (
                    <label
                      key={mode}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                        watch('paymentMode') === mode ? 'border-orange/50 bg-orange/15 text-orange' : 'border-white/10 bg-[#0c0906] text-muted'
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

              <div className="mt-2 flex gap-2.5">
                <button type="button" onClick={onClose} className="btn-3d-outline flex-1 rounded-xl py-2.5 text-[12.5px] font-bold text-[#f2ece2]">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12.5px] font-bold text-white disabled:opacity-60"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  {isEdit ? 'Save Changes' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
