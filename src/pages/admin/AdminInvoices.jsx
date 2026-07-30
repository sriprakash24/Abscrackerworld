import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Download, Receipt, Link2, PenSquare, Eye } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';
import InvoiceFormModal from '../../components/admin/InvoiceFormModal';
import InvoicePreviewModal from '../../components/admin/InvoicePreviewModal';
import { db } from '../../firebase/config';
import { subscribeAllInvoices } from '../../services/invoicesFirestore';
import { generateInvoicePdf } from '../../utils/generateInvoicePdf';

const SOURCE_FILTERS = ['ALL', 'ORDER', 'MANUAL'];

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

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (sourceFilter !== 'ALL' && inv.source !== sourceFilter) return false;
      if (!term) return true;
      return [inv.invoiceNo, inv.orderId, inv.customer?.name, inv.customer?.mobile]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [invoices, search, sourceFilter]);

  const openCreateModal = () => {
    setEditingInvoice(null);
    setModalOpen(true);
  };

  const openEditModal = (invoice) => {
    setEditingInvoice(invoice);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-16 text-white">
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
                onView={() => setPreviewInvoice(invoice)}
                onEdit={() => openEditModal(invoice)}
              />
            ))
          )}
        </div>
      </div>

      <InvoiceFormModal open={modalOpen} invoice={editingInvoice} onClose={() => setModalOpen(false)} />
      <InvoicePreviewModal open={!!previewInvoice} invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />
    </div>
  );
}

function InvoiceRow({ invoice, onView, onEdit }) {
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
        <span className="text-[12px] font-extrabold text-gradient-gold">₹{(invoice.grandTotal ?? 0).toLocaleString('en-IN')}</span>
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
      </div>
    </div>
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
