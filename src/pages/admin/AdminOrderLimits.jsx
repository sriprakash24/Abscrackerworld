import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Gauge, Loader2, ImageOff, Search, CheckCircle2, RotateCcw, Zap } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useProducts } from '../../contexts/ProductsContext';
import { subscribeToCategoryDocs, bulkUpdateProductOrderLimits } from '../../services/products';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';

/**
 * Order Limits — pick a category, cap how many of each product a single
 * customer can put in their cart. Built for bulk-order abuse during
 * offers/flash-deals (e.g. someone ordering 75 of a discounted item):
 * set "Electric Sparklers" to 5 and every visible product in that category
 * gets clamped to 5 per order everywhere the customer can add to cart
 * (Home, category pages, Cart) — see utils/productLimits.js.
 *
 * Hidden products are left out entirely (same rule as AdminPriceUpdate) —
 * there's no point capping an order limit on something customers can't
 * even see.
 */
// Pseudo-category id for the "All" chip — lets the admin set (and bulk-apply)
// an order limit across every visible product in every category in one go,
// instead of repeating the bulk-apply flow per category.
const ALL_CATEGORIES = '__all__';

export default function AdminOrderLimits() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { products, loading } = useProducts();

  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState({}); // { [productId]: maxOrderQtyString }
  const [bulkValue, setBulkValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToCategoryDocs((docs) => {
      setCategories(docs);
      setCategoryFilter((current) => current || docs[0]?.categoryName || '');
    }, (err) => console.error('[AdminOrderLimits] categories subscription failed:', err));
    return () => unsubscribe?.();
  }, []);

  // Switching category drops any unsaved edits for the previous one.
  useEffect(() => {
    setEdits({});
    setBulkValue('');
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

  // Hidden products aren't sold to customers, so an order limit on them is
  // meaningless — left out entirely, same rule as the Price Update page.
  const visibleProducts = useMemo(() => products.filter((p) => !p.hidden), [products]);

  const categoryProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return visibleProducts
      .filter((p) => categoryFilter === ALL_CATEGORIES || p.category === categoryFilter)
      .filter((p) => (!term ? true : p.name.toLowerCase().includes(term)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [visibleProducts, categoryFilter, search]);

  const setField = (productId, rawValue) => {
    setEdits((prev) => ({ ...prev, [productId]: rawValue }));
  };

  const revertRow = (productId) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  // Stages the same value across every product currently listed (category +
  // search filter applied) in one go — this is the "electric sparklers -> 5"
  // flow described by the admin, without needing to type it row by row.
  // Nothing is written to Firestore until "Save changes" is clicked.
  const applyBulkValue = () => {
    const trimmed = bulkValue.trim();
    if (trimmed === '') return;
    setEdits((prev) => {
      const next = { ...prev };
      categoryProducts.forEach((p) => {
        next[p.id] = trimmed;
      });
      return next;
    });
  };

  const changedIds = Object.keys(edits).filter((id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return false;
    const raw = edits[id];
    const nextVal = raw === '' ? 0 : Math.max(0, Math.round(Number(raw) || 0));
    return nextVal !== (product.maxOrderQty || 0);
  });
  const changedCount = changedIds.length;

  const saveChanges = async () => {
    setSaving(true);
    try {
      const updates = changedIds.map((id) => {
        const raw = edits[id];
        const maxOrderQty = raw === '' ? 0 : Math.max(0, Math.round(Number(raw) || 0));
        return { id, maxOrderQty };
      });
      await bulkUpdateProductOrderLimits(updates);
      toast.success(`Updated order limits for ${updates.length} ${updates.length === 1 ? 'product' : 'products'}`);
      setEdits({});
      setBulkValue('');
    } catch (err) {
      console.error('Bulk order-limit update failed', err);
      toast.error("Couldn't update order limits. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-44 text-white">
      <AdminSectionHeader
        icon={Gauge}
        title="Order Limits"
        subtitle={`${visibleProducts.length} ${visibleProducts.length === 1 ? 'product' : 'products'} visible to customers`}
        email={user?.email}
        onLogout={handleLogout}
      />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6">
        {/* Category picker */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <FilterChip
            active={categoryFilter === ALL_CATEGORIES}
            onClick={() => setCategoryFilter(ALL_CATEGORIES)}
            label={`All (${visibleProducts.length})`}
          />
          {categories.map((c) => {
            const count = visibleProducts.filter((p) => p.category === c.categoryName).length;
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
            placeholder={
              categoryFilter === ALL_CATEGORIES
                ? 'Search across all categories…'
                : categoryFilter
                  ? `Search in ${categoryFilter}…`
                  : 'Search…'
            }
            className="w-full bg-transparent text-[12.5px] font-semibold text-[#f2ece2] outline-none placeholder:text-muted placeholder:font-normal"
          />
        </div>

        {/* Bulk "set all in this list" row — the main "electric sparklers -> 5" flow */}
        {!!categoryFilter && categoryProducts.length > 0 && (
          <div className="surface-3d flex flex-wrap items-center gap-2.5 rounded-xl px-3.5 py-3">
            <span className="orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-full text-orange">
              <Zap size={14} />
            </span>
            <p className="min-w-0 flex-1 text-[11.5px] font-semibold text-muted">
              Set max qty per order for{' '}
              <span className="font-extrabold text-[#f2ece2]">
                all {categoryProducts.length} {search ? 'matching' : 'visible'} {categoryProducts.length === 1 ? 'product' : 'products'}
              </span>{' '}
              {search
                ? ''
                : categoryFilter === ALL_CATEGORIES
                  ? 'across all categories'
                  : `in "${categoryFilter}"`}
            </p>
            <input
              type="number"
              min="0"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder="e.g. 5"
              className="w-20 shrink-0 rounded-lg border border-white/10 bg-[#0c0906] px-2.5 py-1.5 text-[12px] font-bold text-orange outline-none focus:border-orange/70"
            />
            <button
              onClick={applyBulkValue}
              disabled={bulkValue.trim() === ''}
              className="shrink-0 rounded-lg bg-gradient-to-b from-[#e35226] to-[#b8391a] px-3 py-1.5 text-[11px] font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-40"
            >
              Apply to all
            </button>
          </div>
        )}

        {/* Product list — each row can still be fine-tuned individually */}
        <div className="flex flex-col gap-2.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)
          ) : !categoryFilter ? (
            <div className="surface-3d rounded-2xl px-4 py-8 text-center text-[12px] text-muted">
              No categories yet. Add a category on the Categories page first.
            </div>
          ) : categoryProducts.length === 0 ? (
            <div className="surface-3d rounded-2xl px-4 py-8 text-center text-[12px] text-muted">
              No products found
              {search ? ' for your search' : categoryFilter === ALL_CATEGORIES ? '' : ` in "${categoryFilter}"`}.
            </div>
          ) : (
            categoryProducts.map((product) => (
              <LimitRow
                key={product.id}
                product={product}
                edit={edits[product.id]}
                onChange={(val) => setField(product.id, val)}
                onRevert={() => revertRow(product.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Sticky save bar — sits just above the bottom nav */}
      {changedCount > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-40 border-t border-orange/30 bg-[#050505]/95 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="text-[12px] font-semibold text-[#f2ece2]">
              <span className="font-extrabold text-orange">{changedCount}</span>{' '}
              {changedCount === 1 ? 'product' : 'products'} changed
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEdits({});
                  setBulkValue('');
                }}
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

function LimitRow({ product, edit, onChange, onRevert }) {
  const value = edit !== undefined ? edit : product.maxOrderQty ? String(product.maxOrderQty) : '';
  const numericValue = value === '' ? 0 : Math.max(0, Math.round(Number(value) || 0));
  const isChanged = edit !== undefined && numericValue !== (product.maxOrderQty || 0);
  const isUnlimited = numericValue === 0;

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
        <p className="truncate text-[10.5px] font-semibold text-muted">
          {product.subcategory ? `${product.subcategory} · ` : ''}Stock: {product.stockQty ?? '—'}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <label className="flex flex-col items-start">
          <span className="mb-0.5 flex items-center gap-1 text-[9.5px] font-bold tracking-wide text-muted">
            Max / order
            {isUnlimited && <span aria-hidden>∞</span>}
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="No limit"
            className={`w-[76px] rounded-lg border bg-[#0c0906] px-2 py-1.5 text-center text-[12px] font-bold outline-none placeholder:text-[9.5px] placeholder:font-semibold placeholder:text-muted ${
              isUnlimited ? 'border-white/10 text-muted focus:border-orange/70' : 'border-white/10 text-orange focus:border-orange/70'
            }`}
          />
        </label>
        {isChanged && (
          <button
            onClick={onRevert}
            title="Revert to original limit"
            className="orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-full text-muted hover:text-orange"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>
    </div>
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
      <div className="h-9 w-20 rounded-lg bg-white/5" />
    </div>
  );
}
