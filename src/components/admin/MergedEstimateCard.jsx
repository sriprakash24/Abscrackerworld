import { useMemo, useState, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Layers,
  ChevronDown,
  Eye,
  Download,
  MessageCircleMore,
  Paperclip,
  Loader2,
  Ungroup,
  CircleDollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "../../firebase/config";
import { setOrderMergeToggle } from "../../services/orderMergeFirestore";
import { setPackingMergeToggle } from "../../services/packingFirestore";
import { updateOrderStatus } from "../../services/ordersFirestore";
import { createInvoiceForMergedOrders } from "../../services/invoicesFirestore";
import { generateInvoicePdf } from "../../utils/generateInvoicePdf";
import { useProducts } from "../../contexts/ProductsContext";
import { getEffectivePricedOrder } from "../../utils/orderPricing";
import { toDateInputValue } from "../../utils/orderDates";
import { generateBillPdf } from "../../utils/generateBillPdf";
import { sendBillMessage, sendBillFile } from "../../utils/shareBillWhatsapp";
import { openWhatsappChat } from "../../utils/whatsappChat";
import BillPreviewModal from "./BillPreviewModal";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import PaymentDateCalendar from "./PaymentDateCalendar";
import AdminOrderCard from "./AdminOrderCard";

/** Combines several same-customer orders into one synthetic order-shaped
 * object — the same shape generateBillPdf / BillPreviewModal / the
 * WhatsApp-share helpers already expect for a single order, so nothing
 * downstream needs to know it's actually several orders underneath. Each
 * child order's own price choice (today's price vs the original — see
 * AdminOrderCard's "Use old price" toggle) is respected line by line. */
function buildMergedEstimate(childOrders, productsById) {
  const priced = childOrders.map((o) => getEffectivePricedOrder(o, productsById));
  const cartItems = priced.flatMap((o) => o.cartItems || []);
  const sum = (key) => priced.reduce((total, o) => total + (o[key] || 0), 0);
  const first = childOrders[0];
  return {
    id: `merged-${first.customer?.mobile || first.id}`,
    orderId: childOrders.map((o) => o.orderId || o.id).join(" + "),
    createdAt: first.createdAt,
    customer: first.customer,
    address: first.address,
    cartItems,
    subtotal: sum("subtotal"),
    discount: sum("discount"),
    packingCharges: sum("packingCharges"),
    deliveryCharges: sum("deliveryCharges"),
    grandTotal: sum("grandTotal"),
    totalSavings: sum("totalSavings"),
  };
}

// See AdminOrderCard.jsx's memo() note — same reasoning applies here.
function MergedEstimateCard({ mobile, orders, delay = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const [unmerging, setUnmerging] = useState(false);
  const [previewBill, setPreviewBill] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingFile, setSendingFile] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmDate, setConfirmDate] = useState(() => toDateInputValue(new Date()));

  // Pre-built and shared by ProductsContext — see its comment for why this
  // used to be rebuilt locally here (and in AdminOrderCard) on every mount.
  const { productsById } = useProducts();

  const mergedOrder = useMemo(
    () => buildMergedEstimate(orders, productsById),
    [orders, productsById],
  );

  const first = orders[0];

  const handleUnmerge = async (e) => {
    e.stopPropagation();
    setUnmerging(true);
    try {
      await setOrderMergeToggle(db, mobile, false);
      toast.success("Unmerged — showing separate estimate bills again");
    } catch (err) {
      console.error("Failed to unmerge orders", err);
      toast.error("Couldn't unmerge. Please try again.");
    } finally {
      setUnmerging(false);
    }
  };

  // Single payment for the whole merged group: confirms every child order
  // at once (each locked in at its own effective price, same as a normal
  // single-order confirm) and generates ONE combined invoice for the
  // group — the same combined line-items the merged estimate bill already
  // shows — instead of one invoice per order.
  const handleConfirmAll = async () => {
    setConfirmBusy(true);
    try {
      const [y, m, d] = confirmDate.split("-").map(Number);
      const selectedDate = y && m && d ? new Date(y, m - 1, d, 12, 0, 0) : new Date();

      const pricedChildren = orders.map((o) => getEffectivePricedOrder(o, productsById));

      await Promise.all(
        pricedChildren.map((priced, i) =>
          updateOrderStatus(db, orders[i].id, {
            status: "CONFIRMED",
            paymentStatus: "RECEIVED",
            cartItems: priced.cartItems,
            subtotal: priced.subtotal,
            discount: priced.discount,
            packingCharges: priced.packingCharges,
            deliveryCharges: priced.deliveryCharges,
            grandTotal: priced.grandTotal,
            totalSavings: priced.totalSavings,
            paymentConfirmedAt: selectedDate,
          }),
        ),
      );

      const confirmedChildren = pricedChildren.map((priced, i) => ({
        ...orders[i],
        ...priced,
        status: "CONFIRMED",
        paymentStatus: "RECEIVED",
        paymentConfirmedAt: selectedDate,
      }));

      // Carry the merge decision straight into Packing so the admin never
      // has to re-merge the same customer's orders by hand there — this
      // group was already merged here in Order Management, so it should
      // land in Packing already merged too. Best-effort: a failure here
      // shouldn't undo or block the payment confirmation that already
      // succeeded above; Packing simply falls back to its own manual
      // toggle for this customer if this write doesn't go through.
      try {
        await setPackingMergeToggle(db, mobile, true);
      } catch (packingMergeErr) {
        console.error("Failed to carry merge into Packing", packingMergeErr);
      }

      try {
        const invoice = await createInvoiceForMergedOrders(db, confirmedChildren, {
          confirmedDate: selectedDate,
        });
        toast.success(`Payment confirmed for all ${orders.length} orders — one combined invoice generated`);

        let autoDownload = false;
        try {
          autoDownload = localStorage.getItem("ams_auto_download_invoice") === "1";
        } catch {
          // localStorage unavailable — just skip auto-download.
        }
        if (autoDownload && invoice) {
          try {
            generateInvoicePdf(invoice);
          } catch (downloadErr) {
            console.error("Auto-download of merged invoice failed", downloadErr);
            toast.error("Invoice generated, but auto-download failed.");
          }
          // Same customer for every order in the group — one WhatsApp chat
          // to open, no prefilled text, so admin can attach the invoice
          // that just downloaded.
          openWhatsappChat(first.customer?.mobile);
        }
      } catch (invoiceErr) {
        console.error("Payments confirmed but merged invoice generation failed", invoiceErr);
        toast.error(
          "Payments confirmed, but invoice generation failed — retry from the Orders page.",
        );
      }
    } catch (err) {
      console.error("Failed to confirm merged payment", err);
      toast.error("Couldn't confirm payment. Please try again.");
    } finally {
      setConfirmBusy(false);
      setConfirmingPayment(false);
    }
  };

  const handleView = (e) => {
    e.stopPropagation();
    setPreviewBill(mergedOrder);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      generateBillPdf(mergedOrder);
    } catch (err) {
      console.error("Failed to build merged bill PDF", err);
      toast.error("Couldn't generate the merged estimate bill.");
    } finally {
      setDownloading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.stopPropagation();
    setSendingMessage(true);
    try {
      sendBillMessage(mergedOrder);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendFile = async (e) => {
    e.stopPropagation();
    setSendingFile(true);
    try {
      await sendBillFile(mergedOrder);
    } catch (err) {
      console.error("Failed to share merged bill file", err);
      toast.error("Couldn't share the merged estimate bill.");
    } finally {
      setSendingFile(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease: "easeOut" }}
        className="surface-3d relative overflow-hidden rounded-2xl border border-orange/40"
      >
        <span
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[4px]"
          style={{ background: "rgba(227,82,38,0.65)" }}
        />
        <div className="relative z-[1] flex flex-col gap-3 p-4 pl-[18px]">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange">
                <Layers size={12} /> Merged · {orders.length} orders
              </div>
              <div className="truncate text-[12.5px] font-extrabold text-[#f2ece2]">
                {first.customer?.name || "Customer"}
              </div>
              <div className="text-[10px] text-muted">{first.customer?.mobile}</div>
            </div>
            <button
              type="button"
              onClick={handleUnmerge}
              disabled={unmerging}
              title="Split back into separate estimate bills"
              className="btn-3d-outline flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10.5px] font-bold text-gold disabled:opacity-50"
            >
              {unmerging ? <Loader2 size={12} className="animate-spin" /> : <Ungroup size={12} />}
              Unmerge
            </button>
          </div>

          {/* Parent order chips */}
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

          {/* Combined totals */}
          <div className="flex flex-col gap-1 rounded-xl bg-black/20 px-3 py-2.5 text-[10.5px] text-[#cfc7bd]">
            <div className="flex justify-between">
              <span>Subtotal (MRP)</span>
              <span>₹{(mergedOrder.subtotal ?? 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-₹{(mergedOrder.discount ?? 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span>Packing charges</span>
              <span>₹{(mergedOrder.packingCharges ?? 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-dashed border-white/10 pt-1.5 text-[11.5px] font-extrabold text-[#f2ece2]">
              <span>Merged Grand Total</span>
              <span>₹{(mergedOrder.grandTotal ?? 0).toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Single payment for the whole merged group */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDate(toDateInputValue(new Date()));
              setConfirmingPayment(true);
            }}
            disabled={confirmBusy}
            className="btn-3d flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11.5px] font-extrabold text-black disabled:opacity-60"
          >
            {confirmBusy ? <Loader2 size={14} className="animate-spin" /> : <CircleDollarSign size={14} />}
            Confirm Payment for All {orders.length} Orders
          </button>

          {/* Single estimate bill for the whole merged group */}
          <div className="flex flex-col gap-2 rounded-xl bg-black/20 px-3 py-2.5">
            <div className="text-[10px] font-bold text-muted">Merged Estimate Bill</div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleView}
                className="btn-3d-outline flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold text-gold"
              >
                <Eye size={12} /> View
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="btn-3d-outline flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold text-gold disabled:opacity-50"
              >
                {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                Download Estimate Bill
              </button>
              <button
                onClick={handleSendMessage}
                disabled={sendingMessage}
                className="btn-3d-outline flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold text-[#25D366] disabled:opacity-50"
              >
                {sendingMessage ? <Loader2 size={12} className="animate-spin" /> : <MessageCircleMore size={12} />}
                Message
              </button>
              <button
                onClick={handleSendFile}
                disabled={sendingFile}
                className="btn-3d-outline flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold text-[#25D366] disabled:opacity-50"
              >
                {sendingFile ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
                Send File
              </button>
            </div>
          </div>

          {/* Expand to manage each underlying order individually (confirm
              payment, cancel, edit items, per-order price choice...) —
              merging only combines the estimate bill, not the order
              lifecycle itself. */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 py-2 text-[10.5px] font-bold text-muted hover:text-[#f2ece2]"
          >
            <ChevronDown size={13} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
            {expanded ? "Hide child orders" : `Manage ${orders.length} child orders`}
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-2.5 pt-1">
                  {orders.map((o, i) => (
                    <AdminOrderCard key={o.id} order={o} index={i} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <BillPreviewModal open={!!previewBill} order={previewBill} onClose={() => setPreviewBill(null)} />

      <ConfirmDeleteDialog
        open={confirmingPayment}
        title="Confirm payment for all merged orders?"
        description={`Mark all ${orders.length} orders for ${first.customer?.name || "this customer"} as paid and move them to Confirmed. One combined invoice will be generated for the merged total, dated as below.`}
        busy={confirmBusy}
        confirmLabel="Yes, Confirm Payment"
        tone="success"
        onConfirm={handleConfirmAll}
        onCancel={() => setConfirmingPayment(false)}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-bold text-muted">Payment / Invoice Date</span>
          <PaymentDateCalendar value={confirmDate} onChange={setConfirmDate} disabled={confirmBusy} />
        </label>
      </ConfirmDeleteDialog>
    </>
  );
}

export default memo(MergedEstimateCard);
