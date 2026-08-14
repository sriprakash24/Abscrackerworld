import { useEffect, useMemo, useState } from 'react';
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
  TrendingUp,
  ArrowUpRight,
  ImageOff,
} from 'lucide-react';
import { db } from '../../firebase/config';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useProducts } from '../../contexts/ProductsContext';
import { subscribeAllOrders } from '../../services/ordersFirestore';
import { subscribeAllUsers } from '../../services/usersFirestore';
import { getOrderStatusMeta, ORDER_STATUS_META } from '../../constants/orderStatusMeta';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';

function toDateSafe(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}

export default function AdminOverview() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { products, loading: productsLoading } = useProducts();

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeAllOrders(
      db,
      (fetched) => {
        setOrders(fetched);
        setOrdersLoading(false);
      },
      () => setOrdersLoading(false)
    );
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAllUsers(db, setUsers, () => {});
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
    const pipelineValue = nonCancelled
      .filter((o) => o.status !== 'DELIVERED')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    return {
      totalRevenue,
      pipelineValue,
      totalOrders: orders.length,
      todayOrders: todayOrders.length,
    };
  }, [orders]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock === 'low' || p.stock === 'out').sort((a, b) => a.stockQty - b.stockQty),
    [products]
  );

  // ---- Last 7 days order volume ------------------------------------------
  const last7Days = useMemo(() => {
    const now = new Date();
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
      return { date: d, label: d.toLocaleDateString('en-IN', { weekday: 'short' }), count: 0, revenue: 0 };
    });

    orders.forEach((o) => {
      const d = toDateSafe(o.createdAt);
      if (!d) return;
      const bucket = days.find(
        (day) =>
          d.getFullYear() === day.date.getFullYear() &&
          d.getMonth() === day.date.getMonth() &&
          d.getDate() === day.date.getDate()
      );
      if (bucket) {
        bucket.count += 1;
        if (o.status !== 'CANCELLED') bucket.revenue += o.grandTotal || 0;
      }
    });

    const max = Math.max(1, ...days.map((d) => d.count));
    return { days, max };
  }, [orders]);

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
    <div className="min-h-screen w-full bg-[#050505] pb-16 text-white">
      <AdminSectionHeader
        icon={LayoutDashboard}
        title="Overview"
        subtitle="Business summary at a glance"
        email={user?.email}
        onLogout={handleLogout}
      />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6">
        {/* Top stat cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={IndianRupee} label="Delivered Revenue" value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`} className="text-[#8fe3a0]" loading={loading} />
          <StatCard icon={TrendingUp} label="Pipeline Value" value={`₹${stats.pipelineValue.toLocaleString('en-IN')}`} className="text-orange" loading={loading} />
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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Orders trend */}
          <div className="surface-3d rounded-2xl p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[12.5px] font-extrabold text-[#f2ece2]">Orders — Last 7 Days</h2>
              <Link to="/admin/orders" className="flex items-center gap-1 text-[10.5px] font-bold text-orange hover:underline">
                View orders <ArrowUpRight size={11} />
              </Link>
            </div>
            <div className="flex items-end justify-between gap-2 px-1" style={{ height: '140px' }}>
              {last7Days.days.map((day) => (
                <div key={day.label + day.date.getDate()} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[9.5px] font-bold text-muted">{day.count > 0 ? day.count : ''}</span>
                  <div
                    className="w-full max-w-[26px] rounded-t-md bg-gradient-to-t from-orange/70 to-gold/70"
                    style={{ height: `${Math.max(4, (day.count / last7Days.max) * 100)}px` }}
                  />
                  <span className="text-[9.5px] font-semibold text-muted">{day.label}</span>
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

          {/* Customers */}
          <div className="surface-3d rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[12.5px] font-extrabold text-[#f2ece2]">Customers</h2>
              <Link to="/admin/users" className="flex items-center gap-1 text-[10.5px] font-bold text-orange hover:underline">
                View all <ArrowUpRight size={11} />
              </Link>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#0c0906] px-3.5 py-4">
              <span className="orb-3d flex h-10 w-10 shrink-0 items-center justify-center !rounded-full text-orange">
                <Users size={17} />
              </span>
              <div>
                <p className="text-[18px] font-extrabold text-[#f2ece2]">{users.length}</p>
                <p className="text-[10.5px] font-semibold text-muted">captured customer profiles</p>
              </div>
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
