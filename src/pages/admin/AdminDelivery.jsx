import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PackageSearch } from "lucide-react";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { useAdminData } from "../../contexts/AdminDataContext";
import AdminOrdersHeader from "../../components/admin/AdminOrdersHeader";
import AdminTabsNav from "../../components/admin/AdminTabsNav";
import AdminOrderCardSkeleton from "../../components/admin/AdminOrderCardSkeleton";
import PackingSearchFilterBar from "../../components/admin/PackingSearchFilterBar";
import PackingInvoiceDateFilter from "../../components/admin/PackingInvoiceDateFilter";
import DeliveryClusterCard from "../../components/admin/DeliveryClusterCard";
import { db } from "../../firebase/config";
import { markOrdersDelivered } from "../../services/ordersFirestore";
import { useNavigate } from "react-router-dom";
import {
  getConfirmedDate,
  confirmedDateMillis,
  formatConfirmedDate,
  toDateInputValue,
} from "../../utils/orderDates";

// Orders land here once packing is done. Both PACKED and OUT_FOR_DELIVERY
// are treated as "ready to deliver" — the admin never has to separately
// tap an "out for delivery" step, "Mark Delivered" jumps straight to
// DELIVERED regardless of which of the two it's currently in.
const DELIVERY_STATUSES = ["PACKED", "OUT_FOR_DELIVERY"];

/** Groups deliverable orders by customer mobile, oldest-confirmed-first — same shape/sort as Packing's clusters, minus the merge/checklist machinery that only packing needs. */
function buildDeliveryClusters(orders) {
  const byMobile = new Map();
  for (const order of orders) {
    const mobile = order.customer?.mobile || order.id;
    if (!byMobile.has(mobile)) byMobile.set(mobile, []);
    byMobile.get(mobile).push(order);
  }

  const clusters = [];
  for (const [mobile, groupOrders] of byMobile.entries()) {
    const sorted = [...groupOrders].sort(
      (a, b) => confirmedDateMillis(a) - confirmedDateMillis(b),
    );
    const earliest = sorted[0];
    clusters.push({
      mobile,
      customerName: earliest.customer?.name || "Unnamed customer",
      earliestConfirmedLabel: formatConfirmedDate(earliest),
      earliestConfirmedMillis: confirmedDateMillis(earliest),
      address: earliest.address || null,
      orders: sorted,
    });
  }

  return clusters.sort((a, b) => a.earliestConfirmedMillis - b.earliestConfirmedMillis);
}

export default function AdminDelivery() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { orders, ordersLoading: loading, ordersError } = useAdminData();

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [invoiceDateFilter, setInvoiceDateFilter] = useState([]);
  const [markingKey, setMarkingKey] = useState(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin/login", { replace: true });
    } catch (err) {
      console.error("Logout failed", err);
      toast.error("Could not sign out. Please try again.");
    }
  };

  const deliverableOrders = useMemo(
    () => orders.filter((o) => DELIVERY_STATUSES.includes(o.status)),
    [orders],
  );

  const locationOptions = useMemo(() => {
    const byKey = new Map();
    for (const order of deliverableOrders) {
      const raw = (order.address?.district || order.address?.city || "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, raw);
    }
    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
  }, [deliverableOrders]);

  const invoiceDateOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    const counts = new Map();
    for (const order of deliverableOrders) {
      if (locationFilter) {
        const label = (order.address?.district || order.address?.city || "").trim();
        if (label.toLowerCase() !== locationFilter.toLowerCase()) continue;
      }
      if (term) {
        const haystack = [order.orderId, order.id, order.customer?.name, order.customer?.mobile]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) continue;
      }
      const confirmed = getConfirmedDate(order);
      if (!confirmed) continue;
      const value = toDateInputValue(confirmed);
      counts.set(value, (counts.get(value) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([value, count]) => {
        const [y, m, d] = value.split("-").map(Number);
        const label = new Date(y, m - 1, d).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        return { value, label, count };
      });
  }, [deliverableOrders, search, locationFilter]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    const invoiceDateSet = new Set(invoiceDateFilter);
    return deliverableOrders.filter((order) => {
      if (dateFilter) {
        const confirmed = getConfirmedDate(order);
        if (!confirmed || toDateInputValue(confirmed) !== dateFilter) return false;
      }
      if (invoiceDateSet.size) {
        const confirmed = getConfirmedDate(order);
        if (!confirmed || !invoiceDateSet.has(toDateInputValue(confirmed))) return false;
      }
      if (locationFilter) {
        const label = (order.address?.district || order.address?.city || "").trim();
        if (label.toLowerCase() !== locationFilter.toLowerCase()) return false;
      }
      if (!term) return true;
      const haystack = [order.orderId, order.id, order.customer?.name, order.customer?.mobile]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [deliverableOrders, search, dateFilter, invoiceDateFilter, locationFilter]);

  const clusters = useMemo(() => buildDeliveryClusters(filteredOrders), [filteredOrders]);
  const isFiltered = !!search || !!dateFilter || !!locationFilter || invoiceDateFilter.length > 0;

  const handleMarkDelivered = async (order) => {
    setMarkingKey(`order:${order.id}`);
    try {
      await markOrdersDelivered(db, [order.id]);
      toast.success(`${order.orderId || "Order"} marked delivered`);
    } catch (err) {
      console.error("Failed to mark order delivered", err);
      toast.error("Couldn't update the order. Please try again.");
    } finally {
      setMarkingKey(null);
    }
  };

  const handleMarkAllDelivered = async (cluster) => {
    setMarkingKey(`cluster:${cluster.mobile}`);
    try {
      await markOrdersDelivered(db, cluster.orders.map((o) => o.id));
      toast.success(`${cluster.orders.length} orders marked delivered`);
    } catch (err) {
      console.error("Failed to mark orders delivered", err);
      toast.error("Couldn't update the orders. Please try again.");
    } finally {
      setMarkingKey(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-28 text-white">
      <AdminOrdersHeader
        email={user?.email}
        orderCount={deliverableOrders.length}
        onLogout={handleLogout}
      />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-extrabold text-[#f2ece2]">Delivery</h2>
          <p className="text-[11px] text-muted">
            Packed orders ready to go out, sorted by actual payment-confirmed
            date — oldest first.
          </p>
        </div>

        <PackingSearchFilterBar
          search={search}
          onSearchChange={setSearch}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          locationFilter={locationFilter}
          onLocationFilterChange={setLocationFilter}
          locationOptions={locationOptions}
        />

        <div className="-mt-1 flex flex-wrap gap-2">
          <PackingInvoiceDateFilter
            options={invoiceDateOptions}
            selected={invoiceDateFilter}
            onChange={setInvoiceDateFilter}
          />
        </div>

        <div className="flex flex-col gap-3">
          {loading ? (
            <>
              <AdminOrderCardSkeleton />
              <AdminOrderCardSkeleton />
            </>
          ) : ordersError ? (
            <div className="surface-3d rounded-2xl px-4 py-6 text-center text-[12px] text-muted">
              Couldn't load orders right now. Please check your connection and
              try again.
            </div>
          ) : clusters.length === 0 ? (
            <div className="surface-3d flex flex-col items-center gap-2 rounded-2xl px-4 py-10 text-center">
              <PackageSearch size={22} className="text-muted" />
              <div className="text-[12px] font-bold text-[#f2ece2]">
                {isFiltered ? "No matching orders" : "Nothing to deliver right now"}
              </div>
              <div className="text-[10.5px] text-muted">
                {isFiltered
                  ? "Try a different search term, date, invoice date, or location."
                  : "Packed orders will show up here as soon as packing is done."}
              </div>
              {isFiltered && (
                <button
                  onClick={() => {
                    setSearch("");
                    setDateFilter("");
                    setLocationFilter("");
                    setInvoiceDateFilter([]);
                  }}
                  className="btn-3d-outline mt-1 rounded-xl px-4 py-2 text-[11px] font-bold text-gold"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            clusters.map((cluster, i) => (
              <DeliveryClusterCard
                key={cluster.mobile}
                cluster={cluster}
                index={i}
                delay={Math.min(i, 8) * 0.04}
                markingKey={markingKey}
                onMarkDelivered={handleMarkDelivered}
                onMarkAllDelivered={handleMarkAllDelivered}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
