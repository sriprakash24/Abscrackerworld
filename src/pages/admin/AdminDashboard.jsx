import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Layers2, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAdminData } from '../../contexts/AdminDataContext';
import { ADMIN_STATUS_FILTERS } from '../../constants/orderActions';
import { db } from '../../firebase/config';
import { orderMergeKeyForMobile, setOrderMergeToggle } from '../../services/orderMergeFirestore';
import AdminOrdersHeader from '../../components/admin/AdminOrdersHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';
import AdminStatsStrip from '../../components/admin/AdminStatsStrip';
import OrderStatusFilterTabs from '../../components/admin/OrderStatusFilterTabs';
import WhatsappStatusFilter from '../../components/admin/WhatsappStatusFilter';
import OrderDateFilter from '../../components/admin/OrderDateFilter';
import AdminOrderSearchBar from '../../components/admin/AdminOrderSearchBar';
import AdminOrderCard from '../../components/admin/AdminOrderCard';
import AdminOrderCardSkeleton from '../../components/admin/AdminOrderCardSkeleton';
import AdminOrdersEmpty from '../../components/admin/AdminOrdersEmpty';
import MergedEstimateCard from '../../components/admin/MergedEstimateCard';
import { getWhatsappSendStatus } from '../../utils/whatsappSendStatus';
import { getConfirmedDate, toDateInputValue } from '../../utils/orderDates';

/**
 * Groups orders for display: any two-or-more AWAITING_ADMIN_CONFIRMATION
 * orders sharing a mobile number become a "cluster" (candidate for merging
 * into a single estimate bill — see MergedEstimateCard). Everything else,
 * including a lone AWAITING order or any order past that stage, renders as
 * its own single card, exactly as before. Order of the incoming list
 * (newest first) is preserved — a cluster is placed where its first/newest
 * member would have appeared.
 */
function buildOrderGroups(list) {
  const seen = new Set();
  const groups = [];
  for (const order of list) {
    if (seen.has(order.id)) continue;
    const mobile = order.customer?.mobile;
    if (order.status === 'AWAITING_ADMIN_CONFIRMATION' && mobile) {
      const siblings = list.filter(
        (o) => !seen.has(o.id) && o.status === 'AWAITING_ADMIN_CONFIRMATION' && o.customer?.mobile === mobile,
      );
      if (siblings.length > 1) {
        siblings.forEach((o) => seen.add(o.id));
        groups.push({ type: 'cluster', mobile, orders: siblings });
        continue;
      }
    }
    seen.add(order.id);
    groups.push({ type: 'single', order });
  }
  return groups;
}

/** Small banner offering to combine a not-yet-merged cluster's estimate
 * bills into one — sits above that cluster's individual order cards. */
function MergeSuggestionBanner({ mobile, count, onMerge, merging }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-orange/40 bg-orange/5 px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-bold text-orange">
        <Layers2 size={14} />
        {count} orders from this number — combine into one estimate bill?
      </div>
      <button
        onClick={onMerge}
        disabled={merging}
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#e35226] to-[#b8391a] px-3.5 py-2 text-[10.5px] font-bold text-white disabled:opacity-50"
      >
        {merging ? <Loader2 size={12} className="animate-spin" /> : <Layers2 size={12} />}
        Merge
      </button>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  const { orders, ordersLoading: loading, ordersError, orderMergeProgress } = useAdminData();
  const errored = !!ordersError;
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [whatsappFilter, setWhatsappFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState([]);
  const [search, setSearch] = useState('');
  const [mergingMobile, setMergingMobile] = useState(null);

  const handleMerge = async (mobile) => {
    setMergingMobile(mobile);
    try {
      await setOrderMergeToggle(db, mobile, true);
      toast.success('Merged into one estimate bill');
    } catch (err) {
      console.error('Failed to merge orders', err);
      toast.error("Couldn't merge those orders. Please try again.");
    } finally {
      setMergingMobile(null);
    }
  };
  // The input itself stays bound to `search` so typing never feels
  // laggy — only the (potentially expensive, on a long order list)
  // re-filtering below is allowed to lag a beat behind keystrokes.
  const deferredSearch = useDeferredValue(search);

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

  // Counts for the WhatsApp-sent filter — computed from the full order list
  // (same spirit as `counts` above) so they stay stable regardless of which
  // status tab or search term is currently active.
  const whatsappCounts = useMemo(() => {
    const c = { ALL: orders.length, SENT: 0, PENDING: 0 };
    for (const order of orders) {
      const status = getWhatsappSendStatus(order);
      if (status === 'SENT') c.SENT += 1;
      else if (status === 'PENDING') c.PENDING += 1;
    }
    return c;
  }, [orders]);

  // Same calendar-with-counts pattern as the Packing/Delivery pages — how
  // many orders fall on each date, counted after search/status/WhatsApp
  // narrow the set but before the date filter itself, so ticking one date
  // doesn't hide the others' counts.
  const dateOptions = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    const counts_ = new Map();
    for (const order of orders) {
      if (statusFilter !== 'ALL' && order.status !== statusFilter) continue;
      if (whatsappFilter !== 'ALL' && getWhatsappSendStatus(order) !== whatsappFilter) continue;
      if (term) {
        const haystack = [order.orderId, order.id, order.customer?.name, order.customer?.mobile]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) continue;
      }
      const confirmed = getConfirmedDate(order);
      if (!confirmed) continue;
      const value = toDateInputValue(confirmed);
      counts_.set(value, (counts_.get(value) || 0) + 1);
    }
    return Array.from(counts_.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([value, count]) => {
        const [y, m, d] = value.split('-').map(Number);
        const label = new Date(y, m - 1, d).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        return { value, label, count };
      });
  }, [orders, deferredSearch, statusFilter, whatsappFilter]);

  const filteredOrders = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    const dateSet = new Set(dateFilter);
    return orders.filter((order) => {
      if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
      if (whatsappFilter !== 'ALL' && getWhatsappSendStatus(order) !== whatsappFilter) return false;
      if (dateSet.size) {
        const confirmed = getConfirmedDate(order);
        if (!confirmed || !dateSet.has(toDateInputValue(confirmed))) return false;
      }
      if (!term) return true;
      const haystack = [order.orderId, order.id, order.customer?.name, order.customer?.mobile]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [orders, statusFilter, whatsappFilter, dateFilter, deferredSearch]);

  const orderGroups = useMemo(() => buildOrderGroups(filteredOrders), [filteredOrders]);

  const isFiltered =
    statusFilter !== 'ALL' || whatsappFilter !== 'ALL' || dateFilter.length > 0 || search.trim().length > 0;

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-28 text-white">
      <AdminOrdersHeader email={user?.email} orderCount={orders.length} onLogout={handleLogout} />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6">
        <AdminStatsStrip orders={orders} />

        {/* Sticky so the admin can always search/filter without scrolling
            back up, even deep into a long order list. */}
        <div className="sticky top-16 z-20 -mx-4 bg-[#050505]/95 px-4 pb-2 pt-1 backdrop-blur-sm sm:-mx-6 sm:px-6">
          <AdminOrderSearchBar value={search} onChange={setSearch} />
        </div>

        <OrderStatusFilterTabs activeStatus={statusFilter} onChange={setStatusFilter} counts={counts} />

        <div className="flex flex-wrap items-center gap-2">
          <WhatsappStatusFilter active={whatsappFilter} onChange={setWhatsappFilter} counts={whatsappCounts} />
          <OrderDateFilter options={dateOptions} selected={dateFilter} onChange={setDateFilter} />
        </div>

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
                setWhatsappFilter('ALL');
                setDateFilter([]);
                setSearch('');
              }}
            />
          ) : (
            orderGroups.map((group, i) => {
              const delay = Math.min(i, 8) * 0.04;
              if (group.type === 'single') {
                return (
                  <AdminOrderCard key={group.order.id} order={group.order} delay={delay} index={i} />
                );
              }
              const merged = !!orderMergeProgress[orderMergeKeyForMobile(group.mobile)]?.merged;
              if (merged) {
                return (
                  <MergedEstimateCard
                    key={`cluster:${group.mobile}`}
                    mobile={group.mobile}
                    orders={group.orders}
                    delay={delay}
                  />
                );
              }
              return (
                <div key={`cluster:${group.mobile}`} className="flex flex-col gap-3">
                  <MergeSuggestionBanner
                    mobile={group.mobile}
                    count={group.orders.length}
                    onMerge={() => handleMerge(group.mobile)}
                    merging={mergingMobile === group.mobile}
                  />
                  {group.orders.map((order, j) => (
                    <AdminOrderCard key={order.id} order={order} delay={delay} index={i + j} />
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
