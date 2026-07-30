import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, LayoutGrid } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useProducts } from '../../contexts/ProductsContext';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';
import CategoryFormModal from '../../components/admin/CategoryFormModal';
import ConfirmDeleteDialog from '../../components/admin/ConfirmDeleteDialog';
import { CATEGORY_ICONS } from '../../constants/catalog';
import {
  subscribeToCategoryDocs,
  deleteCategoryDoc,
  moveCategoryOrder,
} from '../../services/products';

export default function AdminCategories() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { products } = useProducts();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [movingId, setMovingId] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToCategoryDocs(
      (data) => {
        setCategories(data);
        setLoading(false);
      },
      (err) => {
        console.error('[AdminCategories] subscription failed:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe?.();
  }, []);

  const productCountByCategory = useMemo(() => {
    const counts = {};
    for (const p of products) counts[p.category] = (counts[p.category] || 0) + 1;
    return counts;
  }, [products]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login', { replace: true });
    } catch (err) {
      console.error('Logout failed', err);
      toast.error('Could not sign out. Please try again.');
    }
  };

  const handleMove = async (categoryId, direction) => {
    setMovingId(categoryId);
    try {
      await moveCategoryOrder(categories, categoryId, direction);
    } catch (err) {
      console.error('Failed to reorder category', err);
      toast.error("Couldn't reorder that category. Please try again.");
    } finally {
      setMovingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCategoryDoc(deleteTarget.id);
      toast.success('Category deleted');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete category', err);
      toast.error("Couldn't delete the category. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const productsInDeleteTarget = deleteTarget ? productCountByCategory[deleteTarget.categoryName] || 0 : 0;

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-16 text-white">
      <AdminSectionHeader
        icon={LayoutGrid}
        title="Category Management"
        subtitle={`${categories.length} ${categories.length === 1 ? 'category' : 'categories'} · drag order with arrows`}
        email={user?.email}
        onLogout={handleLogout}
      />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <p className="text-[11.5px] font-semibold text-muted">
            Use the arrows to change where a category appears on the storefront.
          </p>
          <button
            onClick={() => {
              setEditingCategory(null);
              setModalOpen(true);
            }}
            className="btn-3d flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-white"
          >
            <Plus size={14} />
            Add Category
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <CategoryRowSkeleton key={i} />)
          ) : categories.length === 0 ? (
            <div className="surface-3d rounded-2xl px-4 py-8 text-center text-[12px] text-muted">
              No categories yet. Add your first category to start organizing products.
            </div>
          ) : (
            categories.map((category, i) => (
              <CategoryRow
                key={category.id}
                category={category}
                productCount={productCountByCategory[category.categoryName] || 0}
                isFirst={i === 0}
                isLast={i === categories.length - 1}
                moving={movingId === category.id}
                onMoveUp={() => handleMove(category.id, 'up')}
                onMoveDown={() => handleMove(category.id, 'down')}
                onEdit={() => {
                  setEditingCategory(category);
                  setModalOpen(true);
                }}
                onDelete={() => setDeleteTarget(category)}
              />
            ))
          )}
        </div>
      </div>

      <CategoryFormModal
        open={modalOpen}
        category={editingCategory}
        existingCategories={categories}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Delete this category?"
        description={
          productsInDeleteTarget > 0
            ? `"${deleteTarget?.categoryName}" still has ${productsInDeleteTarget} product${productsInDeleteTarget === 1 ? '' : 's'} assigned to it. They'll stay in the catalog but won't be grouped under any category until you move them. Continue?`
            : `"${deleteTarget?.categoryName}" will be permanently removed. This can't be undone.`
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function CategoryRow({ category, productCount, isFirst, isLast, moving, onMoveUp, onMoveDown, onEdit, onDelete }) {
  return (
    <div className="surface-3d flex items-center gap-3 rounded-2xl p-3">
      <div className="flex shrink-0 flex-col gap-1">
        <button
          onClick={onMoveUp}
          disabled={isFirst || moving}
          className="orb-3d flex h-7 w-7 items-center justify-center !rounded-full text-[#f2ece2] disabled:opacity-25"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast || moving}
          className="orb-3d flex h-7 w-7 items-center justify-center !rounded-full text-[#f2ece2] disabled:opacity-25"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      <span className="orb-3d flex h-11 w-11 shrink-0 items-center justify-center !rounded-full text-lg">
        {CATEGORY_ICONS[category.categoryName] || '🎆'}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-[#f2ece2]">{category.categoryName}</p>
        <p className="text-[10.5px] font-semibold text-muted">
          {productCount} {productCount === 1 ? 'product' : 'products'} · order {category.displayOrder}
        </p>
      </div>

      <div className="flex shrink-0 gap-1.5">
        <button
          onClick={onEdit}
          className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-[#f2ece2] hover:text-orange"
        >
          <Pencil size={13} />
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

function CategoryRowSkeleton() {
  return (
    <div className="surface-3d flex animate-pulse items-center gap-3 rounded-2xl p-3">
      <div className="h-11 w-11 shrink-0 rounded-full bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/2 rounded bg-white/5" />
        <div className="h-2.5 w-1/3 rounded bg-white/5" />
      </div>
    </div>
  );
}
