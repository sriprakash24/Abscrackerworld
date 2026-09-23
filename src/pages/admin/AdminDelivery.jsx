import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PackageSearch, Truck, CheckCheck } from "lucide-react";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { useAdminData } from "../../contexts/AdminDataContext";
import AdminOrdersHeader from "../../components/admin/AdminOrdersHeader";
import AdminTabsNav from "../../components/admin/AdminTabsNav";
import AdminOrderCardSkeleton from "../../components/admin/AdminOrderCardSkeleton";
import PackingSearchFilterBar from "../../components/admin/PackingSearchFilterBar";
import PackingInvoiceDateFilter from "../../components/admin/PackingInvoiceDateFilter";
import DeliveryClusterCard from "../../components/admin/DeliveryClusterCard";
import { db } from "../../firebase/config";
import {
  markOrdersOutForDelivery,
  markOrdersDelivered,
  updateOrderStatus,
  updateOrdersStatus,
} from "../../services/ordersFirestore";
import { useNavigate } from "react-router-dom";
import { PREVIOUS_ACTION_BY_STATUS } from "../../constants/orderActions";
import {
  getConfirmedDate,
  confirmedDateMillis,
  formatConfirmedDate,
  toDateInputValue,
} from "../../utils/orderDates";

// Two real stages, matched to how dispatch actually works here: a PACKED
// order is "Ready to Dispatch" (tap moves it to OUT_FOR_DELIVERY), and an
// OUT_FOR_DELIVERY order is "Mark Delivered" once it's handed off to the
// transport office — that's the edge of what this business is responsible
// for, not the parcel reaching the customer's door.
const STAGE_CONFIG = {
  PACKED: {
    key: "PACKED",
    label: "Ready to Dispatch",
    emptyTitle: "Nothing ready to dispatch",
    emptyBody: "Packed orders will show up here as soon as packing is done.",
    actionLabel: "Out for Delivery",
    actionIcon: Truck,
    mark: (ids) => markOrdersOutForDelivery(db, ids),
    successOne: "moved to Out for Delivery",
    successMany: (n) => `${n} orders moved to Out for Delivery`,
  },
  OUT_FOR_DELIVERY: {
    key: "OUT_FOR_DELIVERY",
    label: "Out for Delivery",
    emptyTitle: "Nothing out for delivery",
    emptyBody: "Orders dispatched for delivery will show up here.",
    actionLabel: "Mark Delivered",
    actionIcon: CheckCheck,
    mark: (ids) => markOrdersDelivered(db, ids),
    successOne: "marked delivered",
    successMany: (n) => `${n} orders marked delivered`,
  },
};

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

  const [stage, setStage] = useState("PACKED");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [invoiceDateFilter, setInvoiceDateFilter] = useState([]);
  const [markingKey, setMarkingKey] = useState(null);
  const [revokingKey, setRevokingKey] = useState(null);

  const config = STAGE_CONFIG[stage];
  const revokeAction = PREVIOUS_ACTION_BY_STATUS[stage];

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin/login", { replace: true });
    } catch (err) {
      console.error("Logout failed", err);
      toast.error("Could not sign out. Please try again.");
    }
  };

  const packedCount = useMemo(() => orders.filter((o) => o.status === "PACKED").length, [orders]);
  const outForDeliveryCount = useMemo(
    () => orders.filter((o) => o.status === "OUT_FOR_DELIVERY").length,
    [orders],
  );

  const stageOrders = useMemo(() => orders.filter((o) => o.status === stage), [orders, stage]);

  const locationOptions = useMemo(() => {
    const byKey = new Map();
    for (const order of stageOrders) {
      const raw = (order.address?.district || order.address?.city || "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, raw);
    }
    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
  }, [stageOrders]);

  const invoiceDateOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    const counts = new Map();
    for (const order of stageOrders) {
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
  }, [stageOrders, search, locationFilter]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    const invoiceDateSet = new Set(invoiceDateFilter);
    return stageOrders.filter((order) => {
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
  }, [stageOrders, search, dateFilter, invoiceDateFilter, locationFilter]);

  const clusters = useMemo(() => buildDeliveryClusters(filteredOrders), [filteredOrders]);
  const isFiltered = !!search || !!dateFilter || !!locationFilter || invoiceDateFilter.length > 0;

  const handleAction = async (order) => {
    setMarkingKey(`order:${order.id}`);
    try {
      await config.mark([order.id]);
      toast.success(`${order.orderId || "Order"} ${config.successOne}`);
    } catch (err) {
      console.error("Failed to update order", err);
      toast.error("Couldn't update the order. Please try again.");
    } finally {
      setMarkingKey(null);
    }
  };

  const handleActionAll = async (cluster) => {
    setMarkingKey(`cluster:${cluster.mobile}`);
    try {
      await config.mark(cluster.orders.map((o) => o.id));
      toast.success(config.successMany(cluster.orders.length));
    } catch (err) {
      console.error("Failed to update orders", err);
      toast.error("Couldn't update the orders. Please try again.");
    } finally {
      setMarkingKey(null);
    }
  };

  const handleRevoke = async (order) => {
    if (!revokeAction) return;
    setRevokingKey(`order:${order.id}`);
    try {
      await updateOrderStatus(db, order.id, revokeAction.patch);
      toast.success("Order reverted to the previous stage");
    } catch (err) {
      console.error("Failed to revoke order status", err);
      toast.error("Couldn't revert the order. Please try again.");
    } finally {
      setRevokingKey(null);
    }
  };

  const handleRevokeAll = async (cluster) => {
    if (!revokeAction) return;
    setRevokingKey(`cluster:${cluster.mobile}`);
    try {
      await updateOrdersStatus(db, cluster.orders.map((o) => o.id), revokeAction.patch);
      toast.success(`${cluster.orders.length} orders reverted to the previous stage`);
    } catch (err) {
      console.error("Failed to revoke orders", err);
      toast.error("Couldn't revert the orders. Please try again.");
    } finally {
      setRevokingKey(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-28 text-white">
      <AdminOrdersHeader
        email={user?.email}
        orderCount={packedCount + outForDeliveryCount}
        onLogout={handleLogout}
      />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-extrabold text-[#f2ece2]">Delivery</h2>
          <p className="text-[11px] text-muted">
            Sorted by actual payment-confirmed date — oldest first. "Delivered" here means
            dispatched to the transport office.
          </p>
        </div>

        <div className="surface-3d flex items-center gap-1 rounded-xl p-1">
          <button
            onClick={() => setStage("PACKED")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11.5px] font-bold transition-colors ${
              stage === "PACKED" ? "bg-gradient-to-b from-orange to-gold text-black" : "text-muted"
            }`}
          >
            <Truck size={13} />
            Ready to Dispatch
            <span
              className={`rounded-full px-1.5 text-[9.5px] font-extrabold ${
                stage === "PACKED" ? "bg-black/20 text-black" : "bg-white/10 text-muted"
              }`}
            >
              {packedCount}
            </span>
          </button>
          <button
            onClick={() => setStage("OUT_FOR_DELIVERY")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11.5px] font-bold transition-colors ${
              stage === "OUT_FOR_DELIVERY" ? "bg-gradient-to-b from-orange to-gold text-black" : "text-muted"
            }`}
          >
            <CheckCheck size={13} />
            Out for Delivery
            <span
              className={`rounded-full px-1.5 text-[9.5px] font-extrabold ${
                stage === "OUT_FOR_DELIVERY" ? "bg-black/20 text-black" : "bg-white/10 text-muted"
              }`}
            >
              {outForDeliveryCount}
            </span>
          </button>
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
                {isFiltered ? "No matching orders" : config.emptyTitle}
              </div>
              <div className="text-[10.5px] text-muted">
                {isFiltered
                  ? "Try a different search term, date, invoice date, or location."
                  : config.emptyBody}
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
                actionLabel={config.actionLabel}
                actionIcon={config.actionIcon}
                markingKey={markingKey}
                onAction={handleAction}
                onActionAll={handleActionAll}
                revokeLabel={revokeAction?.label}
                revokingKey={revokingKey}
                onRevoke={revokeAction ? handleRevoke : undefined}
                onRevokeAll={revokeAction ? handleRevokeAll : undefined}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
