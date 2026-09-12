import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../firebase/config';
import { updateOrderItems } from '../../services/ordersFirestore';
import OrderReview from '../checkout/OrderReview';
import OrderSummary from '../cart/OrderSummary';

/**
 * The "Confirm" step of editing an order: shows the updated cart exactly
 * like the checkout review does, and — unlike checkout — saves back onto
 * the SAME order document (no new order id, no new Firestore doc) via
 * updateOrderItems. Opened from EditOrderBar's "Review & Update" button.
 */
export default function EditOrderReviewModal({ open, orderId, pricing, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const isEmpty = pricing.items.length === 0;

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleConfirm = async () => {
    if (isEmpty) {
      toast.error('Add at least one product before updating.');
      return;
    }
    setSaving(true);
    try {
      await updateOrderItems(db, orderId, pricing.items);
      toast.success('Order updated');
      onSaved?.();
    } catch (err) {
      console.error('Failed to update order', err);
      toast.error("Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-[2px] sm:items-center sm:px-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-[#150007] sm:rounded-2xl"
            style={{ maxHeight: '88vh' }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-[15px] font-extrabold text-gradient-gold">Review Updated Order</h2>
                <p className="text-[10.5px] text-muted">{orderId}</p>
              </div>
              <button
                onClick={handleClose}
                disabled={saving}
                aria-label="Close"
                className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted disabled:opacity-60"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {isEmpty ? (
                <div className="rounded-xl bg-black/20 px-3.5 py-6 text-center text-[11.5px] text-muted">
                  Your cart is empty — add at least one product to update this order.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <OrderReview items={pricing.items} />
                  <OrderSummary pricing={pricing} />
                </div>
              )}
            </div>

            <div className="flex gap-2.5 border-t border-white/10 px-4 py-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="btn-3d-outline flex-1 rounded-xl py-2.5 text-[12.5px] font-bold text-[#f2ece2] disabled:opacity-60"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving || isEmpty}
                className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12.5px] font-bold text-white disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {saving ? 'Updating…' : 'Confirm Order'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
