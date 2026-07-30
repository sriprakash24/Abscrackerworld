import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '../../firebase/config';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { subscribeAllOrders } from '../../services/ordersFirestore';
import { ADMIN_STATUS_FILTERS } from '../../constants/orderActions';
import AdminOrdersHeader from '../../components/admin/AdminOrdersHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';
import AdminStatsStrip from '../../components/admin/AdminStatsStrip';
import OrderStatusFilterTabs from '../../components/admin/OrderStatusFilterTabs';
import AdminOrderSearchBar from '../../components/admin/AdminOrderSearchBar';
import AdminOrderCard from '../../components/admin/AdminOrderCard';
import AdminOrderCardSkeleton from '../../components/admin/AdminOrderCardSkeleton';
import AdminOrdersEmpty from '../../components/admin/AdminOrdersEmpty';

export default function AdminDashboard() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeAllOrders(
      db,
      (fetched) => {
        setOrders(fetched);
        setLoading(false);
      },
      () => {
        setErrored(true);
        setLoading(false);
      }
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
    const c = { ALL: orders.length };
    for (const status of ADMIN_STATUS_FILTERS) {
      if (status === 'ALL') continue;
      c[status] = orders.filter((o) => o.status === status).length;
    }
    return c;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
      if (!term) return true;
      const haystack = [order.orderId, order.id, order.customer?.name, order.customer?.mobile]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [orders, statusFilter, search]);

  const isFiltered = statusFilter !== 'ALL' || search.trim().length > 0;

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-16 text-white">
      <AdminOrdersHeader email={user?.email} orderCount={orders.length} onLogout={handleLogout} />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6">
        <AdminStatsStrip orders={orders} />

        <AdminOrderSearchBar value={search} onChange={setSearch} />

        <OrderStatusFilterTabs activeStatus={statusFilter} onChange={setStatusFilter} counts={counts} />

        <div className="flex flex-col gap-3">
          {loading ? (
            <>
              <AdminOrderCardSkeleton />
              <AdminOrderCardSkeleton />
              <AdminOrderCardSkeleton />
            </>
          ) : errored ? (
            <div className="surface-3d rounded-2xl px-4 py-6 text-center text-[12px] text-muted">
              Couldn't load orders right now. Please check your connection and try again.
            </div>
          ) : filteredOrders.length === 0 ? (
            <AdminOrdersEmpty
              filtered={isFiltered}
              onClearFilters={() => {
                setStatusFilter('ALL');
                setSearch('');
              }}
            />
          ) : (
            filteredOrders.map((order, i) => <AdminOrderCard key={order.id} order={order} delay={Math.min(i, 8) * 0.04} />)
          )}
        </div>
      </div>
    </div>
  );
}
