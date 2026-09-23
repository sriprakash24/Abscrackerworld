import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PackageSearch, PackageOpen, PackageCheck } from "lucide-react";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { useAdminData } from "../../contexts/AdminDataContext";
import AdminOrdersHeader from "../../components/admin/AdminOrdersHeader";
import AdminTabsNav from "../../components/admin/AdminTabsNav";
import AdminOrderCardSkeleton from "../../components/admin/AdminOrderCardSkeleton";
import PackingSearchFilterBar from "../../components/admin/PackingSearchFilterBar";
import PackingInvoiceDateFilter from "../../components/admin/PackingInvoiceDateFilter";
import PackingStatsStrip from "../../components/admin/PackingStatsStrip";
import PackingClusterCard from "../../components/admin/PackingClusterCard";
import PackingChecklistModal from "../../components/admin/PackingChecklistModal";
import DeliveryClusterCard from "../../components/admin/DeliveryClusterCard";
import ConfirmDeleteDialog from "../../components/admin/ConfirmDeleteDialog";
import { db } from "../../firebase/config";
import { markOrdersPacked, updateOrderStatus, updateOrdersStatus } from "../../services/ordersFirestore";
import {
  savePackingProgress,
  setPackingMergeToggle,
  packingKeyForMobile,
} from "../../services/packingFirestore";
import { PREVIOUS_ACTION_BY_STATUS } from "../../constants/orderActions";
import {
  getConfirmedDate,
  confirmedDateMillis,
  formatConfirmedDate,
  toDateInputValue,
} from "../../utils/orderDates";

/** Same grouping shape as AdminDelivery's clusters, minus the merge/checklist
 * machinery — just enough to show already-packed orders per customer with a
 * one-tap revoke, in case one was packed by mistake. */
function buildSimpleClusters(orders) {
  const byMobile = new Map();
  for (const order of orders) {
    const mobile = order.customer?.mobile || order.id;
    if (!byMobile.has(mobile)) byMobile.set(mobile, []);
    byMobile.get(mobile).push(order);
  }
  const clusters = [];
  for (const [mobile, groupOrders] of byMobile.entries()) {
    const sorted = [...groupOrders].sort((a, b) => confirmedDateMillis(a) - confirmedDateMillis(b));
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

/** Sums quantity for the same product across one or more orders' cartItems. */
function mergeCartItems(orders) {
  const itemMap = new Map();
  for (const order of orders) {
    for (const item of order.cartItems || []) {
      const key = item.productId || item.name;
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          key,
          name: item.name,
          nameTa: item.nameTa,
          image: item.image,
          quantity: 0,
        });
      }
      itemMap.get(key).quantity += item.quantity || 0;
    }
  }
  return Array.from(itemMap.values());
}

function buildOrderJob(mobile, order) {
  return {
    jobKey: `order:${order.id}`,
    merged: false,
    mobile,
    customerName: order.customer?.name || "Unnamed customer",
    orderIds: [order.id],
    orderLabels: [order.orderId || order.id],
    confirmedDateLabel: formatConfirmedDate(order),
    items: mergeCartItems([order]),
    grandTotal: order.grandTotal || 0,
  };
}

function buildMergedJob(mobile, customerName, orders) {
  return {
    jobKey: `merged:${mobile}`,
    merged: true,
    mobile,
    customerName,
    orderIds: orders.map((o) => o.id),
    orderLabels: orders.map((o) => o.orderId || o.id),
    confirmedDateLabel: formatConfirmedDate(orders[0]),
    items: mergeCartItems(orders),
    grandTotal: orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
  };
}

/**
 * Groups CONFIRMED orders by customer mobile number and, for any customer
 * with more than one, builds either separate per-order jobs or one merged
 * job depending on that customer's saved `merged` flag — never merged by
 * default (see PackingClusterCard). Sorted oldest-first by the actual
 * payment-confirmed date (from the invoice number), not the enquiry date.
 */
function buildClusters(orders, packingProgress) {
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
    const mergedFlag =
      sorted.length > 1 &&
      !!packingProgress[packingKeyForMobile(mobile)]?.merged;

    const jobs = mergedFlag
      ? [buildMergedJob(mobile, earliest.customer?.name, sorted)]
      : sorted.map((order) => buildOrderJob(mobile, order));

    clusters.push({
      mobile,
      customerName: earliest.customer?.name || "Unnamed customer",
      earliestConfirmedLabel: formatConfirmedDate(earliest),
      earliestConfirmedMillis: confirmedDateMillis(earliest),
      orders: sorted,
      address: earliest.address || null,
      merged: mergedFlag,
      jobs,
    });
  }

  return clusters.sort(
    (a, b) => a.earliestConfirmedMillis - b.earliestConfirmedMillis,
  );
}

function getSavedPackedKeys(progressDoc, job) {
  const raw = job.merged
    ? progressDoc?.packedKeysMerged
    : progressDoc?.perOrder?.[job.orderIds[0]]?.packedKeys;
  const keys = raw || [];
  const validKeys = new Set(job.items.map((i) => i.key));
  return keys.filter((k) => validKeys.has(k));
}

export default function AdminPacking() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const {
    orders,
    ordersLoading: loading,
    ordersError,
    packingProgress,
  } = useAdminData();

  const [tab, setTab] = useState("CONFIRMED");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [invoiceDateFilter, setInvoiceDateFilter] = useState([]);
  const [activeJobKey, setActiveJobKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [togglingMobile, setTogglingMobile] = useState(null);
  const [revokingKey, setRevokingKey] = useState(null);
  const [confirmingQuickJob, setConfirmingQuickJob] = useState(null);
  const [quickMarkingKey, setQuickMarkingKey] = useState(null);

  const packedOrders = useMemo(() => orders.filter((o) => o.status === "PACKED"), [orders]);
  // Same search/invoice-date/location controls as the "Ready to Pack" tab,
  // just applied to the already-packed set instead — one filter bar for
  // both tabs, not two things to keep in sync.
  const filteredPackedOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    const invoiceDateSet = new Set(invoiceDateFilter);
    return packedOrders.filter((order) => {
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
  }, [packedOrders, search, invoiceDateFilter, locationFilter]);
  const packedClusters = useMemo(() => buildSimpleClusters(filteredPackedOrders), [filteredPackedOrders]);
  const packedRevokeAction = PREVIOUS_ACTION_BY_STATUS.PACKED;

  const handleRevokePacked = async (order) => {
    setRevokingKey(`order:${order.id}`);
    try {
      await updateOrderStatus(db, order.id, packedRevokeAction.patch);
      toast.success("Order reverted to Confirmed");
    } catch (err) {
      console.error("Failed to revoke packed order", err);
      toast.error("Couldn't revert the order. Please try again.");
    } finally {
      setRevokingKey(null);
    }
  };

  const handleRevokePackedAll = async (cluster) => {
    setRevokingKey(`cluster:${cluster.mobile}`);
    try {
      await updateOrdersStatus(db, cluster.orders.map((o) => o.id), packedRevokeAction.patch);
      toast.success(`${cluster.orders.length} orders reverted to Confirmed`);
    } catch (err) {
      console.error("Failed to revoke packed orders", err);
      toast.error("Couldn't revert the orders. Please try again.");
    } finally {
      setRevokingKey(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin/login", { replace: true });
    } catch (err) {
      console.error("Logout failed", err);
      toast.error("Could not sign out. Please try again.");
    }
  };

  // District (falling back to city when a district wasn't captured) for
  // every confirmed order, so the location dropdown only ever offers
  // places that actually have a packing-ready order right now. Grouped
  // case-insensitively (so "Coimbatore" and "COIMBATORE" collapse into
  // one entry) and displayed using whichever casing appeared first.
  const locationOptions = useMemo(() => {
    const byKey = new Map();
    for (const order of orders) {
      if (order.status !== "CONFIRMED") continue;
      const raw = (order.address?.district || order.address?.city || "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, raw);
    }
    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  // How many confirmed orders fall on each invoice-number-derived date,
  // for the "Invoice date(s)" picker below — counted after search and
  // location narrow the set, but before the date filters themselves, so
  // ticking one date doesn't hide the others' counts.
  const invoiceDateOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    const counts = new Map();
    for (const order of orders) {
      if (order.status !== "CONFIRMED") continue;
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
  }, [orders, search, locationFilter]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    const invoiceDateSet = new Set(invoiceDateFilter);
    return orders.filter((order) => {
      if (order.status !== "CONFIRMED") return false;
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
  }, [orders, search, dateFilter, invoiceDateFilter, locationFilter]);

  const clusters = useMemo(
    () => buildClusters(filteredOrders, packingProgress),
    [filteredOrders, packingProgress],
  );

  // Unfiltered — so the header count and stats strip always reflect the
  // full packing workload, not just whatever the current search/date/
  // location filters happen to be narrowed down to.
  const confirmedOrders = useMemo(
    () => orders.filter((o) => o.status === "CONFIRMED"),
    [orders],
  );
  const allJobs = useMemo(
    () => buildClusters(confirmedOrders, packingProgress).flatMap((c) => c.jobs),
    [confirmedOrders, packingProgress],
  );

  // Counted per underlying ORDER, not per job — a merged job bundles
  // several orders' worth of packing into one checklist, so counting jobs
  // instead would undercount (e.g. 114 confirmed orders merged down to
  // 113 jobs). Every order in a merged job shares that job's status, so
  // the totals here always add up to confirmedOrders.length.
  const packingStats = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    for (const job of allJobs) {
      const savedCount = getSavedPackedKeys(
        packingProgress[packingKeyForMobile(job.mobile)],
        job,
      ).length;
      const ordersInJob = job.orderIds.length;
      if (savedCount === 0) pending += ordersInJob;
      else if (savedCount >= job.items.length) completed += ordersInJob;
      else inProgress += ordersInJob;
    }
    return { pending, inProgress, completed };
  }, [allJobs, packingProgress]);

  const activeJob =
    clusters.flatMap((c) => c.jobs).find((j) => j.jobKey === activeJobKey) || null;
  const activeSavedKeys = activeJob
    ? getSavedPackedKeys(packingProgress[packingKeyForMobile(activeJob.mobile)], activeJob)
    : [];

  const isFiltered =
    !!search || !!dateFilter || !!locationFilter || invoiceDateFilter.length > 0;

  const handleToggleMerge = async (cluster) => {
    setTogglingMobile(cluster.mobile);
    try {
      await setPackingMergeToggle(db, cluster.mobile, !cluster.merged);
    } catch (err) {
      console.error("Failed to toggle merge", err);
      toast.error("Couldn't update. Please try again.");
    } finally {
      setTogglingMobile(null);
    }
  };

  const handleSaveProgress = async (packedKeys) => {
    if (!activeJob) return;
    setSaving(true);
    try {
      await savePackingProgress(db, activeJob.mobile, {
        merged: activeJob.merged,
        orderId: activeJob.orderIds[0],
        packedKeys,
      });
      toast.success("Packing progress saved");
    } catch (err) {
      console.error("Failed to save packing progress", err);
      toast.error("Couldn't save progress. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPacked = async (packedKeys) => {
    if (!activeJob) return;
    setMarking(true);
    try {
      await savePackingProgress(db, activeJob.mobile, {
        merged: activeJob.merged,
        orderId: activeJob.orderIds[0],
        packedKeys,
      });
      await markOrdersPacked(db, activeJob.orderIds);
      toast.success(
        activeJob.orderIds.length > 1
          ? `${activeJob.orderIds.length} orders moved to Packed`
          : "Order moved to Packed",
      );
      setActiveJobKey(null);
    } catch (err) {
      console.error("Failed to mark order(s) as packed", err);
      toast.error("Couldn't update the order. Please try again.");
    } finally {
      setMarking(false);
    }
  };

  // Shortcut for when packing already happened off-app (e.g. worked from a
  // printed list) — skips the checklist modal entirely and marks every item
  // packed in one tap, straight from the card. Still asks for confirmation
  // first since, unlike the checklist, there's no per-item review here.
  const handleQuickMarkPacked = async () => {
    const job = confirmingQuickJob;
    if (!job) return;
    setQuickMarkingKey(job.jobKey);
    try {
      const allKeys = job.items.map((item) => item.key);
      await savePackingProgress(db, job.mobile, {
        merged: job.merged,
        orderId: job.orderIds[0],
        packedKeys: allKeys,
      });
      await markOrdersPacked(db, job.orderIds);
      toast.success(
        job.orderIds.length > 1
          ? `${job.orderIds.length} orders moved to Packed`
          : "Order moved to Packed",
      );
    } catch (err) {
      console.error("Failed to mark order(s) as packed", err);
      toast.error("Couldn't update the order. Please try again.");
    } finally {
      setQuickMarkingKey(null);
      setConfirmingQuickJob(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-28 text-white">
      <AdminOrdersHeader
        email={user?.email}
        orderCount={confirmedOrders.length}
        onLogout={handleLogout}
      />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-[15px] font-extrabold text-[#f2ece2]">Packing</h2>
            <p className="text-[11px] text-muted">
              Confirmed orders only, sorted by actual payment-confirmed date —
              oldest first.
            </p>
          </div>
          <div className="sm:w-[300px]">
            <PackingStatsStrip
              pending={packingStats.pending}
              inProgress={packingStats.inProgress}
              completed={packingStats.completed}
            />
          </div>
        </div>

        <div className="surface-3d flex items-center gap-1 rounded-xl p-1">
          <button
            onClick={() => setTab("CONFIRMED")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11.5px] font-bold transition-colors ${
              tab === "CONFIRMED" ? "bg-gradient-to-b from-orange to-gold text-black" : "text-muted"
            }`}
          >
            <PackageOpen size={13} />
            Ready to Pack
            <span
              className={`rounded-full px-1.5 text-[9.5px] font-extrabold ${
                tab === "CONFIRMED" ? "bg-black/20 text-black" : "bg-white/10 text-muted"
              }`}
            >
              {confirmedOrders.length}
            </span>
          </button>
          <button
            onClick={() => setTab("PACKED")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11.5px] font-bold transition-colors ${
              tab === "PACKED" ? "bg-gradient-to-b from-orange to-gold text-black" : "text-muted"
            }`}
          >
            <PackageCheck size={13} />
            Packed
            <span
              className={`rounded-full px-1.5 text-[9.5px] font-extrabold ${
                tab === "PACKED" ? "bg-black/20 text-black" : "bg-white/10 text-muted"
              }`}
            >
              {packedOrders.length}
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

        {tab === "CONFIRMED" ? (
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
                  {isFiltered ? "No matching orders" : "Nothing to pack right now"}
                </div>
                <div className="text-[10.5px] text-muted">
                  {isFiltered
                    ? "Try a different search term, date, invoice date, or location."
                    : "Confirmed orders will show up here as soon as payment is confirmed."}
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
                <PackingClusterCard
                  key={cluster.mobile}
                  cluster={cluster}
                  index={i}
                  merged={cluster.merged}
                  togglingMerge={togglingMobile === cluster.mobile}
                  onToggleMerge={() => handleToggleMerge(cluster)}
                  getPackedCount={(job) =>
                    getSavedPackedKeys(
                      packingProgress[packingKeyForMobile(job.mobile)],
                      job,
                    ).length
                  }
                  onStartPacking={(job) => setActiveJobKey(job.jobKey)}
                  onQuickMarkPacked={(job) => setConfirmingQuickJob(job)}
                  quickMarkingKey={quickMarkingKey}
                  delay={Math.min(i, 8) * 0.04}
                />
              ))
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {loading ? (
              <>
                <AdminOrderCardSkeleton />
                <AdminOrderCardSkeleton />
              </>
            ) : packedClusters.length === 0 ? (
              <div className="surface-3d flex flex-col items-center gap-2 rounded-2xl px-4 py-10 text-center">
                <PackageCheck size={22} className="text-muted" />
                <div className="text-[12px] font-bold text-[#f2ece2]">Nothing packed yet</div>
                <div className="text-[10.5px] text-muted">
                  Orders you mark packed will show up here — in case one needs a revoke.
                </div>
              </div>
            ) : (
              packedClusters.map((cluster, i) => (
                <DeliveryClusterCard
                  key={cluster.mobile}
                  cluster={cluster}
                  index={i}
                  delay={Math.min(i, 8) * 0.04}
                  revokeLabel={packedRevokeAction?.label}
                  revokingKey={revokingKey}
                  onRevoke={handleRevokePacked}
                  onRevokeAll={handleRevokePackedAll}
                />
              ))
            )}
          </div>
        )}
      </div>

      <PackingChecklistModal
        open={!!activeJob}
        job={activeJob}
        savedPackedKeys={activeSavedKeys}
        saving={saving}
        marking={marking}
        onSaveProgress={handleSaveProgress}
        onMarkPacked={handleMarkPacked}
        onClose={() => setActiveJobKey(null)}
      />

      <ConfirmDeleteDialog
        open={!!confirmingQuickJob}
        title="Mark packed without the checklist?"
        description={`This marks ${
          confirmingQuickJob?.merged ? "the merged box" : confirmingQuickJob?.orderLabels?.[0] || "this order"
        } as fully packed and moves it straight to Packed — use this when packing was already done manually, e.g. from a printed list.`}
        busy={!!quickMarkingKey}
        confirmLabel="Yes, Mark Packed"
        tone="success"
        onConfirm={handleQuickMarkPacked}
        onCancel={() => setConfirmingQuickJob(null)}
      />
    </div>
  );
}
