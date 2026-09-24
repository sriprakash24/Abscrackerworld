import { useMemo, useState, useRef, useEffect, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import {
  Layers,
  Undo2,
  Loader2,
  CircleDollarSign,
  PlusCircle,
  ChevronDown,
  MoreVertical,
  Eye,
  Download,
  MessageCircleMore,
  PackageCheck,
  Truck,
  CheckCheck,
  Ban,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "../../firebase/config";
import { useAdminData } from "../../contexts/AdminDataContext";
import { useProducts } from "../../contexts/ProductsContext";
import { updateOrderStatus } from "../../services/ordersFirestore";
import { addOrdersToInvoice, getInvoice } from "../../services/invoicesFirestore";
import { getEffectivePricedOrder } from "../../utils/orderPricing";
import { formatConfirmedDate, toDateInputValue } from "../../utils/orderDates";
import { mergeCartItems } from "../../utils/mergeCartItems";
import { generateInvoicePdf } from "../../utils/generateInvoicePdf";
import { sendInvoiceFile } from "../../utils/shareInvoiceWhatsapp";
import {
  getOrderStatusMeta,
  normalizeOrderStage,
  isOrderStageComplete,
} from "../../constants/orderStatusMeta";
import {
  NEXT_ACTION_BY_STATUS,
  PREVIOUS_ACTION_BY_STATUS,
  canAdvance,
  canCancel,
} from "../../constants/orderActions";
import OrderStatusStepper from "../checkout/OrderStatusStepper";
import AdminOrderCard from "./AdminOrderCard";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import MergeSelectionBanner from "./MergeSelectionBanner";
import PaymentDateCalendar from "./PaymentDateCalendar";
import InvoicePreviewModal from "./InvoicePreviewModal";

const ACTION_ICONS = { PackageCheck, Truck, CheckCheck, CircleDollarSign };

/**
 * Counterpart to MergedEstimateCard for every merged-invoice group past
 * payment — used both on the Payment Confirmation page's "Confirmed" tab
 * and on the Order Management page (AdminDashboard), where a group can
 * already be PACKED / OUT_FOR_DELIVERY / DELIVERED, not just freshly
 * CONFIRMED. It mirrors AdminOrderCard's feature set (status stepper,
 * advance action, overflow menu, invoice actions, per-item breakdown) but
 * applies each action to every order in the group at once, since they all
 * share one invoice (see createInvoiceForMergedOrders /
 * addOrdersToInvoice). "Revoke" reverts every order in the group one step
 * back at once — reverting just one would leave the shared invoice
 * pointing at a mix of stages, which doesn't make sense.
 *
 * "Add Order" handles the opposite lifecycle gap: a customer who places
 * ANOTHER order after this group was already paid and invoiced. Rather than
 * that new order sitting as its own separate invoice, this folds it into
 * the existing one (see addOrdersToInvoice) — same customer, same invoice,
 * items simply appended.
 *
 * "Manage N child orders" opens each underlying order in a full
 * AdminOrderCard (same one the single-order list uses) so admin can still
 * drill into one order's own details, WhatsApp/bill history, edit history,
 * etc. — its own advance/revoke buttons are disabled there in favor of the
 * group actions here, so the group can't silently drift out of sync.
 */
function MergedConfirmedCard({ orders, delay = 0 }) {
  const [revoking, setRevoking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addingOrder, setAddingOrder] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addDate, setAddDate] = useState(() => toDateInputValue(new Date()));
  const [open, setOpen] = useState(false);
  const [showChildren, setShowChildren] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef(null);
  const [confirmingCancelAll, setConfirmingCancelAll] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [sendingInvoiceFile, setSendingInvoiceFile] = useState(false);

  const { orders: allOrders } = useAdminData();
  const { productsById } = useProducts();

  const first = orders[0];
  const grandTotal = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const items = useMemo(() => mergeCartItems(orders), [orders]);
  const itemCount = orders.reduce((sum, o) => sum + (o.cartItems || []).length, 0);
  const statusMeta = getOrderStatusMeta(first.status);
  const stage = normalizeOrderStage(first.orderStage, first.status);
  const isCancelled = first.status === "CANCELLED";
  const nextAction = NEXT_ACTION_BY_STATUS[first.status];
  const showAdvance = canAdvance(first.status);
  const showCancel = canCancel(first.status);
  const NextIcon = nextAction ? ACTION_ICONS[nextAction.icon] : null;
  const revokeAction = PREVIOUS_ACTION_BY_STATUS[first.status];
  const mobile = first.customer?.mobile;

  // Same customer's orders still waiting on payment — candidates to fold
  // into this already-confirmed invoice instead of becoming their own.
  const addableOrders = useMemo(
    () =>
      mobile
        ? allOrders.filter((o) => o.status === "AWAITING_ADMIN_CONFIRMATION" && o.customer?.mobile === mobile)
        : [],
    [allOrders, mobile],
  );

  useEffect(() => {
    if (!actionsOpen) return;
    const handleClick = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [actionsOpen]);

  const handleAdvanceAll = async () => {
    if (!nextAction || busy) return;
    setBusy(true);
    try {
      await Promise.all(orders.map((o) => updateOrderStatus(db, o.id, nextAction.patch)));
      toast.success(`All ${orders.length} orders moved to "${getOrderStatusMeta(nextAction.patch.status).label}"`);
    } catch (err) {
      console.error("Failed to advance merged orders", err);
      toast.error("Couldn't update those orders. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeAction) return;
    setBusy(true);
    try {
      await Promise.all(orders.map((o) => updateOrderStatus(db, o.id, revokeAction.patch)));
      toast.success(`Reverted all ${orders.length} orders to "${getOrderStatusMeta(revokeAction.patch.status).label}"`);
    } catch (err) {
      console.error("Failed to revoke merged orders", err);
      toast.error("Couldn't revert those orders. Please try again.");
    } finally {
      setBusy(false);
      setRevoking(false);
    }
  };

  const handleCancelAll = async () => {
    setCancelBusy(true);
    try {
      await Promise.all(orders.map((o) => updateOrderStatus(db, o.id, { status: "CANCELLED" })));
      toast.success(`Cancelled all ${orders.length} orders`);
    } catch (err) {
      console.error("Failed to cancel merged orders", err);
      toast.error("Couldn't cancel those orders. Please try again.");
    } finally {
      setCancelBusy(false);
      setConfirmingCancelAll(false);
    }
  };

  const handleAddOrders = async (orderIds) => {
    if (!first.invoiceId) return;
    setAddBusy(true);
    try {
      const [y, m, d] = addDate.split("-").map(Number);
      const selectedDate = y && m && d ? new Date(y, m - 1, d, 12, 0, 0) : new Date();

      const toAdd = addableOrders.filter((o) => orderIds.includes(o.id));
      const priced = toAdd.map((o) => getEffectivePricedOrder(o, productsById));
      const pricedOrders = toAdd.map((o, i) => ({ ...o, ...priced[i] }));

      await addOrdersToInvoice(db, first.invoiceId, pricedOrders, { confirmedDate: selectedDate });
      toast.success(
        toAdd.length > 1 ? `Added ${toAdd.length} orders to this invoice` : "Added the order to this invoice",
      );
      setAddingOrder(false);
    } catch (err) {
      console.error("Failed to add orders to invoice", err);
      toast.error("Couldn't add that order to the invoice. Please try again.");
    } finally {
      setAddBusy(false);
    }
  };

  const handleViewInvoice = async () => {
    if (!first.invoiceId || loadingPreview) return;
    setLoadingPreview(true);
    try {
      const invoice = await getInvoice(db, first.invoiceId);
      if (!invoice) {
        toast.error("Invoice not found");
        return;
      }
      setPreviewInvoice(invoice);
    } catch (err) {
      console.error("Failed to load invoice", err);
      toast.error("Couldn't load the invoice. Please try again.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!first.invoiceId || downloadingInvoice) return;
    setDownloadingInvoice(true);
    try {
      const invoice = await getInvoice(db, first.invoiceId);
      if (!invoice) {
        toast.error("Invoice not found");
        return;
      }
      generateInvoicePdf(invoice);
    } catch (err) {
      console.error("Failed to download invoice", err);
      toast.error("Couldn't download the invoice. Please try again.");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleSendInvoiceFile = async () => {
    if (!first.invoiceId || sendingInvoiceFile) return;
    setSendingInvoiceFile(true);
    try {
      const invoice = await getInvoice(db, first.invoiceId);
      if (!invoice) {
        toast.error("Invoice not found");
        return;
      }
      const { method } = await sendInvoiceFile(invoice);
      if (method === "fallback") {
        toast("Invoice downloaded — attach it in the WhatsApp chat that just opened.");
      }
    } catch (err) {
      console.error("Failed to send invoice", err);
      toast.error("Couldn't share the invoice. Please try again.");
    } finally {
      setSendingInvoiceFile(false);
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
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusMeta.className}`}
              >
                {statusMeta.emoji} {statusMeta.label}
              </span>
              {(showCancel || revokeAction) && (
                <div ref={actionsRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setActionsOpen((v) => !v)}
                    title="More actions"
                    className="orb-3d flex h-7 w-7 shrink-0 items-center justify-center !rounded-full text-muted hover:text-[#f2ece2]"
                  >
                    <MoreVertical size={14} />
                  </button>
                  <AnimatePresence>
                    {actionsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-[calc(100%+6px)] z-30 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#150007] py-1 shadow-xl"
                      >
                        {revokeAction && (
                          <button
                            onClick={() => {
                              setActionsOpen(false);
                              setRevoking(true);
                            }}
                            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[11.5px] font-bold text-gold hover:bg-white/5"
                          >
                            <Undo2 size={13} /> {revokeAction.label} (All)
                          </button>
                        )}
                        {showCancel && (
                          <button
                            onClick={() => {
                              setActionsOpen(false);
                              setConfirmingCancelAll(true);
                            }}
                            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[11.5px] font-bold text-[#ff8a63] hover:bg-white/5"
                          >
                            <Ban size={13} /> Cancel All Orders
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
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

          {/* Advance the whole group one stage at once — mirrors
              AdminOrderCard's single-order "next" button. */}
          {showAdvance && !isCancelled && (
            <button
              type="button"
              onClick={handleAdvanceAll}
              disabled={busy}
              className="btn-3d flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11.5px] font-extrabold text-black disabled:opacity-60"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : NextIcon && <NextIcon size={14} />}
              {nextAction.label} — All {orders.length} Orders
            </button>
          )}

          {/* Invoice actions */}
          {first.invoiceId && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleViewInvoice}
                disabled={loadingPreview}
                className="btn-3d-outline flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gold disabled:opacity-60"
              >
                {loadingPreview ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                View Invoice {first.invoiceNo ? `(${first.invoiceNo})` : ""}
              </button>
              <button
                onClick={handleDownloadInvoice}
                disabled={downloadingInvoice}
                className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-gold disabled:opacity-60"
              >
                {downloadingInvoice ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              </button>
              <button
                onClick={handleSendInvoiceFile}
                disabled={sendingInvoiceFile}
                title="Share invoice on WhatsApp"
                className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-[#25D366] disabled:opacity-60"
              >
                {sendingInvoiceFile ? <Loader2 size={13} className="animate-spin" /> : <MessageCircleMore size={13} />}
              </button>
            </div>
          )}

          {/* A new order from this same customer, placed after this group
              was already paid and invoiced — fold it into the existing
              invoice instead of it becoming its own (see addOrdersToInvoice
              in invoicesFirestore.js). Only shown when there's actually
              something eligible to add. */}
          {addableOrders.length > 0 && !addingOrder && (
            <button
              type="button"
              onClick={() => {
                setAddDate(toDateInputValue(new Date()));
                setAddingOrder(true);
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#5AC8FA]/40 bg-[#5AC8FA]/10 py-2 text-[10.5px] font-bold text-[#5AC8FA]"
            >
              <PlusCircle size={13} />
              {addableOrders.length > 1
                ? `Add ${addableOrders.length} new orders to this invoice`
                : "Add new order to this invoice"}
            </button>
          )}

          {addingOrder && (
            <div className="flex flex-col gap-2.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold text-muted">Payment / Invoice Date for the added order(s)</span>
                <PaymentDateCalendar value={addDate} onChange={setAddDate} disabled={addBusy} />
              </label>
              <MergeSelectionBanner
                mobile={mobile}
                orders={addableOrders}
                mode="add"
                minSelected={1}
                merging={addBusy}
                onMerge={handleAddOrders}
                onCancel={() => setAddingOrder(false)}
              />
            </div>
          )}

          {/* Expand: consolidated items, address, status stepper, and a way
              to drill into each underlying order individually. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 py-2 text-[10.5px] font-bold text-muted hover:text-[#f2ece2]"
          >
            <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            {open ? "Hide details" : `Show ${items.length} merged items`}
          </button>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex flex-col divide-y divide-white/[0.06] rounded-xl bg-black/20 px-3">
                    {items.map((item, i) => (
                      <div key={item.key || i} className="flex items-center gap-3 py-2 first:pt-2.5 last:pb-2.5">
                        <div className="orb-3d orb-cream flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden !rounded-lg">
                          {item.image ? (
                            <LazyLoadImage src={item.image} alt={item.name} effect="opacity" className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-sm">🎆</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-1 text-[11.5px] font-bold text-[#f2ece2]">{item.name}</div>
                          {item.nameTa && (
                            <div className="line-clamp-1 text-[10px] font-semibold text-gold">{item.nameTa}</div>
                          )}
                        </div>
                        <div className="shrink-0 text-[11px] font-bold text-muted">Qty {item.quantity}</div>
                      </div>
                    ))}
                  </div>

                  {first.address && (
                    <div className="flex items-start gap-2 rounded-xl bg-black/20 px-3 py-2.5 text-[10.5px] leading-relaxed text-[#cfc7bd]">
                      <MapPin size={13} className="mt-0.5 shrink-0 text-orange" />
                      <span>
                        {[first.address.houseNumber, first.address.street, first.address.area, first.address.city, first.address.district, first.address.state, first.address.pincode]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}

                  {!isCancelled && (
                    <div className="flex justify-center">
                      <OrderStatusStepper currentStageId={stage} completed={isOrderStageComplete(first.status)} delay={0.05} />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowChildren((v) => !v)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 py-2 text-[10.5px] font-bold text-muted hover:text-[#f2ece2]"
                  >
                    <ChevronDown size={13} className={`transition-transform ${showChildren ? "rotate-180" : ""}`} />
                    {showChildren ? "Hide child orders" : `Manage ${orders.length} child orders`}
                  </button>
                  <AnimatePresence initial={false}>
                    {showChildren && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-2.5 pt-1">
                          {orders.map((o, i) => (
                            <AdminOrderCard
                              key={o.id}
                              order={o}
                              index={i}
                              mergedGroupHint='This order is part of a merged invoice — use the actions on the merged card above so all linked orders move together.'
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <InvoicePreviewModal open={!!previewInvoice} invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />

      <ConfirmDeleteDialog
        open={revoking}
        title="Revoke this merged order group?"
        description={
          revokeAction
            ? `All ${orders.length} orders for ${first.customer?.name || "this customer"} go back to "${getOrderStatusMeta(revokeAction.patch.status).label}" together, since they share one invoice.`
            : ""
        }
        busy={busy}
        confirmLabel="Revoke All"
        tone="warning"
        onConfirm={handleRevoke}
        onCancel={() => setRevoking(false)}
      />

      <ConfirmDeleteDialog
        open={confirmingCancelAll}
        title="Cancel all merged orders?"
        description={`All ${orders.length} orders for ${first.customer?.name || "this customer"} will be marked as cancelled.`}
        busy={cancelBusy}
        confirmLabel="Cancel All"
        onConfirm={handleCancelAll}
        onCancel={() => setConfirmingCancelAll(false)}
      />
    </>
  );
}

export default memo(MergedConfirmedCard);
