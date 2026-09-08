import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BadgePercent, Loader2, ImageOff, Search, CheckCircle2, RotateCcw } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useProducts } from '../../contexts/ProductsContext';
import { subscribeToCategoryDocs, bulkUpdateProductPrices } from '../../services/products';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';

/**
 * Bulk Price Update — pick a category, see every product in it, and edit
 * each product's MRP / Sale price individually right there in the list
 * (no formula, no "same value for everyone"). Edited rows are tracked
 * locally and all saved together with one "Save changes" click.
 */
export default function AdminPriceUpdate() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { products, loading } = useProducts();

  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState({}); // { [productId]: { mrp, salePrice } }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToCategoryDocs((docs) => {
      setCategories(docs);
      setCategoryFilter((current) => current || docs[0]?.categoryName || '');
    }, (err) => console.error('[AdminPriceUpdate] categories subscription failed:', err));
    return () => unsubscribe?.();
  }, []);

  // Switching category drops any unsaved edits for the previous one.
  useEffect(() => {
    setEdits({});
  }, [categoryFilter]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login', { replace: true });
    } catch (err) {
      console.error('Logout failed', err);
      toast.error('Could not sign out. Please try again.');
    }
  };

  const categoryProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products
      .filter((p) => p.category === categoryFilter)
      .filter((p) => (!term ? true : p.name.toLowerCase().includes(term)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, categoryFilter, search]);

  const setField = (productId, field, rawValue) => {
    setEdits((prev) => ({
      ...prev,
      [productId]: {
        mrp: field === 'mrp' ? rawValue : prev[productId]?.mrp,
        salePrice: field === 'salePrice' ? rawValue : prev[productId]?.salePrice,
      },
    }));
  };

  const revertRow = (productId) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const changedIds = Object.keys(edits).filter((id) => {
    const e = edits[id];
    return (e.mrp !== undefined && e.mrp !== '') || (e.salePrice !== undefined && e.salePrice !== '');
  });
  const changedCount = changedIds.length;

  const saveChanges = async () => {
    setSaving(true);
    try {
      const updates = changedIds.map((id) => {
        const product = products.find((p) => p.id === id);
        const newMrp = edits[id].mrp !== undefined && edits[id].mrp !== '' ? Number(edits[id].mrp) : product.mrp;
        const newSale =
          edits[id].salePrice !== undefined && edits[id].salePrice !== '' ? Number(edits[id].salePrice) : product.sale;
        const discountPercentage = newMrp > newSale ? Math.round(((newMrp - newSale) / newMrp) * 100) : 0;
        return { id, mrp: newMrp, salePrice: newSale, discountPercentage };
      });
      await bulkUpdateProductPrices(updates);
      toast.success(`Updated prices for ${updates.length} ${updates.length === 1 ? 'product' : 'products'}`);
      setEdits({});
    } catch (err) {
      console.error('Bulk price update failed', err);
      toast.error("Couldn't update prices. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-24 text-white">
      <AdminSectionHeader
        icon={BadgePercent}
        title="Price Update"
        subtitle={`${products.length} ${products.length === 1 ? 'product' : 'products'} in catalog`}
        email={user?.email}
        onLogout={handleLogout}
      />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6">
        {/* Category picker */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((c) => {
            const count = products.filter((p) => p.category === c.categoryName).length;
            return (
              <FilterChip
                key={c.id}
                active={categoryFilter === c.categoryName}
                onClick={() => setCategoryFilter(c.categoryName)}
                label={`${c.categoryName} (${count})`}
              />
            );
          })}
        </div>

        {/* Search within category */}
        <div className="surface-3d flex items-center gap-2 rounded-xl px-3.5 py-2.5">
          <Search size={14} className="shrink-0 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={categoryFilter ? `Search in ${categoryFilter}…` : 'Search…'}
            className="w-full bg-transparent text-[12.5px] font-semibold text-[#f2ece2] outline-none placeholder:text-muted placeholder:font-normal"
          />
        </div>

        {/* Product list — each row edits its own price */}
        <div className="flex flex-col gap-2.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)
          ) : !categoryFilter ? (
            <div className="surface-3d rounded-2xl px-4 py-8 text-center text-[12px] text-muted">
              No categories yet. Add a category on the Categories page first.
            </div>
          ) : categoryProducts.length === 0 ? (
            <div className="surface-3d rounded-2xl px-4 py-8 text-center text-[12px] text-muted">
              No products found{search ? ' for your search' : ` in "${categoryFilter}"`}.
            </div>
          ) : (
            categoryProducts.map((product) => (
              <PriceRow
                key={product.id}
                product={product}
                edit={edits[product.id]}
                onChange={(field, val) => setField(product.id, field, val)}
                onRevert={() => revertRow(product.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Sticky save bar */}
      {changedCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-orange/30 bg-[#050505]/95 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="text-[12px] font-semibold text-[#f2ece2]">
              <span className="font-extrabold text-orange">{changedCount}</span>{' '}
              {changedCount === 1 ? 'product' : 'products'} changed
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setEdits({})}
                disabled={saving}
                className="btn-3d-outline rounded-xl px-4 py-2.5 text-[12px] font-bold text-[#f2ece2] disabled:opacity-50"
              >
                Discard
              </button>
              <button
                onClick={saveChanges}
                disabled={saving}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#e35226] to-[#b8391a] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_8px_18px_-8px_rgba(227,82,38,0.55)] transition-transform active:scale-[0.97] disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
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

function PriceRow({ product, edit, onChange, onRevert }) {
  const mrpValue = edit?.mrp !== undefined ? edit.mrp : String(product.mrp);
  const saleValue = edit?.salePrice !== undefined ? edit.salePrice : String(product.sale);
  const isChanged =
    (edit?.mrp !== undefined && edit.mrp !== '' && Number(edit.mrp) !== product.mrp) ||
    (edit?.salePrice !== undefined && edit.salePrice !== '' && Number(edit.salePrice) !== product.sale);

  return (
    <div
      className={`surface-3d flex items-center gap-3 rounded-2xl p-3 ${
        isChanged ? 'ring-1 ring-orange/50' : ''
      }`}
    >
      <div className="orb-3d flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden !rounded-xl">
        {product.img ? (
          <img src={product.img} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <ImageOff size={14} className="text-muted" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-bold text-[#f2ece2]">{product.name}</p>
        {product.subcategory && (
          <p className="truncate text-[10.5px] font-semibold text-muted">{product.subcategory}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <PriceInput label="MRP" value={mrpValue} onChange={(v) => onChange('mrp', v)} />
        <PriceInput label="Sale" value={saleValue} onChange={(v) => onChange('salePrice', v)} highlight />
        {isChanged && (
          <button
            onClick={onRevert}
            title="Revert to original price"
            className="orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-full text-muted hover:text-orange"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function PriceInput({ label, value, onChange, highlight }) {
  return (
    <label className="flex flex-col items-start">
      <span className="mb-0.5 text-[9.5px] font-bold tracking-wide text-muted">{label}</span>
      <div className="flex items-center gap-0.5">
        <span className="text-[11px] font-bold text-muted">₹</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-[68px] rounded-lg border bg-[#0c0906] px-2 py-1.5 text-[12px] font-bold outline-none ${
            highlight
              ? 'border-white/10 text-orange focus:border-orange/70'
              : 'border-white/10 text-[#f2ece2] focus:border-orange/70'
          }`}
        />
      </div>
    </label>
  );
}

function RowSkeleton() {
  return (
    <div className="surface-3d flex animate-pulse items-center gap-3 rounded-2xl p-3">
      <div className="h-12 w-12 shrink-0 rounded-xl bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 rounded bg-white/5" />
        <div className="h-2.5 w-1/3 rounded bg-white/5" />
      </div>
      <div className="h-9 w-16 rounded-lg bg-white/5" />
      <div className="h-9 w-16 rounded-lg bg-white/5" />
    </div>
  );
}
