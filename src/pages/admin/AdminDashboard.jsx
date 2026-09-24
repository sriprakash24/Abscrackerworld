import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ListChecks,
  CheckSquare,
  Square,
  PackageCheck,
  Truck,
  CheckCheck,
  X,
} from "lucide-react";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { useAdminData } from "../../contexts/AdminDataContext";
import { ADMIN_STATUS_FILTERS, canAdvance } from "../../constants/orderActions";
import { getOrderStatusMeta } from "../../constants/orderStatusMeta";
import { db } from "../../firebase/config";
import {
  orderMergeKeyForMobile,
  setOrderMergeSelection,
} from "../../services/orderMergeFirestore";
import {
  markOrdersPacked,
  markOrdersOutForDelivery,
  markOrdersDelivered,
} from "../../services/ordersFirestore";
import AdminOrdersHeader from "../../components/admin/AdminOrdersHeader";
import AdminTabsNav from "../../components/admin/AdminTabsNav";
import AdminStatsStrip from "../../components/admin/AdminStatsStrip";
import OrderStatusFilterTabs from "../../components/admin/OrderStatusFilterTabs";
import WhatsappStatusFilter from "../../components/admin/WhatsappStatusFilter";
import EditedOrdersFilter from "../../components/admin/EditedOrdersFilter";
import OrderDateFilter from "../../components/admin/OrderDateFilter";
import AdminOrderSearchBar from "../../components/admin/AdminOrderSearchBar";
import AdminOrderCard from "../../components/admin/AdminOrderCard";
import AdminOrderCardSkeleton from "../../components/admin/AdminOrderCardSkeleton";
import AdminOrdersEmpty from "../../components/admin/AdminOrdersEmpty";
import MergedEstimateCard from "../../components/admin/MergedEstimateCard";
import MergedConfirmedCard from "../../components/admin/MergedConfirmedCard";
import MergeSelectionBanner from "../../components/admin/MergeSelectionBanner";
import ConfirmDeleteDialog from "../../components/admin/ConfirmDeleteDialog";
import { getWhatsappSendStatus } from "../../utils/whatsappSendStatus";
import { getOrderEditStatus } from "../../utils/orderEditStatus";
import { getConfirmedDate, toDateInputValue } from "../../utils/orderDates";
import { buildOrderManagementGroups } from "../../utils/orderMergeGroups";

// Bulk status update only ever applies past payment — Confirmed / Packed /
// Out for Delivery orders can be batch-advanced since it's just a fulfilment
// status flip. AWAITING_ADMIN_CONFIRMATION is deliberately excluded: payment
// is manual (bank transfer / UPI, checked one at a time), so "Confirm
// Payment" always stays a per-order action — never offered here.
function isBulkEligible(order) {
  return (
    order.status !== "AWAITING_ADMIN_CONFIRMATION" && canAdvance(order.status)
  );
}

const BULK_TARGETS = [
  {
    status: "PACKED",
    label: "Mark Packed",
    icon: PackageCheck,
    run: markOrdersPacked,
  },
  {
    status: "OUT_FOR_DELIVERY",
    label: "Out for Delivery",
    icon: Truck,
    run: markOrdersOutForDelivery,
  },
  {
    status: "DELIVERED",
    label: "Mark Delivered",
    icon: CheckCheck,
    run: markOrdersDelivered,
  },
];

export default function AdminDashboard() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  const {
    orders,
    ordersLoading: loading,
    ordersError,
    orderMergeProgress,
  } = useAdminData();
  const errored = !!ordersError;
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [whatsappFilter, setWhatsappFilter] = useState("ALL");
  const [editedFilter, setEditedFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState([]);
  const [search, setSearch] = useState("");
  const [mergingMobile, setMergingMobile] = useState(null);

  // Bulk fulfilment-status update — see isBulkEligible/BULK_TARGETS above.
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [confirmingBulkTarget, setConfirmingBulkTarget] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggleBulkMode = () => {
    setBulkMode((v) => !v);
    setSelectedIds(new Set());
  };

  // Shared by both a single order's checkbox and a merged group's — a
  // merged group's orders always move together (one shared invoice), so
  // passing every id in the group here selects/deselects it as one unit.
  const toggleSelected = (ids) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const handleConfirmBulkUpdate = async () => {
    if (!confirmingBulkTarget || selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      await confirmingBulkTarget.run(db, Array.from(selectedIds));
      toast.success(
        `${selectedIds.size} order${selectedIds.size > 1 ? "s" : ""} marked as "${confirmingBulkTarget.label.replace("Mark ", "")}"`,
      );
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Bulk status update failed", err);
      toast.error("Couldn't update those orders. Please try again.");
    } finally {
      setBulkBusy(false);
      setConfirmingBulkTarget(null);
    }
  };

  const handleMerge = async (mobile, orderIds) => {
    setMergingMobile(mobile);
    try {
      await setOrderMergeSelection(db, mobile, orderIds);
      toast.success(
        orderIds.length > 1
          ? `Merged ${orderIds.length} orders into one estimate bill`
          : "Merged into one estimate bill",
      );
    } catch (err) {
      console.error("Failed to merge orders", err);
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
      navigate("/admin/login", { replace: true });
    } catch (err) {
      console.error("Logout failed", err);
      toast.error("Could not sign out. Please try again.");
    }
  };

  const counts = useMemo(() => {
    const c = { ALL: orders.length };
    for (const status of ADMIN_STATUS_FILTERS) {
      if (status === "ALL") continue;
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
      if (status === "SENT") c.SENT += 1;
      else if (status === "PENDING") c.PENDING += 1;
    }
    return c;
  }, [orders]);

  // Counts for the Edited-orders filter — same spirit as `whatsappCounts`.
  const editedCounts = useMemo(() => {
    const c = { ALL: orders.length, EDITED: 0 };
    for (const order of orders) {
      if (getOrderEditStatus(order) === "EDITED") c.EDITED += 1;
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
      if (statusFilter !== "ALL" && order.status !== statusFilter) continue;
      if (
        whatsappFilter !== "ALL" &&
        getWhatsappSendStatus(order) !== whatsappFilter
      )
        continue;
      if (editedFilter !== "ALL" && getOrderEditStatus(order) !== editedFilter)
        continue;
      if (term) {
        const haystack = [
          order.orderId,
          order.id,
          order.customer?.name,
          order.customer?.mobile,
        ]
          .filter(Boolean)
          .join(" ")
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
        const [y, m, d] = value.split("-").map(Number);
        const label = new Date(y, m - 1, d).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        return { value, label, count };
      });
  }, [orders, deferredSearch, statusFilter, whatsappFilter, editedFilter]);

  const filteredOrders = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    const dateSet = new Set(dateFilter);
    return orders.filter((order) => {
      if (statusFilter !== "ALL" && order.status !== statusFilter) return false;
      if (
        whatsappFilter !== "ALL" &&
        getWhatsappSendStatus(order) !== whatsappFilter
      )
        return false;
      if (editedFilter !== "ALL" && getOrderEditStatus(order) !== editedFilter)
        return false;
      if (dateSet.size) {
        const confirmed = getConfirmedDate(order);
        if (!confirmed || !dateSet.has(toDateInputValue(confirmed)))
          return false;
      }
      if (!term) return true;
      const haystack = [
        order.orderId,
        order.id,
        order.customer?.name,
        order.customer?.mobile,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [
    orders,
    statusFilter,
    whatsappFilter,
    editedFilter,
    dateFilter,
    deferredSearch,
  ]);

  const orderGroups = useMemo(
    () => buildOrderManagementGroups(filteredOrders),
    [filteredOrders],
  );

  const isFiltered =
    statusFilter !== "ALL" ||
    whatsappFilter !== "ALL" ||
    editedFilter !== "ALL" ||
    dateFilter.length > 0 ||
    search.trim().length > 0;

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-28 text-white">
      <AdminOrdersHeader
        email={user?.email}
        orderCount={orders.length}
        onLogout={handleLogout}
      />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6">
        <AdminStatsStrip orders={orders} />

        {/* Sticky so the admin can always search/filter without scrolling
            back up, even deep into a long order list. */}
        <div className="sticky top-16 z-20 -mx-4 flex flex-col gap-2 bg-[#050505]/95 px-4 pb-2 pt-1 backdrop-blur-sm sm:-mx-6 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <AdminOrderSearchBar value={search} onChange={setSearch} />
            </div>
            <button
              type="button"
              onClick={toggleBulkMode}
              title="Select several orders and mark them Packed / Out for Delivery / Delivered together"
              className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2.5 text-[10.5px] font-bold transition-colors ${
                bulkMode
                  ? "border-orange/50 bg-orange/15 text-orange"
                  : "border-white/10 bg-white/5 text-muted hover:text-[#f2ece2]"
              }`}
            >
              <ListChecks size={14} />
              {bulkMode ? "Cancel" : "Bulk Update"}
            </button>
          </div>

          {/* Selection summary + the 3 batch actions — payment confirmation
              is deliberately not offered here, see isBulkEligible above. */}
          {bulkMode && selectedIds.size > 0 && (
            <div className="surface-3d flex flex-wrap items-center gap-2 rounded-xl border border-orange/30 px-3 py-2.5">
              <span className="mr-1 shrink-0 text-[11px] font-extrabold text-[#f2ece2]">
                {selectedIds.size} selected
              </span>
              {BULK_TARGETS.map((target) => (
                <button
                  key={target.status}
                  type="button"
                  onClick={() => setConfirmingBulkTarget(target)}
                  className="btn-3d-outline flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10.5px] font-bold text-gold"
                >
                  <target.icon size={12} />
                  {target.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                title="Clear selection"
                className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:text-[#f2ece2]"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <OrderStatusFilterTabs
          activeStatus={statusFilter}
          onChange={setStatusFilter}
          counts={counts}
        />

        <div className="flex flex-wrap items-center gap-2">
          <WhatsappStatusFilter
            active={whatsappFilter}
            onChange={setWhatsappFilter}
            counts={whatsappCounts}
          />
          <EditedOrdersFilter
            active={editedFilter}
            onChange={setEditedFilter}
            counts={editedCounts}
          />
          <OrderDateFilter
            options={dateOptions}
            selected={dateFilter}
            onChange={setDateFilter}
          />
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
              Couldn't load orders right now. Please check your connection and
              try again.
            </div>
          ) : filteredOrders.length === 0 ? (
            <AdminOrdersEmpty
              filtered={isFiltered}
              onClearFilters={() => {
                setStatusFilter("ALL");
                setWhatsappFilter("ALL");
                setEditedFilter("ALL");
                setDateFilter([]);
                setSearch("");
              }}
            />
          ) : (
            orderGroups.map((group, i) => {
              const delay = Math.min(i, 8) * 0.04;

              if (group.type === "single") {
                const eligible = bulkMode && isBulkEligible(group.order);
                const card = (
                  <AdminOrderCard order={group.order} delay={delay} index={i} />
                );
                if (!bulkMode) return <div key={group.order.id}>{card}</div>;
                return (
                  <BulkSelectRow
                    key={group.order.id}
                    eligible={eligible}
                    selected={selectedIds.has(group.order.id)}
                    onToggle={() => toggleSelected([group.order.id])}
                  >
                    {card}
                  </BulkSelectRow>
                );
              }

              if (group.type === "confirmedCluster") {
                const ids = group.orders.map((o) => o.id);
                const eligible = bulkMode && isBulkEligible(group.orders[0]);
                const allSelected =
                  ids.length > 0 && ids.every((id) => selectedIds.has(id));
                const card = (
                  <MergedConfirmedCard orders={group.orders} delay={delay} />
                );
                if (!bulkMode)
                  return <div key={`invoice:${group.invoiceId}`}>{card}</div>;
                return (
                  <BulkSelectRow
                    key={`invoice:${group.invoiceId}`}
                    eligible={eligible}
                    selected={allSelected}
                    onToggle={() => toggleSelected(ids)}
                  >
                    {card}
                  </BulkSelectRow>
                );
              }

              // awaitingCluster — 2+ still-unconfirmed orders from the same
              // mobile number. The merge doc's `orderIds` (see
              // setOrderMergeSelection) decides which of these are actually
              // combined; anything not selected still renders as its own
              // separate AdminOrderCard right alongside.
              const mergeDoc =
                orderMergeProgress[orderMergeKeyForMobile(group.mobile)];
              const mergedOrderIds = mergeDoc?.merged
                ? mergeDoc.orderIds || []
                : [];
              const selectedOrders = group.orders.filter((o) =>
                mergedOrderIds.includes(o.id),
              );
              const unselectedOrders = group.orders.filter(
                (o) => !mergedOrderIds.includes(o.id),
              );
              const isMerged = selectedOrders.length > 1;

              if (isMerged) {
                return (
                  <div
                    key={`cluster:${group.mobile}`}
                    className="flex flex-col gap-3"
                  >
                    <MergedEstimateCard
                      mobile={group.mobile}
                      orders={selectedOrders}
                      allSiblings={group.orders}
                      delay={delay}
                    />
                    {unselectedOrders.map((order, j) => (
                      <AdminOrderCard
                        key={order.id}
                        order={order}
                        delay={delay}
                        index={i + j}
                      />
                    ))}
                  </div>
                );
              }

              return (
                <div
                  key={`cluster:${group.mobile}`}
                  className="flex flex-col gap-3"
                >
                  <MergeSelectionBanner
                    mobile={group.mobile}
                    orders={group.orders}
                    merging={mergingMobile === group.mobile}
                    onMerge={(orderIds) => handleMerge(group.mobile, orderIds)}
                  />
                  {group.orders.map((order, j) => (
                    <AdminOrderCard
                      key={order.id}
                      order={order}
                      delay={delay}
                      index={i + j}
                    />
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={!!confirmingBulkTarget}
        title={
          confirmingBulkTarget
            ? `${confirmingBulkTarget.label} for ${selectedIds.size} orders?`
            : ""
        }
        description={
          confirmingBulkTarget
            ? `${selectedIds.size} selected order${selectedIds.size > 1 ? "s" : ""} will be updated to "${getOrderStatusMeta(confirmingBulkTarget.status).label}" — regardless of their current stage. Use this once you've already packed/dispatched/delivered them physically.`
            : ""
        }
        busy={bulkBusy}
        confirmLabel={confirmingBulkTarget?.label || "Update"}
        tone="success"
        onConfirm={handleConfirmBulkUpdate}
        onCancel={() => setConfirmingBulkTarget(null)}
      />
    </div>
  );
}

/** Small checkbox column placed to the left of a card while bulk-select
 * mode is on — keeps the card itself untouched (no overlapping absolute
 * positioning) so AdminOrderCard/MergedConfirmedCard don't need to know
 * anything about bulk selection. Ineligible cards (still awaiting payment,
 * or already in a final state) render with the checkbox slot empty rather
 * than hidden, so the list doesn't jump around as bulk mode toggles. */
function BulkSelectRow({ eligible, selected, onToggle, children }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex h-11 w-6 shrink-0 items-center justify-center">
        {eligible && (
          <button
            type="button"
            onClick={onToggle}
            className={
              selected ? "text-orange" : "text-muted hover:text-[#f2ece2]"
            }
          >
            {selected ? <CheckSquare size={19} /> : <Square size={19} />}
          </button>
        )}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
