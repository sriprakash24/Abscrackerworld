import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Download, Receipt, Link2, PenSquare, Eye, Trash2, MessageCircleMore, Loader2, PackageCheck, Truck, CheckCheck, X } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAdminData } from '../../contexts/AdminDataContext';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';
import InvoiceFormModal from '../../components/admin/InvoiceFormModal';
import InvoicePreviewModal from '../../components/admin/InvoicePreviewModal';
import ConfirmDeleteDialog from '../../components/admin/ConfirmDeleteDialog';
import OrderDateFilter from '../../components/admin/OrderDateFilter';
import { getOrderStatusMeta } from '../../constants/orderStatusMeta';
import { markOrdersPacked, markOrdersOutForDelivery, markOrdersDelivered } from '../../services/ordersFirestore';
import { toDateInputValue, getInvoiceNoDate } from '../../utils/orderDates';
import { db } from '../../firebase/config';
import { subscribeAllInvoices, deleteInvoiceDoc } from '../../services/invoicesFirestore';
import { generateInvoicePdf } from '../../utils/generateInvoicePdf';
import { sendInvoiceFile } from '../../utils/shareInvoiceWhatsapp';

const SOURCE_FILTERS = ['ALL', 'ORDER', 'MANUAL'];

// Same three fulfilment steps as the bulk update on Order Management. They
// write `status` on the order docs, which every admin page and the customer's
// Order History / Track Order screens already listen to live — so one click
// here updates everywhere. Payment confirmation is never done in bulk.
const BULK_TARGETS = [
  { status: 'PACKED', label: 'Mark Packed', icon: PackageCheck, run: markOrdersPacked },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck, run: markOrdersOutForDelivery },
  { status: 'DELIVERED', label: 'Mark Delivered', icon: CheckCheck, run: markOrdersDelivered },
];

// The date in the invoice number (ABSI + YYYYMMDD + seq) is the date the admin
// treats as the invoice's date, so the date filter / bulk update use it first.
// Invoices without a parsable number fall back to their stored date.
function getInvoiceDate(invoice) {
  const fromNumber = getInvoiceNoDate(invoice?.invoiceNo);
  if (fromNumber) return fromNumber;
  const raw = invoice?.date || invoice?.createdAt;
  if (raw?.toDate) return raw.toDate();
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/** Order docs behind an invoice (single, merged, or none for manual invoices). */
function getLinkedOrders(invoice, ordersById, ordersByInvoiceId) {
  const ids = invoice.orderDocIds?.length ? invoice.orderDocIds : invoice.orderDocId ? [invoice.orderDocId] : [];
  const fromIds = ids.map((id) => ordersById.get(id)).filter(Boolean);
  return fromIds.length ? fromIds : ordersByInvoiceId.get(invoice.id) || [];
}

// Only orders that are past payment and not cancelled can be advanced.
const isBulkEligible = (order) => order.status !== 'AWAITING_ADMIN_CONFIRMATION' && order.status !== 'CANCELLED';

export default function AdminInvoices() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [dateFilter, setDateFilter] = useState([]);
  const [confirmingTarget, setConfirmingTarget] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const { orders } = useAdminData();

  const ordersById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);
  const ordersByInvoiceId = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      if (!o.invoiceId) continue;
      if (!map.has(o.invoiceId)) map.set(o.invoiceId, []);
      map.get(o.invoiceId).push(o);
    }
    return map;
  }, [orders]);

  useEffect(() => {
    const unsubscribe = subscribeAllInvoices(
      db,
      (fetched) => {
        setInvoices(fetched);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe?.();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login', { replace: true });
    } catch (err) {
      console.error('Logout failed', err);
      toast.error('Could not sign out. Please try again.');
    }
  };

  const matchesSearchAndSource = (inv, term) => {
    if (sourceFilter !== 'ALL' && inv.source !== sourceFilter) return false;
    if (!term) return true;
    return [inv.invoiceNo, inv.orderId, inv.customer?.name, inv.customer?.mobile]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(term);
  };

  // Calendar options: how many invoices fall on each date (before the date filter itself).
  const dateOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    const counts = new Map();
    for (const inv of invoices) {
      if (!matchesSearchAndSource(inv, term)) continue;
      const d = getInvoiceDate(inv);
      if (!d) continue;
      const value = toDateInputValue(d);
      counts.set(value, (counts.get(value) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([value, count]) => {
        const [y, m, d] = value.split('-').map(Number);
        const label = new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        return { value, label, count };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, search, sourceFilter]);

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    const dateSet = new Set(dateFilter);
    return invoices.filter((inv) => {
      if (!matchesSearchAndSource(inv, term)) return false;
      if (dateSet.size) {
        const d = getInvoiceDate(inv);
        if (!d || !dateSet.has(toDateInputValue(d))) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, search, sourceFilter, dateFilter]);

  // Orders that a bulk button would touch: every eligible order behind the
  // invoices currently shown (i.e. the selected date(s) + search/source filters).
  const bulkOrderIds = useMemo(() => {
    const ids = new Set();
    for (const inv of filteredInvoices) {
      for (const o of getLinkedOrders(inv, ordersById, ordersByInvoiceId)) {
        if (isBulkEligible(o)) ids.add(o.id);
      }
    }
    return Array.from(ids);
  }, [filteredInvoices, ordersById, ordersByInvoiceId]);

  const handleConfirmBulk = async () => {
    if (!confirmingTarget || bulkOrderIds.length === 0) return;
    setBulkBusy(true);
    try {
      await confirmingTarget.run(db, bulkOrderIds);
      toast.success(
        `${bulkOrderIds.length} order${bulkOrderIds.length > 1 ? 's' : ''} marked as "${getOrderStatusMeta(confirmingTarget.status).label}"`
      );
    } catch (err) {
      console.error('Bulk status update failed', err);
      toast.error("Couldn't update those orders. Please try again.");
    } finally {
      setBulkBusy(false);
      setConfirmingTarget(null);
    }
  };

  const openCreateModal = () => {
    setEditingInvoice(null);
    setModalOpen(true);
  };

  const openEditModal = (invoice) => {
    setEditingInvoice(invoice);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteInvoiceDoc(db, deleteTarget.id);
      toast.success('Invoice deleted');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete invoice', err);
      toast.error("Couldn't delete the invoice. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-28 text-white">
      <AdminSectionHeader
        icon={Receipt}
        title="Invoices"
        subtitle={`${invoices.length} ${invoices.length === 1 ? 'invoice' : 'invoices'} total`}
        email={user?.email}
        onLogout={handleLogout}
      />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="surface-3d flex flex-1 items-center gap-2 rounded-xl px-3.5 py-2.5">
            <Search size={14} className="shrink-0 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice no., order id, customer…"
              className="w-full bg-transparent text-[12.5px] font-semibold text-[#f2ece2] outline-none placeholder:text-muted placeholder:font-normal"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="btn-3d flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-white"
          >
            <Plus size={14} />
            New Invoice
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {SOURCE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setSourceFilter(f)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide transition-colors ${
                sourceFilter === f ? 'border-orange/50 bg-orange/15 text-orange' : 'border-white/10 bg-[#0c0906] text-muted'
              }`}
            >
              {f === 'ALL' ? `All (${invoices.length})` : f === 'ORDER' ? 'From Orders' : 'Manual'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <OrderDateFilter
            options={dateOptions}
            selected={dateFilter}
            onChange={setDateFilter}
            label="Invoice date"
            countNoun="invoice"
            showSelectAll
          />
          {dateFilter.length === 0 && (
            <span className="text-[10.5px] text-muted">Pick invoice date(s) — or Select all — to update those invoices' orders in one click.</span>
          )}
        </div>

        {dateFilter.length > 0 && (
          <div className="surface-3d flex flex-wrap items-center gap-2 rounded-xl border border-orange/30 px-3 py-2.5">
            <span className="mr-1 shrink-0 text-[11px] font-extrabold text-[#f2ece2]">
              {filteredInvoices.length} invoice{filteredInvoices.length === 1 ? '' : 's'} · {bulkOrderIds.length} order
              {bulkOrderIds.length === 1 ? '' : 's'}
            </span>
            {BULK_TARGETS.map((target) => (
              <button
                key={target.status}
                type="button"
                disabled={bulkOrderIds.length === 0}
                onClick={() => setConfirmingTarget(target)}
                className="btn-3d-outline flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10.5px] font-bold text-gold disabled:opacity-50"
              >
                <target.icon size={12} />
                {target.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDateFilter([])}
              title="Clear date filter"
              className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:text-[#f2ece2]"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <InvoiceRowSkeleton key={i} />)
          ) : filteredInvoices.length === 0 ? (
            <div className="surface-3d rounded-2xl px-4 py-8 text-center text-[12px] text-muted">
              No invoices found. {search || sourceFilter !== 'ALL' ? 'Try clearing your filters.' : 'They\'ll appear here once payment is confirmed on an order, or create one manually.'}
            </div>
          ) : (
            filteredInvoices.map((invoice) => (
              <InvoiceRow
                key={invoice.id}
                invoice={invoice}
                linkedOrders={getLinkedOrders(invoice, ordersById, ordersByInvoiceId)}
                onView={() => setPreviewInvoice(invoice)}
                onEdit={() => openEditModal(invoice)}
                onDelete={() => setDeleteTarget(invoice)}
              />
            ))
          )}
        </div>
      </div>

      <InvoiceFormModal open={modalOpen} invoice={editingInvoice} onClose={() => setModalOpen(false)} />
      <InvoicePreviewModal open={!!previewInvoice} invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />
      <ConfirmDeleteDialog
        open={!!confirmingTarget}
        title={confirmingTarget ? `${confirmingTarget.label} for ${bulkOrderIds.length} order${bulkOrderIds.length === 1 ? '' : 's'}?` : ''}
        description={
          confirmingTarget
            ? `Every order on the ${filteredInvoices.length} invoice${filteredInvoices.length === 1 ? '' : 's'} shown will be set to "${getOrderStatusMeta(confirmingTarget.status).label}" and this updates on all admin and customer pages. Orders still awaiting payment confirmation, cancelled orders and manual invoices are skipped.`
            : ''
        }
        busy={bulkBusy}
        confirmLabel={confirmingTarget?.label || 'Update'}
        tone="success"
        onConfirm={handleConfirmBulk}
        onCancel={() => setConfirmingTarget(null)}
      />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Delete this invoice?"
        description={`Invoice ${deleteTarget?.invoiceNo || ''} will be permanently removed. This can't be undone.`}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function InvoiceRow({ invoice, linkedOrders = [], onView, onEdit, onDelete }) {
  const [sending, setSending] = useState(false);

  const handleShare = async () => {
    if (sending) return;
    setSending(true);
    try {
      const { method } = await sendInvoiceFile(invoice);
      if (method === 'fallback') {
        toast('Invoice downloaded — attach it in the WhatsApp chat that just opened.');
      }
    } catch (err) {
      console.error('Failed to share invoice', err);
      toast.error("Couldn't share the invoice. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="surface-3d flex items-center gap-3 rounded-2xl p-3">
      <div className="orb-3d flex h-12 w-12 shrink-0 items-center justify-center !rounded-xl text-orange">
        <Receipt size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[12.5px] font-bold text-[#f2ece2]">{invoice.invoiceNo}</p>
          <span
            className={`flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${
              invoice.source === 'ORDER' ? 'border-gold/35 bg-gold/10 text-gold' : 'border-white/15 bg-white/5 text-muted'
            }`}
          >
            {invoice.source === 'ORDER' ? <Link2 size={9} /> : <PenSquare size={9} />}
            {invoice.source === 'ORDER' ? invoice.orderId : 'Manual'}
          </span>
        </div>
        <p className="truncate text-[10.5px] font-semibold text-muted">
          {invoice.customer?.name} · {invoice.customer?.mobile}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] font-extrabold text-gradient-gold">₹{(invoice.grandTotal ?? 0).toLocaleString('en-IN')}</span>
          <StatusBadge orders={linkedOrders} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1.5">
        <button onClick={onView} className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-[#f2ece2] hover:text-orange">
          <Eye size={13} />
        </button>
        <button onClick={onEdit} className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-[#f2ece2] hover:text-orange">
          <Pencil size={13} />
        </button>
        <button
          onClick={() => generateInvoicePdf(invoice)}
          className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-[#f2ece2] hover:text-orange"
        >
          <Download size={13} />
        </button>
        <button
          onClick={handleShare}
          disabled={sending}
          title="Share invoice on WhatsApp"
          className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-[#25D366] disabled:opacity-60"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <MessageCircleMore size={13} />}
        </button>
        <button
          onClick={onDelete}
          className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-[#f2ece2] hover:text-[#e35226]"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ orders }) {
  if (!orders.length) return null;
  const statuses = new Set(orders.map((o) => o.status));
  if (statuses.size > 1) {
    return (
      <span className="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-muted">Mixed status</span>
    );
  }
  const meta = getOrderStatusMeta(orders[0].status);
  return (
    <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${meta.className}`}>
      {meta.emoji} {meta.label}
    </span>
  );
}

function InvoiceRowSkeleton() {
  return (
    <div className="surface-3d flex animate-pulse items-center gap-3 rounded-2xl p-3">
      <div className="h-12 w-12 shrink-0 rounded-xl bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 rounded bg-white/5" />
        <div className="h-2.5 w-1/2 rounded bg-white/5" />
        <div className="h-2.5 w-1/4 rounded bg-white/5" />
      </div>
    </div>
  );
}
