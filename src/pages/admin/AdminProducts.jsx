import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, PackageSearch, ImageOff } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useProducts } from '../../contexts/ProductsContext';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';
import ProductFormModal from '../../components/admin/ProductFormModal';
import ConfirmDeleteDialog from '../../components/admin/ConfirmDeleteDialog';
import { subscribeToCategoryDocs, deleteProductDoc, deleteProductImageIfOwned } from '../../services/products';

export default function AdminProducts() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { products, loading } = useProducts();

  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-16 text-white">
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
              className="w-full bg-transparent text-[12.5px] font-semibold text-[#f2ece2] outline-none placeholder:text-muted placeholder:font-normal"
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

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <FilterChip active={categoryFilter === 'ALL'} onClick={() => setCategoryFilter('ALL')} label={`All (${products.length})`} />
          {categories.map((c) => (
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
        active ? 'border-orange/50 bg-orange/15 text-orange' : 'border-white/10 bg-[#0c0906] text-muted'
      }`}
    >
      {label}
    </button>
  );
}

function ProductRow({ product, onEdit, onDelete }) {
  const stockMeta = {
    in: { label: 'In stock', className: 'border-[#8fe3a0]/35 bg-[#8fe3a0]/10 text-[#8fe3a0]' },
    low: { label: 'Low stock', className: 'border-gold/35 bg-gold/10 text-gold' },
    out: { label: 'Out of stock', className: 'border-[#e35226]/35 bg-[#e35226]/10 text-[#e35226]' },
  }[product.stock];

  return (
    <div className="surface-3d flex items-center gap-3 rounded-2xl p-3">
      <div className="orb-3d flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden !rounded-xl">
        {product.img ? (
          <img src={product.img} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <ImageOff size={16} className="text-muted" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-bold text-[#f2ece2]">{product.name}</p>
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

      <div className="flex shrink-0 flex-col gap-1.5">
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

function ProductRowSkeleton() {
  return (
    <div className="surface-3d flex animate-pulse items-center gap-3 rounded-2xl p-3">
      <div className="h-14 w-14 shrink-0 rounded-xl bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 rounded bg-white/5" />
        <div className="h-2.5 w-1/2 rounded bg-white/5" />
        <div className="h-2.5 w-1/3 rounded bg-white/5" />
      </div>
    </div>
  );
}
