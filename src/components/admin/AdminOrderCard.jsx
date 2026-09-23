import { useState, useMemo, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import {
  ChevronDown,
  Copy,
  MapPin,
  Phone,
  MessageCircleMore,
  CircleDollarSign,
  PackageCheck,
  Truck,
  CheckCheck,
  Ban,
  Loader2,
  StickyNote,
  Download,
  Eye,
  Receipt,
  FileText,
  Trash2,
  Paperclip,
  Check,
  MoreVertical,
  Undo2,
  RotateCcw,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { getOrderStatusMeta } from "../../constants/orderStatusMeta";
import {
  NEXT_ACTION_BY_STATUS,
  PREVIOUS_ACTION_BY_STATUS,
  canAdvance,
  canCancel,
} from "../../constants/orderActions";
import { db } from "../../firebase/config";
import {
  updateOrderStatus,
  deleteOrderDoc,
  markBillWhatsappSent,
} from "../../services/ordersFirestore";
import { repriceFromCatalog } from "../../utils/orderPricing";
import { getWhatsappSendStatus } from "../../utils/whatsappSendStatus";
import { getOrderSlot } from "../../utils/packingAccent";
import { formatStreetLine } from "../../utils/formatAddress";
import {
  createInvoiceForOrder,
  getInvoice,
} from "../../services/invoicesFirestore";
import { generateInvoicePdf } from "../../utils/generateInvoicePdf";
import { generateBillPdf } from "../../utils/generateBillPdf";
import { sendBillMessage, sendBillFile } from "../../utils/shareBillWhatsapp";
import { sendInvoiceFile } from "../../utils/shareInvoiceWhatsapp";
import InvoicePreviewModal from "./InvoicePreviewModal";
import BillPreviewModal from "./BillPreviewModal";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import { useProducts } from "../../contexts/ProductsContext";

const ACTION_ICONS = {
  CircleDollarSign,
  PackageCheck,
  Truck,
  CheckCheck,
};

// Compact icon-only WhatsApp action used on the card FRONT (before
// expanding) — "Send Message" / "Share Bill" now live here per admin
// request, instead of only inside the expanded Estimate Bill section. A
// small green dot badges the icon once that tick is on, so the sent state
// is visible without opening the card.
function QuickWhatsappButton({ onClick, busy, icon: Icon, title, sent }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={title}
      className="orb-3d relative flex h-8 w-8 shrink-0 items-center justify-center !rounded-full text-[#25D366] disabled:opacity-60"
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
      {sent && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full border border-black/40 bg-[#25D366] text-black">
          <Check size={8} strokeWidth={4} />
        </span>
      )}
    </button>
  );
}

// Small manual-toggle checkbox used to track "did I actually send this on
// WhatsApp" next to the Message / Bill buttons — separate tap target from
// the button itself, so ticking/unticking never re-triggers a send.
function SentCheckbox({ checked, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={checked}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
        checked
          ? "border-[#25D366] bg-[#25D366] text-black"
          : "border-white/20 bg-black/20 text-transparent hover:border-white/40"
      }`}
    >
      <Check size={12} strokeWidth={3} />
    </button>
  );
}

function formatOrderDate(createdAt) {
  const date = createdAt?.toDate
    ? createdAt.toDate()
    : createdAt
      ? new Date(createdAt)
      : null;
  if (!date || Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const PAYMENT_META = {
  PENDING: {
    label: "Payment Pending",
    className: "border-gold/35 bg-gold/10 text-gold",
  },
  RECEIVED: {
    label: "Payment Received",
    className: "border-[#8fe3a0]/35 bg-[#8fe3a0]/10 text-[#8fe3a0]",
  },
};

export default function AdminOrderCard({ order, delay = 0, index = 0 }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewBill, setPreviewBill] = useState(null);
  const [downloadingBill, setDownloadingBill] = useState(false);
  const [sendingBillMessage, setSendingBillMessage] = useState(false);
  const [sendingBillFile, setSendingBillFile] = useState(false);
  const [sendingInvoiceFile, setSendingInvoiceFile] = useState(false);
  const [priceChoiceBusy, setPriceChoiceBusy] = useState(false);

  const { products } = useProducts();
  // Same fallback as the customer-facing OrderCard — older orders don't
  // have item.nameTa snapshotted yet, so match against the live catalog.
  const nameTaById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p.nameTa])),
    [products],
  );
  const productsById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products],
  );

  // Orders sitting in AWAITING_ADMIN_CONFIRMATION haven't been paid for yet,
  // so if a product's price changes after the order was placed (e.g. a
  // restock-driven price update), the estimate should reflect today's
  // price — not what it was at checkout. This never touches Firestore by
  // itself; it just repriced what's shown/sent (card total, price
  // breakdown, Estimate Bill PDF/WhatsApp) using the live product catalog.
  // The moment payment is confirmed, handleAdvance below locks these
  // repriced numbers onto the order doc itself, and from then on this
  // logic no longer applies — CONFIRMED (and later) orders always render
  // straight from `order`, untouched.
  const isAwaitingPayment = order.status === "AWAITING_ADMIN_CONFIRMATION";
  // Admin's explicit choice for this order: keep the price the customer was
  // originally quoted at checkout, instead of today's live catalog price.
  // Never defaulted on — see the "Use old price" / "Revoke" buttons below.
  const useOriginalPrice = order.priceOverride === "original";
  // Always compute what today's price would be, regardless of which one is
  // currently in effect — needed both to detect that a price actually
  // changed and to offer the old-vs-new toggle.
  const liveRepricedOrder = useMemo(() => {
    if (!isAwaitingPayment) return order;
    return repriceFromCatalog(order, productsById);
  }, [order, isAwaitingPayment, productsById]);
  const pricedOrder = useOriginalPrice ? order : liveRepricedOrder;
  const hasPriceChange = isAwaitingPayment && liveRepricedOrder.grandTotal !== order.grandTotal;
  const items = pricedOrder.cartItems || [];
  const statusMeta = getOrderStatusMeta(order.status);
  const paymentMeta = PAYMENT_META[order.paymentStatus] || PAYMENT_META.PENDING;
  const nextAction = NEXT_ACTION_BY_STATUS[order.status];
  const showAdvance = canAdvance(order.status);
  const showCancel = canCancel(order.status);
  const NextIcon = nextAction ? ACTION_ICONS[nextAction.icon] : null;
  // Payment was confirmed (at some point) but no invoice ever landed — e.g.
  // the auto-generate step failed silently, or this order was confirmed
  // before that logic existed. Surface a manual retry instead of leaving it
  // stuck with no way to produce an invoice.
  const missingInvoice = order.paymentStatus === "RECEIVED" && !order.invoiceId;
  // Drives the card's outer highlight + header badge so a fully-sent vs.
  // still-pending WhatsApp bill is obvious without opening the card.
  const whatsappStatus = getWhatsappSendStatus(order);
  const revokeAction = PREVIOUS_ACTION_BY_STATUS[order.status];

  // Card background/left-edge accent. Priority: a still-pending WhatsApp
  // bill (needs attention) beats a confirmed order (good news, green) beats
  // the plain index-cycled tint that just keeps consecutive cards visually
  // distinct while scrolling a long list.
  const orderSlot = getOrderSlot(index);
  const accent =
    whatsappStatus === "PENDING"
      ? {
          tint: "rgba(230, 178, 60, 0.08)",
          edge: "rgba(230, 178, 60, 0.55)",
          badgeClass: "text-gold border-gold/40 bg-gold/10",
        }
      : order.status === "CONFIRMED"
        ? {
            tint: "rgba(102, 187, 106, 0.08)",
            edge: "rgba(102, 187, 106, 0.5)",
            badgeClass: "text-[#8fe3a0] border-[#8fe3a0]/40 bg-[#8fe3a0]/10",
          }
        : { tint: orderSlot.tint, edge: orderSlot.edge, badgeClass: orderSlot.badge };

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

  const runUpdate = async (patch, successMessage) => {
    setBusy(true);
    try {
      await updateOrderStatus(db, order.id, patch);
      toast.success(successMessage);
    } catch (err) {
      console.error("Failed to update order", err);
      toast.error("Couldn't update the order. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // "Use old price" — pins this order's estimate to the price the customer
  // was originally quoted, overriding the automatic reprice-to-today's-
  // price behaviour above. "Revoke" flips it back to today's price. Either
  // way this only ever affects an order still AWAITING_ADMIN_CONFIRMATION —
  // once payment is confirmed, whichever total was showing gets locked in
  // for good and this toggle no longer applies.
  const useOldPrice = async () => {
    setPriceChoiceBusy(true);
    try {
      await updateOrderStatus(db, order.id, { priceOverride: "original" });
      toast.success("Estimate will use the original price");
    } catch (err) {
      console.error("Failed to switch to the old price", err);
      toast.error("Couldn't switch to the old price. Please try again.");
    } finally {
      setPriceChoiceBusy(false);
    }
  };

  const revokeToNewPrice = async () => {
    setPriceChoiceBusy(true);
    try {
      await updateOrderStatus(db, order.id, { priceOverride: "live" });
      toast.success("Estimate will use today's price");
    } catch (err) {
      console.error("Failed to revoke to today's price", err);
      toast.error("Couldn't switch to today's price. Please try again.");
    } finally {
      setPriceChoiceBusy(false);
    }
  };

  const handleAdvance = async () => {
    if (!nextAction || busy) return;
    // Confirming payment also auto-generates the invoice (idempotent — safe
    // even if this order somehow already has one).
    if (nextAction.patch.status === "CONFIRMED") {
      setBusy(true);
      try {
        // Lock in today's pricing as the permanent record. For an order
        // that was AWAITING_ADMIN_CONFIRMATION, pricedOrder already carries
        // any restock/price-update repricing — write it now so the order
        // (and the invoice generated from it) reflect what's actually being
        // paid today, not the price at checkout.
        const confirmPatch = isAwaitingPayment
          ? {
              ...nextAction.patch,
              cartItems: pricedOrder.cartItems,
              subtotal: pricedOrder.subtotal,
              discount: pricedOrder.discount,
              packingCharges: pricedOrder.packingCharges,
              deliveryCharges: pricedOrder.deliveryCharges,
              grandTotal: pricedOrder.grandTotal,
              totalSavings: pricedOrder.totalSavings,
            }
          : nextAction.patch;
        await updateOrderStatus(db, order.id, confirmPatch);
        try {
          await createInvoiceForOrder(db, { ...order, ...confirmPatch });
          toast.success("Payment confirmed — invoice generated");
        } catch (invoiceErr) {
          // Status update already succeeded — don't tell the admin payment
          // confirmation failed. Let them retry invoice generation from the
          // "Generate Invoice" fallback button instead.
          console.error(
            "Payment confirmed but invoice generation failed",
            invoiceErr,
          );
          toast.error(
            'Payment confirmed, but invoice generation failed — tap "Generate Invoice" to retry.',
          );
        }
      } catch (err) {
        console.error("Failed to confirm payment", err);
        toast.error("Couldn't confirm payment. Please try again.");
      } finally {
        setBusy(false);
      }
      return;
    }
    runUpdate(
      nextAction.patch,
      `Order moved to "${getOrderStatusMeta(nextAction.patch.status).label}"`,
    );
  };

  const handleConfirmPayment = async () => {
    await handleAdvance();
    setConfirmingPayment(false);
  };

  const handleGenerateInvoice = async () => {
    if (generatingInvoice) return;
    setGeneratingInvoice(true);
    try {
      await createInvoiceForOrder(db, order);
      toast.success("Invoice generated");
    } catch (err) {
      console.error("Failed to generate invoice", err);
      toast.error("Couldn't generate the invoice. Please try again.");
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleViewInvoice = async () => {
    if (!order.invoiceId || loadingPreview) return;
    setLoadingPreview(true);
    try {
      const invoice = await getInvoice(db, order.invoiceId);
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
    if (!order.invoiceId || downloadingInvoice) return;
    setDownloadingInvoice(true);
    try {
      const invoice = await getInvoice(db, order.invoiceId);
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

  // Shares the invoice PDF straight to the customer's WhatsApp — same native
  // share-sheet-first, download-fallback approach as handleSendBillFile
  // above, just pulling the invoice doc (fresh, in case it was edited)
  // instead of building a PDF from the order.
  const handleSendInvoiceFile = async () => {
    if (!order.invoiceId || sendingInvoiceFile) return;
    setSendingInvoiceFile(true);
    try {
      const invoice = await getInvoice(db, order.invoiceId);
      if (!invoice) {
        toast.error("Invoice not found");
        return;
      }
      const { method } = await sendInvoiceFile(invoice);
      if (method === "fallback") {
        toast(
          "Invoice downloaded — attach it in the WhatsApp chat that just opened.",
        );
      }
    } catch (err) {
      console.error("Failed to send invoice", err);
      toast.error("Couldn't share the invoice. Please try again.");
    } finally {
      setSendingInvoiceFile(false);
    }
  };

  const handleViewBill = () => {
    setPreviewBill(pricedOrder);
  };

  const handleDownloadBill = async () => {
    if (downloadingBill) return;
    setDownloadingBill(true);
    try {
      generateBillPdf(pricedOrder);
    } catch (err) {
      console.error("Failed to download bill", err);
      toast.error("Couldn't download the bill. Please try again.");
    } finally {
      setDownloadingBill(false);
    }
  };

  const handleSendBillMessage = () => {
    if (sendingBillMessage) return;
    setSendingBillMessage(true);
    try {
      sendBillMessage(pricedOrder);
      markBillWhatsappSent(db, order.id, { messageSent: true }).catch((err) =>
        console.error("Failed to mark message as sent", err),
      );
    } catch (err) {
      console.error("Failed to open WhatsApp chat", err);
      toast.error("Couldn't open WhatsApp. Please try again.");
    } finally {
      setSendingBillMessage(false);
    }
  };

  const handleSendBillFile = async () => {
    if (sendingBillFile) return;
    setSendingBillFile(true);
    try {
      const { method } = await sendBillFile(pricedOrder);
      if (method === "fallback") {
        toast(
          "Bill downloaded — attach it in the WhatsApp chat that just opened.",
        );
      }
      if (method !== "cancelled") {
        markBillWhatsappSent(db, order.id, { fileSent: true }).catch((err) =>
          console.error("Failed to mark bill as sent", err),
        );
      }
    } catch (err) {
      console.error("Failed to send bill file", err);
      toast.error("Couldn't send the bill. Please try again.");
    } finally {
      setSendingBillFile(false);
    }
  };

  // Manual override for the tracking checkboxes — lets the admin tick/untick
  // independently of actually triggering a send (e.g. it was sent from
  // another device, or ticked by mistake).
  const toggleBillMessageSent = (e) => {
    e.stopPropagation();
    markBillWhatsappSent(db, order.id, {
      messageSent: !order.billMessageSentAt,
    }).catch((err) => {
      console.error("Failed to update message tracking", err);
      toast.error("Couldn't update. Please try again.");
    });
  };

  const toggleBillFileSent = (e) => {
    e.stopPropagation();
    markBillWhatsappSent(db, order.id, {
      fileSent: !order.billFileSentAt,
    }).catch((err) => {
      console.error("Failed to update bill tracking", err);
      toast.error("Couldn't update. Please try again.");
    });
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await updateOrderStatus(db, order.id, { status: "CANCELLED" });
      toast.success("Order cancelled");
    } catch (err) {
      console.error("Failed to cancel order", err);
      toast.error("Couldn't cancel the order. Please try again.");
    } finally {
      setBusy(false);
      setConfirmingCancel(false);
    }
  };

  // Undoes an advance the admin didn't mean to make (most commonly an
  // accidental "Confirm Payment" tap) by moving the order back one step in
  // ORDER_FLOW — see PREVIOUS_ACTION_BY_STATUS for exactly what each step
  // reverts.
  const handleRevoke = async () => {
    if (!revokeAction) return;
    setRevoking(true);
    try {
      await updateOrderStatus(db, order.id, revokeAction.patch);
      toast.success("Order reverted to the previous stage");
    } catch (err) {
      console.error("Failed to revoke order status", err);
      toast.error("Couldn't revert the order. Please try again.");
    } finally {
      setRevoking(false);
      setConfirmingRevoke(false);
    }
  };

  const handleDeleteOrder = async () => {
    setDeleting(true);
    try {
      await deleteOrderDoc(db, order.id);
      toast.success("Order deleted");
      // No need to close the dialog or reset `deleting` — the order list is
      // driven by a live Firestore subscription, so this card unmounts as
      // soon as the delete lands.
    } catch (err) {
      console.error("Failed to delete order", err);
      toast.error("Couldn't delete the order. Please try again.");
      setDeleting(false);
    }
  };

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(order.orderId || order.id);
      toast("Order ID copied");
    } catch {
      toast("Could not copy — long press to select");
    }
  };

  const copyMobile = async () => {
    try {
      await navigator.clipboard.writeText(order.customer?.mobile || "");
      toast("Mobile number copied");
    } catch {
      toast("Could not copy — long press to select");
    }
  };

  const whatsappCustomer = () => {
    const mobile = (order.customer?.mobile || "").replace(/\D/g, "");
    const text = encodeURIComponent(
      `Hi ${order.customer?.name || ""}, this is ABS Crackers World regarding your order ${order.orderId || order.id}.`,
    );
    window.open(
      `https://wa.me/91${mobile.slice(-10)}?text=${text}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease: "easeOut" }}
        className="surface-3d relative overflow-hidden rounded-2xl transition-shadow"
        style={{ borderColor: accent.edge }}
      >
        {/* Accent wash — index-cycled by default so consecutive cards read
            as distinct blocks while scrolling; overridden to amber when a
            WhatsApp bill tick is still missing, or green once CONFIRMED. */}
        <span
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[4px]"
          style={{ background: accent.edge }}
        />
        <span
          className="pointer-events-none absolute inset-0 z-0"
          style={{ background: `radial-gradient(ellipse at top left, ${accent.tint}, transparent 60%)` }}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((v) => !v);
            }
          }}
          className="relative z-[1] flex w-full cursor-pointer flex-col gap-2.5 p-4 pl-[18px] text-left"
        >
          {/* Row 1 — order id/date, status badges, overflow actions menu */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-extrabold text-[#f2ece2]">
                {order.orderId || order.id}
              </div>
              <div className="text-[10px] text-muted">
                {formatOrderDate(order.createdAt)}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${paymentMeta.className}`}
              >
                {paymentMeta.label}
              </span>
              <span
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusMeta.className}`}
              >
                {statusMeta.emoji} {statusMeta.label}
              </span>
              {whatsappStatus !== "NA" && (
                <span
                  title={
                    whatsappStatus === "SENT"
                      ? "Bill message and file both marked as sent"
                      : "Bill message or file still not ticked as sent"
                  }
                  className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                    whatsappStatus === "SENT"
                      ? "border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366]"
                      : "border-gold/40 bg-gold/10 text-gold"
                  }`}
                >
                  {whatsappStatus === "SENT" ? (
                    <>
                      <Check size={10} strokeWidth={3} /> Sent
                    </>
                  ) : (
                    "WA Pending"
                  )}
                </span>
              )}

              {/* Overflow menu — Cancel / Delete / Revoke live here so the
                  card front stays uncluttered and the one action that
                  matters (Confirm Payment / next stage) stands out below. */}
              {(showCancel || revokeAction) && (
                <div ref={actionsRef} className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionsOpen((v) => !v);
                    }}
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
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-[calc(100%+6px)] z-30 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#150007] py-1 shadow-xl"
                      >
                        {revokeAction && (
                          <button
                            onClick={() => {
                              setActionsOpen(false);
                              setConfirmingRevoke(true);
                            }}
                            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[11.5px] font-bold text-gold hover:bg-white/5"
                          >
                            <Undo2 size={13} /> {revokeAction.label}
                          </button>
                        )}
                        {showCancel && (
                          <button
                            onClick={() => {
                              setActionsOpen(false);
                              setConfirmingCancel(true);
                            }}
                            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[11.5px] font-bold text-[#ff8a63] hover:bg-white/5"
                          >
                            <Ban size={13} /> Cancel Order
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setActionsOpen(false);
                            setConfirmingDelete(true);
                          }}
                          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[11.5px] font-bold text-[#e35226] hover:bg-white/5"
                        >
                          <Trash2 size={13} /> Delete Order
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {!showCancel && !revokeAction && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmingDelete(true);
                  }}
                  title="Delete order"
                  className="orb-3d flex h-7 w-7 shrink-0 items-center justify-center !rounded-full text-muted hover:text-[#e35226]"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Row 2 — compact action row. The advance/"Confirm Payment" button
              no longer stretches full-width (it used to eat the whole card);
              it now sizes to its label and shares the row with the WhatsApp
              quick actions, pinned to the top so Send Message / Share Bill
              (or Share Invoice, once one exists) are reachable without
              expanding the card. */}
          <div className="flex items-center gap-1.5">
            {showAdvance && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (nextAction.patch.status === "CONFIRMED") {
                    setConfirmingPayment(true);
                  } else {
                    handleAdvance();
                  }
                }}
                disabled={busy}
                className={`flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-extrabold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                  nextAction.patch.status === "CONFIRMED"
                    ? "bg-gradient-to-b from-[#8fe3a0] to-[#3fae5c] text-black shadow-[0_6px_14px_-8px_rgba(63,174,92,0.6)]"
                    : "btn-3d text-black"
                }`}
              >
                {busy ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  NextIcon && <NextIcon size={13} />
                )}
                {nextAction.label}
              </button>
            )}

            {/* Quick download — visible on the card front without expanding.
                Label/target switches the moment an invoice exists: before
                payment this downloads the Estimate Bill, after payment
                (invoiceId set) it downloads the Invoice instead. */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (order.invoiceId) {
                  handleDownloadInvoice();
                } else {
                  handleDownloadBill();
                }
              }}
              disabled={order.invoiceId ? downloadingInvoice : downloadingBill}
              title={order.invoiceId ? "Download Invoice" : "Download Estimate Bill"}
              className="btn-3d-outline flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[10.5px] font-bold text-gold disabled:opacity-50"
            >
              {(order.invoiceId ? downloadingInvoice : downloadingBill) ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Download size={12} />
              )}
              {order.invoiceId ? "Invoice" : "Estimate Bill"}
            </button>

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {order.invoiceId ? (
                <QuickWhatsappButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSendInvoiceFile();
                  }}
                  busy={sendingInvoiceFile}
                  icon={MessageCircleMore}
                  title="Share invoice on WhatsApp"
                />
              ) : (
                <>
                  <QuickWhatsappButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendBillMessage();
                    }}
                    busy={sendingBillMessage}
                    icon={MessageCircleMore}
                    title="Send bill message on WhatsApp"
                    sent={!!order.billMessageSentAt}
                  />
                  <QuickWhatsappButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendBillFile();
                    }}
                    busy={sendingBillFile}
                    icon={Paperclip}
                    title="Share bill file on WhatsApp"
                    sent={!!order.billFileSentAt}
                  />
                </>
              )}
            </div>
          </div>

          {/* Row 3 — customer + total (no item photos — see Items list below when expanded) */}
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-bold text-[#f2ece2]">
                {order.customer?.name || "Unnamed customer"}
              </div>
              <div className="text-[10px] font-semibold text-muted">
                {order.customer?.mobile} · {items.length}{" "}
                {items.length === 1 ? "item" : "items"}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-[14px] font-extrabold text-gradient-gold">
                ₹{(pricedOrder.grandTotal ?? 0).toLocaleString("en-IN")}
              </div>
            </div>

            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.25 }}
              className="orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-full text-orange"
            >
              <ChevronDown size={15} />
            </motion.span>
          </div>

          {/* Row 4 — address, district/city highlighted like the Packing screen */}
          {order.address &&
            (order.address.city || order.address.district || formatStreetLine(order.address)) && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-dashed border-white/10 pt-2.5">
                <MapPin size={12} className="shrink-0 text-muted" />
                {formatStreetLine(order.address) && (
                  <span className="text-[10.5px] text-muted">
                    {formatStreetLine(order.address)}
                  </span>
                )}
                {order.address.city && (
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${accent.badgeClass}`}>
                    {order.address.city}
                  </span>
                )}
                {order.address.district && order.address.district !== order.address.city && (
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${accent.badgeClass}`}>
                    {order.address.district}
                  </span>
                )}
              </div>
            )}
        </div>


        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3 border-t border-dashed border-white/10 px-4 pb-4 pt-3.5">
                {/* Contact row */}
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`tel:${order.customer?.mobile}`}
                    className="btn-3d-outline flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10.5px] font-bold text-gold"
                  >
                    <Phone size={12} /> Call
                  </a>
                  <button
                    onClick={whatsappCustomer}
                    className="btn-3d-outline flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10.5px] font-bold text-gold"
                  >
                    <MessageCircleMore size={12} /> WhatsApp
                  </button>
                  <button
                    onClick={copyMobile}
                    className="btn-3d-outline flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10.5px] font-bold text-gold"
                  >
                    <Copy size={12} /> Copy Mobile
                  </button>
                  <button
                    onClick={copyOrderId}
                    className="btn-3d-outline flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10.5px] font-bold text-gold"
                  >
                    <Copy size={12} /> Copy Order ID
                  </button>
                </div>

                {/* Items */}
                <div className="flex flex-col divide-y divide-white/[0.06]">
                  {items.map((item, i) => (
                    <div
                      key={item.productId || i}
                      className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                    >
                      <div className="orb-3d flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden !rounded-lg">
                        {item.image ? (
                          <LazyLoadImage
                            src={item.image}
                            alt={item.name}
                            effect="opacity"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-sm">🎆</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-[11.5px] font-bold text-[#f2ece2]">
                          {item.name}
                        </div>
                        {(item.nameTa || nameTaById[item.productId]) && (
                          <div className="line-clamp-1 text-[10px] font-semibold text-gold">
                            {item.nameTa || nameTaById[item.productId]}
                          </div>
                        )}
                        <div className="mt-0.5 text-[10px] text-muted">
                          Qty {item.quantity} × ₹{item.unitPrice}
                        </div>
                      </div>
                      <div className="shrink-0 text-[12px] font-extrabold text-gold">
                        ₹{item.lineTotal}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price breakdown */}
                <div className="flex flex-col gap-1 rounded-xl bg-black/20 px-3 py-2.5 text-[10.5px] text-[#cfc7bd]">
                  <div className="flex justify-between">
                    <span>Subtotal (MRP)</span>
                    <span>
                      ₹{(pricedOrder.subtotal ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span>
                      -₹{(pricedOrder.discount ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Packing charges</span>
                    <span>
                      ₹{(pricedOrder.packingCharges ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery charges</span>
                    <span>
                      ₹{(pricedOrder.deliveryCharges ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between border-t border-dashed border-white/10 pt-1.5 text-[11.5px] font-extrabold text-[#f2ece2]">
                    <span>Grand Total</span>
                    <span>
                      ₹{(pricedOrder.grandTotal ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  {hasPriceChange && (
                    <div className="mt-1 flex flex-col gap-1.5 border-t border-dashed border-white/10 pt-1.5">
                      <div className="text-[9.5px] font-semibold text-gold">
                        {useOriginalPrice
                          ? `Using original price (today's price is ₹${(liveRepricedOrder.grandTotal ?? 0).toLocaleString("en-IN")})`
                          : `Updated to today's prices (was ₹${(order.grandTotal ?? 0).toLocaleString("en-IN")})`}
                      </div>
                      {useOriginalPrice ? (
                        <button
                          type="button"
                          onClick={revokeToNewPrice}
                          disabled={priceChoiceBusy}
                          className="btn-3d-outline flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-gold disabled:opacity-50"
                        >
                          {priceChoiceBusy ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <RotateCcw size={11} />
                          )}
                          Revoke — use today's price
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={useOldPrice}
                          disabled={priceChoiceBusy}
                          className="btn-3d-outline flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-gold disabled:opacity-50"
                        >
                          {priceChoiceBusy ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <History size={11} />
                          )}
                          Use old price
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Address */}
                {order.address && (
                  <div className="flex items-start gap-2 rounded-xl bg-black/20 px-3 py-2.5 text-[10.5px] leading-relaxed text-[#cfc7bd]">
                    <MapPin size={13} className="mt-0.5 shrink-0 text-orange" />
                    <span>
                      {[
                        order.address.houseNumber,
                        order.address.street,
                        order.address.area,
                        order.address.city,
                        order.address.district,
                        order.address.state,
                        order.address.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      {order.address.landmark
                        ? ` (near ${order.address.landmark})`
                        : ""}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {order.orderNotes && (
                  <div className="flex items-start gap-2 rounded-xl bg-black/20 px-3 py-2.5 text-[10.5px] leading-relaxed text-[#cfc7bd]">
                    <StickyNote
                      size={13}
                      className="mt-0.5 shrink-0 text-orange"
                    />
                    <span>{order.orderNotes}</span>
                  </div>
                )}

                {/* Estimate Bill — for sending before payment is confirmed / before
                  an invoice exists. Once an invoice exists, the bill has done
                  its job and the Invoice section below takes over. */}
                {!order.invoiceId && (
                  <div className="flex flex-col gap-2 rounded-xl bg-black/20 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted">
                      <FileText size={12} className="text-orange" />
                      Estimate Bill · Payment Pending
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleViewBill}
                        className="btn-3d-outline flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gold"
                      >
                        <Eye size={13} />
                        View Bill
                      </button>
                      <button
                        onClick={handleDownloadBill}
                        disabled={downloadingBill}
                        className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-gold disabled:opacity-60"
                      >
                        {downloadingBill ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Download size={13} />
                        )}
                      </button>
                      <button
                        onClick={handleSendBillMessage}
                        disabled={sendingBillMessage}
                        title="Send bill message on WhatsApp"
                        className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-[#25D366] disabled:opacity-60"
                      >
                        {sendingBillMessage ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <MessageCircleMore size={13} />
                        )}
                      </button>
                      <SentCheckbox
                        checked={!!order.billMessageSentAt}
                        onClick={toggleBillMessageSent}
                        title={
                          order.billMessageSentAt
                            ? "Message marked as sent — tap to un-tick"
                            : "Tick once the bill message has been sent"
                        }
                      />
                      <button
                        onClick={handleSendBillFile}
                        disabled={sendingBillFile}
                        title="Send bill file on WhatsApp"
                        className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-[#25D366] disabled:opacity-60"
                      >
                        {sendingBillFile ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Paperclip size={13} />
                        )}
                      </button>
                      <SentCheckbox
                        checked={!!order.billFileSentAt}
                        onClick={toggleBillFileSent}
                        title={
                          order.billFileSentAt
                            ? "Bill marked as sent — tap to un-tick"
                            : "Tick once the bill file has been sent"
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Invoice */}
                {order.invoiceId ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleViewInvoice}
                      disabled={loadingPreview}
                      className="btn-3d-outline flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gold disabled:opacity-60"
                    >
                      {loadingPreview ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Eye size={13} />
                      )}
                      View Invoice{" "}
                      {order.invoiceNo ? `(${order.invoiceNo})` : ""}
                    </button>
                    <button
                      onClick={handleDownloadInvoice}
                      disabled={downloadingInvoice}
                      className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-gold disabled:opacity-60"
                    >
                      {downloadingInvoice ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Download size={13} />
                      )}
                    </button>
                    <button
                      onClick={handleSendInvoiceFile}
                      disabled={sendingInvoiceFile}
                      title="Share invoice on WhatsApp"
                      className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-[#25D366] disabled:opacity-60"
                    >
                      {sendingInvoiceFile ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <MessageCircleMore size={13} />
                      )}
                    </button>
                  </div>
                ) : (
                  missingInvoice && (
                    <button
                      onClick={handleGenerateInvoice}
                      disabled={generatingInvoice}
                      className="btn-3d-outline flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gold disabled:opacity-60"
                    >
                      {generatingInvoice ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Receipt size={13} />
                      )}
                      Generate Invoice
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <InvoicePreviewModal
        open={!!previewInvoice}
        invoice={previewInvoice}
        onClose={() => setPreviewInvoice(null)}
      />
      <BillPreviewModal
        open={!!previewBill}
        order={previewBill}
        onClose={() => setPreviewBill(null)}
      />
      <ConfirmDeleteDialog
        open={confirmingDelete}
        title="Delete this order?"
        description={`Order ${order.orderId || order.id} will be permanently removed. This can't be undone.`}
        busy={deleting}
        onConfirm={handleDeleteOrder}
        onCancel={() => setConfirmingDelete(false)}
      />
      <ConfirmDeleteDialog
        open={confirmingPayment}
        title="Confirm payment received?"
        description={`Mark order ${order.orderId || order.id} as paid and move it to Confirmed. An invoice will be generated automatically.`}
        busy={busy}
        confirmLabel="Yes, Confirm Payment"
        tone="success"
        onConfirm={handleConfirmPayment}
        onCancel={() => setConfirmingPayment(false)}
      />
      <ConfirmDeleteDialog
        open={confirmingCancel}
        title="Cancel this order?"
        description={`Order ${order.orderId || order.id} will be marked as cancelled.`}
        busy={busy}
        confirmLabel="Cancel Order"
        onConfirm={handleCancel}
        onCancel={() => setConfirmingCancel(false)}
      />
      {revokeAction && (
        <ConfirmDeleteDialog
          open={confirmingRevoke}
          title="Revert this order?"
          description={`${revokeAction.label} for order ${order.orderId || order.id} — it goes back to "${getOrderStatusMeta(revokeAction.patch.status).label}". Use this if the last update was a mistake.`}
          busy={revoking}
          confirmLabel="Revoke"
          tone="warning"
          onConfirm={handleRevoke}
          onCancel={() => setConfirmingRevoke(false)}
        />
      )}
    </>
  );
}
