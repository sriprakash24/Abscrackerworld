import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Download, FileText, Eye, Trash2 } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';
import EstimateFormModal from '../../components/admin/EstimateFormModal';
import EstimatePreviewModal from '../../components/admin/EstimatePreviewModal';
import ConfirmDeleteDialog from '../../components/admin/ConfirmDeleteDialog';
import { db } from '../../firebase/config';
import { subscribeAllEstimates, deleteEstimateDoc } from '../../services/estimatesFirestore';
import { generateEstimatePdf } from '../../utils/generateEstimatePdf';

/**
 * Admin "Estimate Bill" screen — a before-payment sibling of the Invoices
 * page. Same list / create / edit / preview / download / delete flow,
 * reusing the invoice item editor and pricing math, minus payment fields
 * (see EstimateFormModal.jsx and estimatesFirestore.js for why).
 */
export default function AdminEstimates() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState(null);
  const [previewEstimate, setPreviewEstimate] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeAllEstimates(
      db,
      (fetched) => {
        setEstimates(fetched);
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

  const filteredEstimates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return estimates;
    return estimates.filter((est) =>
      [est.estimateNo, est.customer?.name, est.customer?.mobile]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [estimates, search]);

  const openCreateModal = () => {
    setEditingEstimate(null);
    setModalOpen(true);
  };

  const openEditModal = (estimate) => {
    setEditingEstimate(estimate);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEstimateDoc(db, deleteTarget.id);
      toast.success('Estimate deleted');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete estimate', err);
      toast.error("Couldn't delete the estimate. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-28 text-white">
      <AdminSectionHeader
        icon={FileText}
        title="Estimate Bill"
        subtitle={`${estimates.length} ${estimates.length === 1 ? 'estimate' : 'estimates'} total`}
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
              placeholder="Search estimate no., customer…"
              className="w-full bg-transparent text-[12.5px] font-semibold text-[#f2ece2] outline-none placeholder:text-muted placeholder:font-normal"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="btn-3d flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-white"
          >
            <Plus size={14} />
            New Estimate
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <EstimateRowSkeleton key={i} />)
          ) : filteredEstimates.length === 0 ? (
            <div className="surface-3d rounded-2xl px-4 py-8 text-center text-[12px] text-muted">
              No estimates found. {search ? 'Try clearing your search.' : 'Create one for a customer enquiring before payment.'}
            </div>
          ) : (
            filteredEstimates.map((estimate) => (
              <EstimateRow
                key={estimate.id}
                estimate={estimate}
                onView={() => setPreviewEstimate(estimate)}
                onEdit={() => openEditModal(estimate)}
                onDelete={() => setDeleteTarget(estimate)}
              />
            ))
          )}
        </div>
      </div>

      <EstimateFormModal open={modalOpen} estimate={editingEstimate} onClose={() => setModalOpen(false)} />
      <EstimatePreviewModal open={!!previewEstimate} estimate={previewEstimate} onClose={() => setPreviewEstimate(null)} />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Delete this estimate?"
        description={`Estimate ${deleteTarget?.estimateNo || ''} will be permanently removed. This can't be undone.`}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function EstimateRow({ estimate, onView, onEdit, onDelete }) {
  return (
    <div className="surface-3d flex items-center gap-3 rounded-2xl p-3">
      <div className="orb-3d flex h-12 w-12 shrink-0 items-center justify-center !rounded-xl text-gold">
        <FileText size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[12.5px] font-bold text-[#f2ece2]">{estimate.estimateNo}</p>
        </div>
        <p className="truncate text-[10.5px] font-semibold text-muted">
          {estimate.customer?.name} · {estimate.customer?.mobile}
        </p>
        <span className="text-[12px] font-extrabold text-gradient-gold">₹{(estimate.grandTotal ?? 0).toLocaleString('en-IN')}</span>
      </div>

      <div className="flex shrink-0 flex-col gap-1.5">
        <button onClick={onView} className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-[#f2ece2] hover:text-orange">
          <Eye size={13} />
        </button>
        <button onClick={onEdit} className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-[#f2ece2] hover:text-orange">
          <Pencil size={13} />
        </button>
        <button
          onClick={() => generateEstimatePdf(estimate)}
          className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-[#f2ece2] hover:text-orange"
        >
          <Download size={13} />
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

function EstimateRowSkeleton() {
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
