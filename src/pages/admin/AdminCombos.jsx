import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Gift,
  ImageOff,
  Eye,
  EyeOff,
  Loader2,
  ChevronUp,
  ChevronDown,
  Copy,
  ExternalLink,
  ImageIcon,
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useProducts } from '../../contexts/ProductsContext';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';
import ComboFormModal from '../../components/admin/ComboFormModal';
import ConfirmDeleteDialog from '../../components/admin/ConfirmDeleteDialog';
import { comboToFormValues } from '../../schemas/adminComboSchema';
import { deleteCombo, setComboHidden, moveCombo } from '../../services/combos';

/**
 * Admin → Combos. Create / edit / hide / reorder / duplicate / delete the
 * combo packs shown in the pinned COMBO ABS section at the top of the
 * storefront. Changes are live immediately (Firestore snapshot).
 */
export default function AdminCombos() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { products, loading } = useProducts();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [initialValues, setInitialValues] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const combos = useMemo(
    () =>
      products
        .filter((p) => p.isCombo)
        .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [products],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return combos;
    return combos.filter((c) => [c.name, c.nameTa, c.badge].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [combos, search]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login', { replace: true });
    } catch (err) {
      console.error('Logout failed', err);
      toast.error('Could not sign out. Please try again.');
    }
  };

  const openAdd = () => {
    setEditing(null);
    setInitialValues(null);
    setModalOpen(true);
  };
  const openEdit = (c) => {
    setEditing(c);
    setInitialValues(null);
    setModalOpen(true);
  };
  const openDuplicate = (c) => {
    setEditing(null);
    setInitialValues({ ...comboToFormValues(c), name: `${c.name} (Copy)`, displayOrder: '' });
    setModalOpen(true);
  };

  const toggleHidden = async (c) => {
    setBusyId(c.id);
    try {
      await setComboHidden(c.id, !c.hidden);
      toast.success(c.hidden ? `"${c.name}" is live again` : `"${c.name}" is hidden from customers`);
    } catch (err) {
      console.error('Failed to toggle combo visibility', err);
      toast.error("Couldn't update visibility. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = async (c, direction) => {
    setBusyId(c.id);
    try {
      await moveCombo(combos, c.id, direction);
    } catch (err) {
      console.error('Failed to reorder combo', err);
      toast.error("Couldn't reorder that combo. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCombo(deleteTarget);
      toast.success('Combo deleted');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete combo', err);
      toast.error("Couldn't delete the combo. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-bg pb-28 text-brown">
      <AdminSectionHeader
        icon={Gift}
        title="Combo Management"
        subtitle={`${combos.length} ${combos.length === 1 ? 'combo' : 'combos'} · shown first on the storefront`}
        email={user?.email}
        onLogout={handleLogout}
      />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="surface-3d flex flex-1 items-center gap-2 rounded-xl px-3.5 py-2.5">
            <Search size={14} className="shrink-0 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search combos…"
              className="w-full bg-transparent text-[12.5px] font-semibold text-brown outline-none placeholder:font-normal placeholder:text-muted"
            />
          </div>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="btn-3d-outline flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[12px] font-bold"
          >
            <ExternalLink size={13} /> View storefront
          </a>
          <button
            onClick={openAdd}
            className="btn-3d flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-white"
          >
            <Plus size={14} />
            Add Combo
          </button>
        </div>

        <p className="rounded-xl border border-coral/30 bg-peach-light/70 px-3.5 py-2.5 text-[11.5px] font-medium leading-relaxed text-brown">
          Combos appear in the <b>COMBO ABS</b> section above Sparklers. Each card has an <b>Add</b> and a <b>View Items</b> button —
          View opens a popup with the “What's inside” image and the item list you set here.
        </p>

        <div className="flex flex-col gap-2.5">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="surface-3d h-[92px] animate-pulse rounded-2xl" />
            ))
          ) : visible.length === 0 ? (
            <div className="surface-3d flex flex-col items-center gap-3 rounded-2xl px-4 py-10 text-center">
              <Gift size={30} className="text-coral" />
              <p className="text-[12.5px] font-semibold text-muted">
                {search ? 'No combos match your search.' : 'No combos yet. Create your first combo pack.'}
              </p>
              {!search && (
                <button onClick={openAdd} className="btn-3d flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-white">
                  <Plus size={13} /> Add Combo
                </button>
              )}
            </div>
          ) : (
            visible.map((c, i) => (
              <ComboRow
                key={c.id}
                combo={c}
                isFirst={i === 0 || !!search}
                isLast={i === visible.length - 1 || !!search}
                busy={busyId === c.id}
                onMoveUp={() => handleMove(c, 'up')}
                onMoveDown={() => handleMove(c, 'down')}
                onEdit={() => openEdit(c)}
                onDuplicate={() => openDuplicate(c)}
                onDelete={() => setDeleteTarget(c)}
                onToggleHidden={() => toggleHidden(c)}
              />
            ))
          )}
        </div>
      </div>

      <ComboFormModal
        open={modalOpen}
        combo={editing}
        initialValues={initialValues}
        catalog={products}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Delete this combo?"
        description={`"${deleteTarget?.name}" will be permanently removed from the storefront. Orders already placed keep their copy. This can't be undone.`}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ComboRow({ combo, isFirst, isLast, busy, onMoveUp, onMoveDown, onEdit, onDuplicate, onDelete, onToggleHidden }) {
  const stockMeta = {
    in: { label: 'In stock', className: 'border-[#1E8E4A]/35 bg-[#1E8E4A]/10 text-[#1E8E4A]' },
    low: { label: 'Low stock', className: 'border-gold/35 bg-gold/10 text-gold' },
    out: { label: 'Out of stock', className: 'border-[#e35226]/35 bg-[#e35226]/10 text-[#e35226]' },
  }[combo.stock];

  return (
    <div className={`surface-3d flex items-center gap-3 rounded-2xl p-3 transition-opacity ${combo.hidden ? 'opacity-60' : ''}`}>
      <div className="flex shrink-0 flex-col gap-1">
        <button onClick={onMoveUp} disabled={isFirst || busy} aria-label="Move combo up" className="orb-3d flex h-6 w-6 items-center justify-center !rounded-full disabled:opacity-25">
          <ChevronUp size={13} />
        </button>
        <button onClick={onMoveDown} disabled={isLast || busy} aria-label="Move combo down" className="orb-3d flex h-6 w-6 items-center justify-center !rounded-full disabled:opacity-25">
          <ChevronDown size={13} />
        </button>
      </div>

      <div className="orb-3d flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden !rounded-xl">
        {combo.img ? <img src={combo.img} alt={combo.name} className="h-full w-full object-cover" /> : <ImageOff size={16} className="text-muted" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-[13px] font-bold text-brown">{combo.name}</p>
          {combo.badge && (
            <span className="shrink-0 rounded bg-gradient-to-b from-[#ffd669] to-[#ffb347] px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-[#4a1d10]">
              {combo.badge}
            </span>
          )}
          {combo.hidden && (
            <span className="shrink-0 rounded-full border border-brown/16 bg-brown/6 px-1.5 py-0.5 text-[8.5px] font-bold tracking-wide text-muted">HIDDEN</span>
          )}
        </div>
        {combo.nameTa && <p className="truncate text-[10px] font-semibold text-gold">{combo.nameTa}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[12.5px] font-extrabold text-orange">₹{combo.sale}</span>
          {combo.mrp > combo.sale && <span className="text-[10.5px] font-semibold text-muted line-through">₹{combo.mrp}</span>}
          {combo.discountPercentage > 0 && <span className="text-[10px] font-bold text-red">{combo.discountPercentage}% OFF</span>}
          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${stockMeta.className}`}>
            {stockMeta.label} ({combo.stockQty})
          </span>
          <span className="flex items-center gap-1 rounded-full border border-coral/35 bg-peach-light px-1.5 py-0.5 text-[9px] font-bold text-brown">
            {combo.comboItems.length} items
          </span>
          {combo.comboImage && (
            <span className="flex items-center gap-1 rounded-full border border-coral/35 bg-peach-light px-1.5 py-0.5 text-[9px] font-bold text-brown">
              <ImageIcon size={9} /> list image
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap justify-end gap-1.5 sm:flex-nowrap">
        <button
          onClick={onToggleHidden}
          disabled={busy}
          title={combo.hidden ? 'Show to customers' : 'Hide from customers'}
          aria-label={combo.hidden ? 'Show combo' : 'Hide combo'}
          className={`orb-3d flex h-8 w-8 items-center justify-center !rounded-full disabled:opacity-50 ${combo.hidden ? 'text-muted' : 'text-[#1E8E4A]'}`}
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : combo.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button onClick={onDuplicate} title="Duplicate" aria-label="Duplicate combo" className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full hover:text-orange">
          <Copy size={13} />
        </button>
        <button onClick={onEdit} title="Edit" aria-label="Edit combo" className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full hover:text-orange">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} title="Delete" aria-label="Delete combo" className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full hover:text-[#e35226]">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
