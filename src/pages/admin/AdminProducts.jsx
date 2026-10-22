import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, PackageSearch, ImageOff, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useProducts } from '../../contexts/ProductsContext';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';
import ProductFormModal from '../../components/admin/ProductFormModal';
import ConfirmDeleteDialog from '../../components/admin/ConfirmDeleteDialog';
import { COMBO_CATEGORY_NAME } from '../../constants/catalog';
import { subscribeToCategoryDocs, deleteProductDoc, deleteProductImageIfOwned, setProductHidden } from '../../services/products';

export default function AdminProducts() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { products: allProducts, loading } = useProducts();
  // Combo packs are managed on Admin → Combos (they have their own fields).
  const products = useMemo(() => allProducts.filter((p) => !p.isCombo), [allProducts]);

  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToCategoryDocs(setCategories, (err) =>
      console.error('[AdminProducts] categories subscription failed:', err)
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

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (!term) return true;
      return [p.name, p.category, p.subcategory].filter(Boolean).join(' ').toLowerCase().includes(term);
    });
  }, [products, search, categoryFilter]);

  const openAddModal = () => {
    if (categories.length === 0) {
      toast.error('Add a category first, then add products to it.');
      navigate('/admin/categories');
      return;
    }
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProductDoc(deleteTarget.id);
      await deleteProductImageIfOwned(deleteTarget.rawImage);
      toast.success('Product deleted');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete product', err);
      toast.error("Couldn't delete the product. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const toggleHidden = async (product) => {
    setTogglingId(product.id);
    try {
      await setProductHidden(product.id, !product.hidden);
      toast.success(product.hidden ? `"${product.name}" is visible to customers again` : `"${product.name}" is now hidden from customers`);
    } catch (err) {
      console.error('Failed to toggle product visibility', err);
      toast.error("Couldn't update visibility. Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-bg pb-28 text-brown">
      <AdminSectionHeader
        icon={PackageSearch}
        title="Product Management"
        subtitle={`${products.length} ${products.length === 1 ? 'product' : 'products'} total`}
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
              placeholder="Search products…"
              className="w-full bg-transparent text-[12.5px] font-semibold text-brown outline-none placeholder:text-muted placeholder:font-normal"
            />
          </div>
          <button
            onClick={openAddModal}
            className="btn-3d flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-white"
          >
            <Plus size={14} />
            Add Product
          </button>
        </div>

        <p className="rounded-xl border border-coral/30 bg-peach-light/70 px-3.5 py-2 text-[11.5px] font-medium text-brown">
          Looking for combo packs? They live in{' '}
          <button onClick={() => navigate('/admin/combos')} className="font-extrabold text-red underline">
            Combos
          </button>
          .
        </p>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <FilterChip active={categoryFilter === 'ALL'} onClick={() => setCategoryFilter('ALL')} label={`All (${products.length})`} />
          {categories.filter((c) => c.categoryName !== COMBO_CATEGORY_NAME).map((c) => (
            <FilterChip
              key={c.id}
              active={categoryFilter === c.categoryName}
              onClick={() => setCategoryFilter(c.categoryName)}
              label={c.categoryName}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <ProductRowSkeleton key={i} />)
          ) : filteredProducts.length === 0 ? (
            <div className="surface-3d rounded-2xl px-4 py-8 text-center text-[12px] text-muted">
              No products found. {search || categoryFilter !== 'ALL' ? 'Try clearing your filters.' : 'Add your first product to get started.'}
            </div>
          ) : (
            filteredProducts.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                onEdit={() => openEditModal(product)}
                onDelete={() => setDeleteTarget(product)}
                onToggleHidden={() => toggleHidden(product)}
                toggling={togglingId === product.id}
              />
            ))
          )}
        </div>
      </div>

      <ProductFormModal
        open={modalOpen}
        product={editingProduct}
        categories={categories}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Delete this product?"
        description={`"${deleteTarget?.name}" will be permanently removed from the catalog. This can't be undone.`}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide transition-colors ${
        active ? 'border-orange/50 bg-orange/15 text-orange' : 'border-brown/12 bg-white text-muted'
      }`}
    >
      {label}
    </button>
  );
}

function ProductRow({ product, onEdit, onDelete, onToggleHidden, toggling }) {
  const stockMeta = {
    in: { label: 'In stock', className: 'border-[#1E8E4A]/35 bg-[#1E8E4A]/10 text-[#1E8E4A]' },
    low: { label: 'Low stock', className: 'border-gold/35 bg-gold/10 text-gold' },
    out: { label: 'Out of stock', className: 'border-[#e35226]/35 bg-[#e35226]/10 text-[#e35226]' },
  }[product.stock];

  return (
    <div className={`surface-3d flex items-center gap-3 rounded-2xl p-3 transition-opacity ${product.hidden ? 'opacity-60' : ''}`}>
      <div className="orb-3d flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden !rounded-xl">
        {product.img ? (
          <img src={product.img} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <ImageOff size={16} className="text-muted" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[12.5px] font-bold text-brown">{product.name}</p>
          {product.hidden && (
            <span className="shrink-0 rounded-full border border-brown/16 bg-brown/6 px-1.5 py-0.5 text-[8.5px] font-bold tracking-wide text-muted">
              HIDDEN
            </span>
          )}
        </div>
        {product.nameTa && (
          <p className="truncate text-[10px] font-semibold text-gold">{product.nameTa}</p>
        )}
        <p className="truncate text-[10.5px] font-semibold text-muted">
          {product.category}
          {product.subcategory ? ` · ${product.subcategory}` : ''} · {product.unit}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] font-extrabold text-orange">₹{product.sale}</span>
          {product.mrp > product.sale && (
            <span className="text-[10.5px] font-semibold text-muted line-through">₹{product.mrp}</span>
          )}
          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${stockMeta.className}`}>
            {stockMeta.label} ({product.stockQty})
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <button
          onClick={onToggleHidden}
          disabled={toggling}
          title={product.hidden ? 'Show to customers' : 'Hide from customers'}
          aria-label={product.hidden ? 'Show product' : 'Hide product'}
          aria-pressed={!product.hidden}
          className={`orb-3d flex h-8 w-8 items-center justify-center !rounded-full transition-colors disabled:opacity-50 ${
            product.hidden ? 'text-muted hover:text-brown' : 'text-[#1E8E4A] hover:text-[#1E8E4A]'
          }`}
        >
          {toggling ? <Loader2 size={13} className="animate-spin" /> : product.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button
          onClick={onEdit}
          className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-brown hover:text-orange"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-brown hover:text-[#e35226]"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function ProductRowSkeleton() {
  return (
    <div className="surface-3d flex animate-pulse items-center gap-3 rounded-2xl p-3">
      <div className="h-14 w-14 shrink-0 rounded-xl bg-brown/6" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 rounded bg-brown/6" />
        <div className="h-2.5 w-1/2 rounded bg-brown/6" />
        <div className="h-2.5 w-1/3 rounded bg-brown/6" />
      </div>
    </div>
  );
}
