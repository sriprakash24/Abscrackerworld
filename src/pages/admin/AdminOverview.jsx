import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  IndianRupee,
  ClipboardList,
  Clock,
  PackageSearch,
  AlertTriangle,
  Users,
  UserPlus,
  TrendingUp,
  CircleCheck,
  Hourglass,
  ArrowUpRight,
  ImageOff,
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useProducts } from '../../contexts/ProductsContext';
import { useAdminData } from '../../contexts/AdminDataContext';
import { getOrderStatusMeta, ORDER_STATUS_META } from '../../constants/orderStatusMeta';
import { getConfirmedDate } from '../../utils/orderDates';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';
import absLogo from '../../assets/abs-logo.png';

function toDateSafe(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}

// Trend charts (orders / invoices / new customers) all share one of these
// windows so the admin can widen the view instead of being stuck on a fixed
// "last 7 days".
const RANGE_OPTIONS = [
  { days: 7, label: '7D' },
  { days: 14, label: '14D' },
  { days: 30, label: '30D' },
];

/** Builds an empty `days` day-by-day scaffold ending today, going back `rangeDays` days. */
function buildDayBuckets(rangeDays) {
  const now = new Date();
  return Array.from({ length: rangeDays }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (rangeDays - 1 - i));
    return {
      date: d,
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      count: 0,
      revenue: 0,
    };
  });
}

function findBucket(days, d) {
  return days.find(
    (day) =>
      d.getFullYear() === day.date.getFullYear() &&
      d.getMonth() === day.date.getMonth() &&
      d.getDate() === day.date.getDate()
  );
}

export default function AdminOverview() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { products, loading: productsLoading } = useProducts();
  const { orders, ordersLoading, users } = useAdminData();
  const [rangeDays, setRangeDays] = useState(7);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login', { replace: true });
    } catch (err) {
      console.error('Logout failed', err);
      toast.error('Could not sign out. Please try again.');
    }
  };

  // ---- Core stats -------------------------------------------------------
  const stats = useMemo(() => {
    const nonCancelled = orders.filter((o) => o.status !== 'CANCELLED');
    const delivered = orders.filter((o) => o.status === 'DELIVERED');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayOrders = orders.filter((o) => {
      const d = toDateSafe(o.createdAt);
      return d && d >= startOfToday;
    });

    const totalRevenue = delivered.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const pipelineOrders = nonCancelled.filter((o) => o.status !== 'DELIVERED');
    const pipelineValue = pipelineOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    // Split the pipeline into what's already confirmed (payment in) vs.
    // still awaiting payment, so "Pipeline Value" isn't just one opaque
    // number — the admin can see how much of it is actually secured.
    const confirmedAmount = pipelineOrders
      .filter((o) => o.paymentStatus === 'RECEIVED')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const awaitingAmount = pipelineOrders
      .filter((o) => o.paymentStatus !== 'RECEIVED')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    return {
      totalRevenue,
      pipelineValue,
      confirmedAmount,
      awaitingAmount,
      totalOrders: orders.length,
      todayOrders: todayOrders.length,
    };
  }, [orders]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock === 'low' || p.stock === 'out').sort((a, b) => a.stockQty - b.stockQty),
    [products]
  );

  // ---- Orders placed, per day, over the selected range --------------------
  const orderTrend = useMemo(() => {
    const days = buildDayBuckets(rangeDays);
    orders.forEach((o) => {
      const d = toDateSafe(o.createdAt);
      if (!d) return;
      const bucket = findBucket(days, d);
      if (bucket) {
        bucket.count += 1;
        if (o.status !== 'CANCELLED') bucket.revenue += o.grandTotal || 0;
      }
    });
    const max = Math.max(1, ...days.map((d) => d.count));
    return { days, max, rangeLabel: `${days[0].label} – ${days[days.length - 1].label}` };
  }, [orders, rangeDays]);

  // ---- Invoices generated / payments confirmed, per day -------------------
  // Bucketed by the *confirmed* date (derived from the invoice number, see
  // getConfirmedDate) rather than the enquiry date, so this reflects when
  // money actually came in — easy to eyeball straight from invoice numbers.
  const invoiceTrend = useMemo(() => {
    const days = buildDayBuckets(rangeDays);
    orders
      .filter((o) => o.invoiceId)
      .forEach((o) => {
        const d = getConfirmedDate(o);
        if (!d) return;
        const bucket = findBucket(days, d);
        if (bucket) {
          bucket.count += 1;
          bucket.revenue += o.grandTotal || 0;
        }
      });
    const max = Math.max(1, ...days.map((d) => d.count));
    return { days, max };
  }, [orders, rangeDays]);

  // ---- New customer profiles captured, per day -----------------------------
  const customerTrend = useMemo(() => {
    const days = buildDayBuckets(rangeDays);
    users.forEach((u) => {
      const d = toDateSafe(u.createdAt);
      if (!d) return;
      const bucket = findBucket(days, d);
      if (bucket) bucket.count += 1;
    });
    const max = Math.max(1, ...days.map((d) => d.count));
    return { days, max };
  }, [users, rangeDays]);

  // ---- Order status breakdown --------------------------------------------
  const statusBreakdown = useMemo(() => {
    const total = orders.length || 1;
    const counts = {};
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return Object.keys(ORDER_STATUS_META)
      .map((status) => ({ status, count: counts[status] || 0, pct: Math.round(((counts[status] || 0) / total) * 100) }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  // ---- Top selling products ------------------------------------------------
  const topProducts = useMemo(() => {
    const nameTaById = new Map(products.map((p) => [p.id, p.nameTa]));
    const tally = new Map();
    orders
      .filter((o) => o.status !== 'CANCELLED')
      .forEach((o) => {
        (o.cartItems || []).forEach((item) => {
          const key = item.productId || item.name;
          const prev =
            tally.get(key) ||
            { name: item.name, nameTa: item.nameTa || nameTaById.get(item.productId) || '', image: item.image, qty: 0, revenue: 0 };
          prev.qty += item.quantity || 0;
          prev.revenue += item.lineTotal || 0;
          tally.set(key, prev);
        });
      });
    return Array.from(tally.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orders, products]);

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);

  const loading = ordersLoading || productsLoading;

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-28 text-white">
      <AdminSectionHeader
        icon={LayoutDashboard}
        title="Overview"
        subtitle="Business summary at a glance"
        email={user?.email}
        onLogout={handleLogout}
      />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6">
        {/* Brand banner */}
        <div className="surface-3d relative flex items-center gap-3.5 overflow-hidden rounded-2xl px-4 py-3.5">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{ background: 'radial-gradient(ellipse at 0% 0%, rgba(255,122,0,0.16) 0%, transparent 65%)' }}
          />
          <img
            src={absLogo}
            alt="ABS Crackers World"
            className="h-12 w-12 shrink-0 object-contain"
            style={{ filter: 'drop-shadow(0 0 10px rgba(255,150,0,.5))' }}
          />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-extrabold tracking-wide text-gradient-gold">ABS Crackers World</p>
            <p className="truncate text-[10.5px] font-semibold text-muted">Festival Fireworks Store · Admin Dashboard</p>
          </div>
        </div>

        {/* Top stat cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatCard icon={IndianRupee} label="Delivered Revenue" value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`} className="text-[#8fe3a0]" loading={loading} />
          <StatCard icon={TrendingUp} label="Pipeline Value" value={`₹${stats.pipelineValue.toLocaleString('en-IN')}`} className="text-orange" loading={loading} />
          <StatCard icon={CircleCheck} label="Confirmed Amount" value={`₹${stats.confirmedAmount.toLocaleString('en-IN')}`} className="text-[#8fe3a0]" loading={loading} />
          <StatCard icon={Hourglass} label="Awaiting Payment" value={`₹${stats.awaitingAmount.toLocaleString('en-IN')}`} className="text-gold" loading={loading} />
          <StatCard icon={ClipboardList} label="Total Orders" value={stats.totalOrders} className="text-[#f2ece2]" loading={loading} />
          <StatCard icon={Clock} label="Today's Orders" value={stats.todayOrders} className="text-gold" loading={loading} />
          <StatCard icon={PackageSearch} label="Products" value={products.length} className="text-[#f2ece2]" loading={loading} />
          <StatCard
            icon={AlertTriangle}
            label="Low / Out of Stock"
            value={lowStockProducts.length}
            className={lowStockProducts.length > 0 ? 'text-[#e35226]' : 'text-[#8fe3a0]'}
            loading={loading}
          />
        </div>

        {/* Shared range selector — drives the orders / invoices / new-customers
            trend charts below, instead of everything being locked to a fixed
            "last 7 days". */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[11.5px] font-extrabold uppercase tracking-wide text-muted">Trends</h2>
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0c0906] p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setRangeDays(opt.days)}
                className={`rounded-full px-3 py-1 text-[10.5px] font-bold transition-colors ${
                  rangeDays === opt.days ? 'bg-gradient-to-b from-orange to-gold text-black' : 'text-muted hover:text-[#cfc7bd]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Orders trend */}
          <div className="surface-3d rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-[12.5px] font-extrabold text-[#f2ece2]">Orders Placed</h2>
                <p className="truncate text-[9.5px] font-semibold text-muted">{orderTrend.rangeLabel}</p>
              </div>
              <Link to="/admin/orders" className="flex shrink-0 items-center gap-1 text-[10.5px] font-bold text-orange hover:underline">
                View <ArrowUpRight size={11} />
              </Link>
            </div>
            <div className="flex items-end justify-between gap-1 px-1" style={{ height: '140px' }}>
              {orderTrend.days.map((day) => (
                <div key={day.label + day.date.getDate()} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[9px] font-bold text-muted">{day.count > 0 ? day.count : ''}</span>
                  <div
                    className="w-full max-w-[22px] rounded-t-md bg-gradient-to-t from-orange/70 to-gold/70"
                    style={{ height: `${Math.max(4, (day.count / orderTrend.max) * 100)}px` }}
                  />
                  {rangeDays <= 14 && <span className="text-[8.5px] font-semibold text-muted">{day.label}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Invoices / confirmed-payment trend */}
          <div className="surface-3d rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-[12.5px] font-extrabold text-[#f2ece2]">Invoices Generated</h2>
                <p className="truncate text-[9.5px] font-semibold text-muted">Payments confirmed, by date</p>
              </div>
              <Link to="/admin/invoices" className="flex shrink-0 items-center gap-1 text-[10.5px] font-bold text-orange hover:underline">
                View <ArrowUpRight size={11} />
              </Link>
            </div>
            <div className="flex items-end justify-between gap-1 px-1" style={{ height: '140px' }}>
              {invoiceTrend.days.map((day) => (
                <div key={day.label + day.date.getDate()} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[9px] font-bold text-muted">{day.count > 0 ? day.count : ''}</span>
                  <div
                    className="w-full max-w-[22px] rounded-t-md bg-gradient-to-t from-[#3fae5c]/70 to-[#8fe3a0]/70"
                    style={{ height: `${Math.max(4, (day.count / invoiceTrend.max) * 100)}px` }}
                  />
                  {rangeDays <= 14 && <span className="text-[8.5px] font-semibold text-muted">{day.label}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="surface-3d rounded-2xl p-4">
            <h2 className="mb-3 text-[12.5px] font-extrabold text-[#f2ece2]">Order Status Breakdown</h2>
            {statusBreakdown.length === 0 ? (
              <p className="text-[11px] text-muted">No orders yet.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {statusBreakdown.map(({ status, count, pct }) => {
                  const meta = getOrderStatusMeta(status);
                  return (
                    <div key={status}>
                      <div className="mb-1 flex items-center justify-between text-[10.5px] font-bold">
                        <span className="text-[#f2ece2]">
                          {meta.emoji} {meta.label}
                        </span>
                        <span className="text-muted">{count}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--color-orange), var(--color-gold))' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Top products */}
          <div className="surface-3d rounded-2xl p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[12.5px] font-extrabold text-[#f2ece2]">Top Selling Products</h2>
              <Link to="/admin/products" className="flex items-center gap-1 text-[10.5px] font-bold text-orange hover:underline">
                Manage products <ArrowUpRight size={11} />
              </Link>
            </div>
            {topProducts.length === 0 ? (
              <p className="text-[11px] text-muted">No sales recorded yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {topProducts.map((p, i) => (
                  <div key={p.name + i} className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-[#0c0906] px-3 py-2">
                    <span className="orb-3d flex h-6 w-6 shrink-0 items-center justify-center !rounded-full text-[10px] font-extrabold text-gold">{i + 1}</span>
                    <div className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden !rounded-lg">
                      {p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" /> : <ImageOff size={12} className="text-muted" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-bold text-[#f2ece2]">{p.name}</p>
                      {p.nameTa && (
                        <p className="truncate text-[10px] font-semibold text-gold">{p.nameTa}</p>
                      )}
                      <p className="text-[10px] font-semibold text-muted">{p.qty} sold · ₹{p.revenue.toLocaleString('en-IN')} revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low stock alerts */}
          <div className="surface-3d rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[12.5px] font-extrabold text-[#f2ece2]">Stock Alerts</h2>
              <Link to="/admin/inventory" className="flex items-center gap-1 text-[10.5px] font-bold text-orange hover:underline">
                Manage <ArrowUpRight size={11} />
              </Link>
            </div>
            {lowStockProducts.length === 0 ? (
              <p className="text-[11px] text-muted">All products are sufficiently stocked. 🎉</p>
            ) : (
              <div className="flex flex-col gap-2">
                {lowStockProducts.slice(0, 6).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-[#0c0906] px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-bold text-[#f2ece2]">{p.name}</span>
                      {p.nameTa && (
                        <span className="block truncate text-[9.5px] font-semibold text-gold">{p.nameTa}</span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${
                        p.stock === 'out' ? 'border-[#e35226]/35 bg-[#e35226]/10 text-[#e35226]' : 'border-gold/35 bg-gold/10 text-gold'
                      }`}
                    >
                      {p.stockQty} left
                    </span>
                  </div>
                ))}
                {lowStockProducts.length > 6 && (
                  <p className="text-center text-[10px] font-semibold text-muted">+{lowStockProducts.length - 6} more</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Recent orders */}
          <div className="surface-3d rounded-2xl p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[12.5px] font-extrabold text-[#f2ece2]">Recent Orders</h2>
              <Link to="/admin/orders" className="flex items-center gap-1 text-[10.5px] font-bold text-orange hover:underline">
                View all <ArrowUpRight size={11} />
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="text-[11px] text-muted">No orders placed yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentOrders.map((o) => {
                  const meta = getOrderStatusMeta(o.status);
                  return (
                    <div key={o.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-[#0c0906] px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-[11.5px] font-bold text-[#f2ece2]">{o.orderId || o.id}</p>
                        <p className="truncate text-[10px] font-semibold text-muted">{o.customer?.name} · ₹{(o.grandTotal || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${meta.className}`}>{meta.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Customers — total captured profiles plus a day-wise view of how
              many new ones showed up, instead of just a flat, out-of-context
              count. */}
          <div className="surface-3d rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[12.5px] font-extrabold text-[#f2ece2]">Customers</h2>
              <Link to="/admin/users" className="flex items-center gap-1 text-[10.5px] font-bold text-orange hover:underline">
                View all <ArrowUpRight size={11} />
              </Link>
            </div>
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/5 bg-[#0c0906] px-3.5 py-3">
              <span className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-orange">
                <Users size={15} />
              </span>
              <div>
                <p className="text-[16px] font-extrabold text-[#f2ece2]">{users.length}</p>
                <p className="text-[10px] font-semibold text-muted">captured customer profiles</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 rounded-full border border-[#8fe3a0]/30 bg-[#8fe3a0]/10 px-2 py-1 text-[10px] font-bold text-[#8fe3a0]">
                <UserPlus size={11} />
                {customerTrend.days.reduce((sum, d) => sum + d.count, 0)} new
              </div>
            </div>
            <p className="mb-1.5 text-[9.5px] font-semibold text-muted">New customers, day-wise</p>
            <div className="flex items-end justify-between gap-1 px-1" style={{ height: '90px' }}>
              {customerTrend.days.map((day) => (
                <div key={day.label + day.date.getDate()} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[8.5px] font-bold text-muted">{day.count > 0 ? day.count : ''}</span>
                  <div
                    className="w-full max-w-[18px] rounded-t-md bg-gradient-to-t from-orange/70 to-gold/70"
                    style={{ height: `${Math.max(3, (day.count / customerTrend.max) * 100)}px` }}
                  />
                  {rangeDays <= 14 && <span className="text-[8px] font-semibold text-muted">{day.label}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, className, loading }) {
  return (
    <div className="surface-3d flex items-center gap-2.5 rounded-xl px-3 py-3">
      <span className={`orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-full ${className}`}>
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <div className="truncate text-[13.5px] font-extrabold text-[#f2ece2]">{loading ? '—' : value}</div>
        <div className="truncate text-[9px] font-semibold text-muted">{label}</div>
      </div>
    </div>
  );
}
