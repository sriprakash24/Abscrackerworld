import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BarChart3, Search, ImageOff, Clock3, CheckCircle2, Layers, Download } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAdminData } from '../../contexts/AdminDataContext';
import { useProducts } from '../../contexts/ProductsContext';
import { ORDER_FLOW } from '../../constants/orderActions';
import { getOrderStatusMeta } from '../../constants/orderStatusMeta';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';
import ProductInsightsDownloadModal from '../../components/admin/ProductInsightsDownloadModal';
import { generateProductInsightsPdf } from '../../utils/generateProductInsightsPdf';

// Every status from AWAITING_ADMIN_CONFIRMATION onward, except the awaiting
// stage itself — i.e. "payment confirmed, order is progressing" statuses.
const CONFIRMED_STATUSES = ORDER_FLOW.filter((s) => s !== 'AWAITING_ADMIN_CONFIRMATION');

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'AWAITING', label: 'Has Awaiting' },
  { key: 'CONFIRMED', label: 'Has Confirmed' },
  { key: 'NONE', label: 'No Orders Yet' },
];

export default function AdminProductInsights() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { orders, ordersLoading } = useAdminData();
  const { products, loading: productsLoading } = useProducts();
  const loading = ordersLoading || productsLoading;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [downloadOpen, setDownloadOpen] = useState(false);

  // Per-product aggregation, keyed by productId, built once from every
  // order's cartItems. Falls back to the order's line-item snapshot
  // (name/img/category) for products that may since have been deleted.
  const statsByProductId = useMemo(() => {
    const map = new Map();
    for (const order of orders) {
      const status = order.status;
      const bucket = status === 'CANCELLED' ? 'cancelled' : status === 'AWAITING_ADMIN_CONFIRMATION' ? 'awaiting' : CONFIRMED_STATUSES.includes(status) ? 'confirmed' : null;
      if (!bucket) continue;

      for (const item of order.cartItems || []) {
        if (!item.productId) continue;
        if (!map.has(item.productId)) {
          map.set(item.productId, {
            productId: item.productId,
            name: item.name,
            img: item.image,
            category: item.category,
            awaitingQty: 0,
            awaitingOrders: new Set(),
            confirmedQty: 0,
            confirmedOrders: new Set(),
            cancelledQty: 0,
            cancelledOrders: new Set(),
          });
        }
        const entry = map.get(item.productId);
        entry[`${bucket}Qty`] += item.quantity || 0;
        entry[`${bucket}Orders`].add(order.id);
      }
    }
    return map;
  }, [orders]);

  // Merge with the live catalog so products never ordered still show up
  // (with zero counts), using the catalog's current name/image/category.
  const rows = useMemo(() => {
    const seen = new Set();
    const fromCatalog = products.map((p) => {
      seen.add(p.id);
      const stat = statsByProductId.get(p.id);
      return {
        productId: p.id,
        name: p.name,
        img: p.img,
        category: p.category,
        awaitingQty: stat?.awaitingQty || 0,
        awaitingOrders: stat?.awaitingOrders.size || 0,
        confirmedQty: stat?.confirmedQty || 0,
        confirmedOrders: stat?.confirmedOrders.size || 0,
        cancelledQty: stat?.cancelledQty || 0,
      };
    });
    // Any ordered product no longer in the live catalog (e.g. deleted) still shows, using its order snapshot.
    const fromOrdersOnly = [...statsByProductId.values()]
      .filter((s) => !seen.has(s.productId))
      .map((s) => ({
        productId: s.productId,
        name: s.name,
        img: s.img,
        category: s.category,
        awaitingQty: s.awaitingQty,
        awaitingOrders: s.awaitingOrders.size,
        confirmedQty: s.confirmedQty,
        confirmedOrders: s.confirmedOrders.size,
        cancelledQty: s.cancelledQty,
      }));

    return [...fromCatalog, ...fromOrdersOnly].map((r) => ({
      ...r,
      totalQty: r.awaitingQty + r.confirmedQty,
      totalOrders: r.awaitingOrders + r.confirmedOrders,
    }));
  }, [products, statsByProductId]);

  const counts = useMemo(() => {
    const c = { ALL: rows.length, AWAITING: 0, CONFIRMED: 0, NONE: 0 };
    rows.forEach((r) => {
      if (r.awaitingQty > 0) c.AWAITING += 1;
      if (r.confirmedQty > 0) c.CONFIRMED += 1;
      if (r.totalQty === 0) c.NONE += 1;
    });
    return c;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filter === 'AWAITING') return r.awaitingQty > 0;
        if (filter === 'CONFIRMED') return r.confirmedQty > 0;
        if (filter === 'NONE') return r.totalQty === 0;
        return true;
      })
      .filter((r) => (!term ? true : [r.name, r.category].filter(Boolean).join(' ').toLowerCase().includes(term)))
      .sort((a, b) => b.totalQty - a.totalQty || a.name.localeCompare(b.name));
  }, [rows, search, filter]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          awaitingQty: acc.awaitingQty + r.awaitingQty,
          confirmedQty: acc.confirmedQty + r.confirmedQty,
          productsOrdered: acc.productsOrdered + (r.totalQty > 0 ? 1 : 0),
        }),
        { awaitingQty: 0, confirmedQty: 0, productsOrdered: 0 }
      ),
    [rows]
  );

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login', { replace: true });
    } catch (err) {
      console.error('Logout failed', err);
      toast.error('Could not sign out. Please try again.');
    }
  };

  const handleDownload = ({ includeAwaiting, includeConfirmed, includeCancelled, metric, scope }) => {
    try {
      const reportRows = scope === 'filtered' ? filteredRows : rows;
      const scopeLabel =
        scope === 'filtered'
          ? `Scope: Current filtered list (${reportRows.length} of ${rows.length} products)`
          : `Scope: All products (${reportRows.length})`;
      const filterLabel = search.trim() || filter !== 'ALL'
        ? `Filters applied on-screen: ${filter !== 'ALL' ? FILTERS.find((f) => f.key === filter)?.label : 'All'}${search.trim() ? ` · Search: "${search.trim()}"` : ''}`
        : null;

      generateProductInsightsPdf(
        reportRows,
        { includeAwaiting, includeConfirmed, includeCancelled, metric },
        { scopeLabel, filterLabel }
      );
      toast.success('Report downloaded');
    } catch (err) {
      console.error('Failed to generate product insights PDF', err);
      toast.error("Couldn't generate the report. Please try again.");
    }
  };

  const awaitingMeta = getOrderStatusMeta('AWAITING_ADMIN_CONFIRMATION');
  const confirmedMeta = getOrderStatusMeta('CONFIRMED');

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-28 text-white">
      <AdminSectionHeader
        icon={BarChart3}
        title="Product Order Insights"
        subtitle={`${counts.ALL} products · ${totals.productsOrdered} with orders`}
        email={user?.email}
        onLogout={handleLogout}
      />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <SummaryCard icon={Clock3} label="Awaiting Confirmation (units)" value={totals.awaitingQty.toLocaleString('en-IN')} className="text-gold" />
          <SummaryCard icon={CheckCircle2} label="Confirmed (units)" value={totals.confirmedQty.toLocaleString('en-IN')} className="text-[#8fe3a0]" />
          <SummaryCard icon={Layers} label="Products With Orders" value={totals.productsOrdered.toLocaleString('en-IN')} className="text-orange" />
        </div>

        <button
          onClick={() => setDownloadOpen(true)}
          className="btn-3d flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12.5px] font-bold text-white sm:w-auto sm:self-end sm:px-5"
        >
          <Download size={14} />
          Download Report
        </button>

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
            Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)
          ) : filteredRows.length === 0 ? (
            <div className="surface-3d rounded-2xl px-4 py-8 text-center text-[12px] text-muted">
              No products found. {search || filter !== 'ALL' ? 'Try clearing your filters.' : ''}
            </div>
          ) : (
            filteredRows.map((row) => <ProductInsightRow key={row.productId} row={row} awaitingMeta={awaitingMeta} confirmedMeta={confirmedMeta} />)
          )}
        </div>
      </div>

      <ProductInsightsDownloadModal
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        onDownload={handleDownload}
        filteredCount={filteredRows.length}
        totalCount={rows.length}
        isFiltered={search.trim().length > 0 || filter !== 'ALL'}
      />
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

function ProductInsightRow({ row, awaitingMeta, confirmedMeta }) {
  return (
    <div className="surface-3d flex items-center gap-3 rounded-2xl p-3">
      <div className="orb-3d flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden !rounded-xl">
        {row.img ? (
          <img src={row.img} alt={row.name} className="h-full w-full object-cover" />
        ) : (
          <ImageOff size={16} className="text-muted" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-bold text-[#f2ece2]">{row.name}</p>
        <p className="truncate text-[10.5px] font-semibold text-muted">{row.category || 'Uncategorized'}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${awaitingMeta.className}`}>
            Awaiting: {row.awaitingQty} ({row.awaitingOrders} {row.awaitingOrders === 1 ? 'order' : 'orders'})
          </span>
          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${confirmedMeta.className}`}>
            Confirmed: {row.confirmedQty} ({row.confirmedOrders} {row.confirmedOrders === 1 ? 'order' : 'orders'})
          </span>
          {row.cancelledQty > 0 && (
            <span className="rounded-full border border-[#e35226]/40 bg-[#e35226]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#e35226]">
              Cancelled: {row.cancelledQty}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-[15px] font-extrabold text-[#f2ece2]">{row.totalQty}</div>
        <div className="text-[9px] font-semibold text-muted">
          units · {row.totalOrders} {row.totalOrders === 1 ? 'order' : 'orders'}
        </div>
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="surface-3d flex animate-pulse items-center gap-3 rounded-2xl p-3">
      <div className="h-14 w-14 shrink-0 rounded-xl bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 rounded bg-white/5" />
        <div className="h-2.5 w-1/2 rounded bg-white/5" />
      </div>
      <div className="h-7 w-16 rounded-lg bg-white/5" />
    </div>
  );
}
