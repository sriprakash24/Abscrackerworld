import { useState } from "react";
import { motion } from "framer-motion";
import { Layers, Undo2, Loader2, CircleDollarSign } from "lucide-react";
import { toast } from "sonner";
import { db } from "../../firebase/config";
import { updateOrderStatus } from "../../services/ordersFirestore";
import { formatConfirmedDate } from "../../utils/orderDates";
import { PREVIOUS_ACTION_BY_STATUS } from "../../constants/orderActions";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";

/**
 * Read-only counterpart to MergedEstimateCard for the "Confirmed" tab of
 * Payment Confirmation: several orders that were paid for together (see
 * MergedEstimateCard's "Confirm Payment for All") and now share one
 * invoiceId (see createInvoiceForMergedOrders) stay grouped under one card
 * here too, instead of splitting back into separate rows the moment they
 * move to CONFIRMED. "Revoke" reverts every order in the group at once —
 * revoking just one would leave the shared invoice pointing at a mix of
 * confirmed and awaiting orders, which doesn't make sense.
 */
export default function MergedConfirmedCard({ orders, delay = 0 }) {
  const [revoking, setRevoking] = useState(false);
  const [busy, setBusy] = useState(false);

  const first = orders[0];
  const grandTotal = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const itemCount = orders.reduce((sum, o) => sum + (o.cartItems || []).length, 0);
  const revokeAction = PREVIOUS_ACTION_BY_STATUS.CONFIRMED;

  const handleRevoke = async () => {
    setBusy(true);
    try {
      await Promise.all(orders.map((o) => updateOrderStatus(db, o.id, revokeAction.patch)));
      toast.success(`Reverted all ${orders.length} orders to Awaiting Confirmation`);
    } catch (err) {
      console.error("Failed to revoke merged payment confirmation", err);
      toast.error("Couldn't revert those orders. Please try again.");
    } finally {
      setBusy(false);
      setRevoking(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease: "easeOut" }}
        className="surface-3d relative overflow-hidden rounded-2xl border border-[#8fe3a0]/35"
      >
        <span
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[4px]"
          style={{ background: "rgba(143,227,160,0.6)" }}
        />
        <div className="relative z-[1] flex flex-col gap-3 p-4 pl-[18px]">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#8fe3a0]">
                <Layers size={12} /> Merged · {orders.length} orders · one invoice
              </div>
              <div className="truncate text-[12.5px] font-extrabold text-[#f2ece2]">
                {first.customer?.name || "Customer"}
              </div>
              <div className="text-[10px] text-muted">{first.customer?.mobile}</div>
            </div>
            <button
              type="button"
              onClick={() => setRevoking(true)}
              disabled={busy}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-[10.5px] font-bold text-gold disabled:opacity-50"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
              Revoke All
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {orders.map((o) => (
              <span
                key={o.id}
                className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-bold text-[#cfc7bd]"
              >
                {o.orderId || o.id}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10.5px] font-semibold text-muted">
              {itemCount} items · Confirmed {formatConfirmedDate(first)}
            </span>
            <span className="flex items-center gap-1.5 text-[13.5px] font-extrabold text-gradient-gold">
              <CircleDollarSign size={13} />₹{grandTotal.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </motion.div>

      <ConfirmDeleteDialog
        open={revoking}
        title="Revoke this merged payment confirmation?"
        description={`All ${orders.length} orders for ${first.customer?.name || "this customer"} go back to "Awaiting Confirmation" together, since they share one invoice.`}
        busy={busy}
        confirmLabel="Revoke All"
        tone="warning"
        onConfirm={handleRevoke}
        onCancel={() => setRevoking(false)}
      />
    </>
  );
}
