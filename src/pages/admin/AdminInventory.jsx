import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Boxes, Search, Minus, Plus, ImageOff, AlertTriangle, PackageX, PackageCheck, History, TrendingUp, TrendingDown } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useProducts } from '../../contexts/ProductsContext';
import { setProductStockQty, adjustProductStockQty, subscribeStockMovements } from '../../services/products';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';
import StockHistoryModal from '../../components/admin/StockHistoryModal';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'low', label: 'Low Stock' },
  { key: 'out', label: 'Out of Stock' },
  { key: 'in', label: 'In Stock' },
];

export default function AdminInventory() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { products, loading } = useProducts();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [busyId, setBusyId] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [recentMovements, setRecentMovements] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeStockMovements(
      (data) => {
        setRecentMovements(data);
        setFeedLoading(false);
      },
      () => setFeedLoading(false),
      { max: 12 }
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

  const counts = useMemo(() => {
    const c = { ALL: products.length, low: 0, out: 0, in: 0 };
    products.forEach((p) => {
      c[p.stock] = (c[p.stock] || 0) + 1;
    });
    return c;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products
      .filter((p) => (filter === 'ALL' ? true : p.stock === filter))
      .filter((p) => (!term ? true : [p.name, p.category, p.subcategory].filter(Boolean).join(' ').toLowerCase().includes(term)))
      .sort((a, b) => a.stockQty - b.stockQty);
  }, [products, search, filter]);

  const totalUnits = useMemo(() => products.reduce((sum, p) => sum + (p.stockQty || 0), 0), [products]);
  const stockValue = useMemo(() => products.reduce((sum, p) => sum + (p.stockQty || 0) * (p.sale || 0), 0), [products]);

  const runAdjust = async (product, delta) => {
    setBusyId(product.id);
    try {
      await adjustProductStockQty(product.id, product.stockQty, delta, {
        adminEmail: user?.email || '',
        productName: product.name,
      });
    } catch (err) {
      console.error('Failed to adjust stock', err);
      toast.error("Couldn't update stock. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const runSetQty = async (product, qty) => {
    if (Number.isNaN(qty) || qty === product.stockQty) return;
    setBusyId(product.id);
    try {
      await setProductStockQty(product.id, qty, {
        previousQty: product.stockQty,
        adminEmail: user?.email || '',
        productName: product.name,
      });
      toast.success(`${product.name} stock updated to ${Math.max(0, qty)}`);
    } catch (err) {
      console.error('Failed to update stock', err);
      toast.error("Couldn't update stock. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-16 text-white">
      <AdminSectionHeader
        icon={Boxes}
        title="Inventory & Stock"
        subtitle={`${products.length} ${products.length === 1 ? 'product' : 'products'} · ${totalUnits.toLocaleString('en-IN')} units on hand`}
        email={user?.email}
        onLogout={handleLogout}
      />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6">
        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <SummaryCard icon={Boxes} label="Total Units" value={totalUnits.toLocaleString('en-IN')} className="text-[#f2ece2]" />
          <SummaryCard icon={PackageCheck} label="Stock Value (₹)" value={`₹${stockValue.toLocaleString('en-IN')}`} className="text-[#8fe3a0]" />
          <SummaryCard icon={AlertTriangle} label="Low Stock" value={counts.low || 0} className="text-gold" />
          <SummaryCard icon={PackageX} label="Out of Stock" value={counts.out || 0} className="text-[#e35226]" />
        </div>

        <div className="surface-3d flex items-center gap-2 rounded-xl px-3.5 py-2.5">
          <Search size={14} className="shrink-0 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full bg-transparent text-[12.5px] font-semibold text-[#f2ece2] outline-none placeholder:text-muted placeholder:font-normal"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide transition-colors ${
                filter === key ? 'border-orange/50 bg-orange/15 text-orange' : 'border-white/10 bg-[#0c0906] text-muted'
              }`}
            >
              {label} ({counts[key] ?? 0})
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <InventoryRowSkeleton key={i} />)
          ) : filteredProducts.length === 0 ? (
            <div className="surface-3d rounded-2xl px-4 py-8 text-center text-[12px] text-muted">
              No products found. {search || filter !== 'ALL' ? 'Try clearing your filters.' : ''}
            </div>
          ) : (
            filteredProducts.map((product) => (
              <InventoryRow
                key={product.id}
                product={product}
                busy={busyId === product.id}
                onAdjust={(delta) => runAdjust(product, delta)}
                onSetQty={(qty) => runSetQty(product, qty)}
                onViewHistory={() => setHistoryProduct(product)}
              />
            ))
          )}
        </div>

        {/* Recent stock activity across all products */}
        <div className="surface-3d rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <History size={14} className="text-orange" />
            <h2 className="text-[12.5px] font-extrabold text-[#f2ece2]">Recent Stock Activity</h2>
          </div>
          {feedLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          ) : recentMovements.length === 0 ? (
            <p className="text-[11px] text-muted">No stock changes logged yet. Adjust a quantity above to start the log.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentMovements.map((m) => {
                const up = m.delta > 0;
                return (
                  <div key={m.id} className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-[#0c0906] px-3 py-2">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${up ? 'bg-[#8fe3a0]/10 text-[#8fe3a0]' : 'bg-[#e35226]/10 text-[#e35226]'}`}>
                      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-[#f2ece2]">
                        {m.productName || 'Product'} <span className="text-muted font-semibold">— {m.previousQty} → {m.newQty}</span>
                      </p>
                      <p className="truncate text-[9.5px] font-semibold text-muted">{m.adminEmail || 'admin'}</p>
                    </div>
                    <span className={`shrink-0 text-[10.5px] font-extrabold ${up ? 'text-[#8fe3a0]' : 'text-[#e35226]'}`}>
                      {up ? '+' : ''}
                      {m.delta}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <StockHistoryModal open={!!historyProduct} product={historyProduct} onClose={() => setHistoryProduct(null)} />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, className }) {
  return (
    <div className="surface-3d flex items-center gap-2.5 rounded-xl px-3.5 py-3">
      <span className={`orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-full ${className}`}>
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <div className="truncate text-[13.5px] font-extrabold text-[#f2ece2]">{value}</div>
        <div className="truncate text-[9px] font-semibold text-muted">{label}</div>
      </div>
    </div>
  );
}

function InventoryRow({ product, busy, onAdjust, onSetQty, onViewHistory }) {
  const [draft, setDraft] = useState(String(product.stockQty));
  const [focused, setFocused] = useState(false);

  // Keep the input in sync with live Firestore updates (e.g. the +/-
  // stepper, or another admin editing the same product) — but never while
  // the user is actively typing in it.
  useEffect(() => {
    if (!focused) setDraft(String(product.stockQty));
  }, [product.stockQty, focused]);

  const stockMeta = {
    in: { label: 'In stock', className: 'border-[#8fe3a0]/35 bg-[#8fe3a0]/10 text-[#8fe3a0]' },
    low: { label: 'Low stock', className: 'border-gold/35 bg-gold/10 text-gold' },
    out: { label: 'Out of stock', className: 'border-[#e35226]/35 bg-[#e35226]/10 text-[#e35226]' },
  }[product.stock];

  const commitDraft = () => {
    const qty = Math.max(0, Math.round(Number(draft)));
    if (Number.isNaN(qty)) {
      setDraft(String(product.stockQty));
      return;
    }
    onSetQty(qty);
  };

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
        <span className={`mt-1 inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${stockMeta.className}`}>{stockMeta.label}</span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={onViewHistory}
          className="orb-3d flex h-7 w-7 items-center justify-center !rounded-full text-[#f2ece2] hover:text-orange"
          title="View stock history"
        >
          <History size={12} />
        </button>
        <button
          disabled={busy || product.stockQty <= 0}
          onClick={() => onAdjust(-1)}
          className="orb-3d flex h-7 w-7 items-center justify-center !rounded-full text-[#f2ece2] hover:text-orange disabled:opacity-30"
        >
          <Minus size={12} />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commitDraft();
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          disabled={busy}
          inputMode="numeric"
          className="w-12 rounded-lg border border-white/10 bg-[#0c0906] px-1 py-1.5 text-center text-[12px] font-extrabold text-[#f2ece2] outline-none focus:border-orange/50"
        />
        <button
          disabled={busy}
          onClick={() => onAdjust(1)}
          className="orb-3d flex h-7 w-7 items-center justify-center !rounded-full text-[#f2ece2] hover:text-orange disabled:opacity-30"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

function InventoryRowSkeleton() {
  return (
    <div className="surface-3d flex animate-pulse items-center gap-3 rounded-2xl p-3">
      <div className="h-14 w-14 shrink-0 rounded-xl bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 rounded bg-white/5" />
        <div className="h-2.5 w-1/2 rounded bg-white/5" />
      </div>
      <div className="h-7 w-24 rounded-lg bg-white/5" />
    </div>
  );
}
