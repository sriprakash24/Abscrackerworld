import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CircleDollarSign, Undo2 } from "lucide-react";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { useAdminData } from "../../contexts/AdminDataContext";
import AdminOrdersHeader from "../../components/admin/AdminOrdersHeader";
import AdminTabsNav from "../../components/admin/AdminTabsNav";
import AdminOrderSearchBar from "../../components/admin/AdminOrderSearchBar";
import AdminOrderCardSkeleton from "../../components/admin/AdminOrderCardSkeleton";
import OrderDateFilter from "../../components/admin/OrderDateFilter";
import PaymentOrderCard from "../../components/admin/PaymentOrderCard";
import { getConfirmedDate, confirmedDateMillis, toDateInputValue } from "../../utils/orderDates";

// Two tabs on one page instead of two separate routes: the whole reason
// admin asked for "revoke" here is to fix a payment approved by mistake —
// which only makes sense if the just-confirmed order is one tap away from
// this same screen, not buried back on the main Orders page.
const TABS = [
  { key: "AWAITING_ADMIN_CONFIRMATION", label: "To Confirm", icon: CircleDollarSign },
  { key: "CONFIRMED", label: "Confirmed", icon: Undo2 },
];

export default function AdminPaymentConfirmation() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { orders, ordersLoading: loading, ordersError } = useAdminData();

  const [tab, setTab] = useState("AWAITING_ADMIN_CONFIRMATION");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState([]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin/login", { replace: true });
    } catch (err) {
      console.error("Logout failed", err);
      toast.error("Could not sign out. Please try again.");
    }
  };

  const awaitingCount = useMemo(
    () => orders.filter((o) => o.status === "AWAITING_ADMIN_CONFIRMATION").length,
    [orders],
  );
  const confirmedCount = useMemo(
    () => orders.filter((o) => o.status === "CONFIRMED").length,
    [orders],
  );
  const counts = { AWAITING_ADMIN_CONFIRMATION: awaitingCount, CONFIRMED: confirmedCount };

  const tabOrders = useMemo(() => orders.filter((o) => o.status === tab), [orders, tab]);

  // Order-date picker — for "To Confirm" this is effectively the enquiry
  // date (no invoice yet, so getConfirmedDate falls back to createdAt);
  // for "Confirmed" it's the actual payment-confirmed date. Counted after
  // search narrows the set but before the date filter itself, same
  // pattern as the main Orders / Packing screens.
  const dateOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    const counts_ = new Map();
    for (const order of tabOrders) {
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
  }, [tabOrders, search]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    const dateSet = new Set(dateFilter);
    return tabOrders
      .filter((order) => {
        if (dateSet.size) {
          const confirmed = getConfirmedDate(order);
          if (!confirmed || !dateSet.has(toDateInputValue(confirmed))) return false;
        }
        if (!term) return true;
        const haystack = [order.orderId, order.id, order.customer?.name, order.customer?.mobile]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => confirmedDateMillis(a) - confirmedDateMillis(b));
  }, [tabOrders, search, dateFilter]);

  const isFiltered = !!search || dateFilter.length > 0;

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-28 text-white">
      <AdminOrdersHeader email={user?.email} orderCount={orders.length} onLogout={handleLogout} />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-extrabold text-[#f2ece2]">Payment Confirmation</h2>
          <p className="text-[11px] text-muted">
            Confirm payment as soon as it lands — or revoke one approved by mistake, right here.
          </p>
        </div>

        {/* Segmented tab — same pill shape used elsewhere in admin, just two options. */}
        <div className="surface-3d flex items-center gap-1 rounded-xl p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11.5px] font-bold transition-colors ${
                tab === key ? "bg-gradient-to-b from-orange to-gold text-black" : "text-muted"
              }`}
            >
              <Icon size={13} />
              {label}
              <span
                className={`rounded-full px-1.5 text-[9.5px] font-extrabold ${
                  tab === key ? "bg-black/20 text-black" : "bg-white/10 text-muted"
                }`}
              >
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        <AdminOrderSearchBar value={search} onChange={setSearch} />

        <div className="flex flex-wrap items-center gap-2">
          <OrderDateFilter options={dateOptions} selected={dateFilter} onChange={setDateFilter} />
        </div>

        <div className="flex flex-col gap-3">
          {loading ? (
            <>
              <AdminOrderCardSkeleton />
              <AdminOrderCardSkeleton />
            </>
          ) : ordersError ? (
            <div className="surface-3d rounded-2xl px-4 py-6 text-center text-[12px] text-muted">
              Couldn't load orders right now. Please check your connection and try again.
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="surface-3d flex flex-col items-center gap-2 rounded-2xl px-4 py-10 text-center">
              <CircleDollarSign size={22} className="text-muted" />
              <div className="text-[12px] font-bold text-[#f2ece2]">
                {isFiltered
                  ? "No matching orders"
                  : tab === "AWAITING_ADMIN_CONFIRMATION"
                    ? "Nothing awaiting payment right now"
                    : "Nothing confirmed right now"}
              </div>
              <div className="text-[10.5px] text-muted">
                {isFiltered
                  ? "Try a different search term or order date."
                  : tab === "AWAITING_ADMIN_CONFIRMATION"
                    ? "New orders will show up here as soon as they're placed."
                    : "Orders you confirm will show up here — in case one needs a revoke."}
              </div>
              {isFiltered && (
                <button
                  onClick={() => {
                    setSearch("");
                    setDateFilter([]);
                  }}
                  className="btn-3d-outline mt-1 rounded-xl px-4 py-2 text-[11px] font-bold text-gold"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filteredOrders.map((order, i) => (
              <PaymentOrderCard key={order.id} order={order} index={i} delay={Math.min(i, 8) * 0.04} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
