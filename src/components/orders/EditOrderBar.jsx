import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '../../store/useCartStore';
import { useCartPricing } from '../../hooks/useCartPricing';
import EditOrderReviewModal from './EditOrderReviewModal';

/**
 * Sits above BottomNav on every customer screen — Home, category pages,
 * Cart — for as long as `editingOrderId` is set, so a customer can browse
 * and add/remove products exactly like normal shopping while editing an
 * already-placed order. Tapping "Review & Update" opens the confirm popup;
 * tapping the X cancels the edit and restores whatever was in the cart
 * before editing started.
 */
export default function EditOrderBar() {
  const editingOrderId = useCartStore((s) => s.editingOrderId);
  const cancelEditOrder = useCartStore((s) => s.cancelEditOrder);
  const finishEditOrder = useCartStore((s) => s.finishEditOrder);
  const pricing = useCartPricing();
  const [reviewOpen, setReviewOpen] = useState(false);

  if (!editingOrderId) return null;

  const handleCancel = () => {
    cancelEditOrder();
    toast('Edit cancelled — order left unchanged');
  };

  const handleSaved = () => {
    setReviewOpen(false);
    finishEditOrder();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed inset-x-0 bottom-[84px] z-40 mx-auto w-full max-w-[430px] px-4"
      >
        <div
          className="panel-3d flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
          style={{ boxShadow: '0 12px 30px -10px rgba(0,0,0,.65), 0 0 20px rgba(255,122,0,.12)' }}
        >
          <button
            onClick={handleCancel}
            aria-label="Cancel edit"
            className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-muted"
          >
            <X size={15} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[9px] font-semibold uppercase tracking-wide text-muted">
              Editing Order · {editingOrderId}
            </div>
            <motion.div
              key={pricing.grandTotal}
              initial={{ scale: 1.1, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="text-embossed truncate text-[16px] font-extrabold text-gold"
            >
              ₹{pricing.grandTotal} <span className="text-[10px] font-semibold text-muted">· {pricing.itemCount} items</span>
            </motion.div>
          </div>

          <button
            onClick={() => setReviewOpen(true)}
            className="btn-3d flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[11.5px] font-extrabold text-black"
          >
            <ClipboardCheck size={13} />
            Review &amp; Update
          </button>
        </div>
      </motion.div>

      <EditOrderReviewModal
        open={reviewOpen}
        orderId={editingOrderId}
        pricing={pricing}
        onClose={() => setReviewOpen(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
