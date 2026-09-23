import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db } from '../firebase/config';
import { subscribeAllOrders } from '../services/ordersFirestore';
import { subscribeAllUsers } from '../services/usersFirestore';
import { subscribeAllPackingProgress } from '../services/packingFirestore';
import { subscribeAllOrderMerges } from '../services/orderMergeFirestore';

const AdminDataContext = createContext(null);

/**
 * Subscribes ONCE, for the lifetime of the admin panel, to the `orders` and
 * `users` collections and shares them with every admin screen via
 * useAdminData().
 *
 * Before this existed, AdminOverview, AdminDashboard, and AdminUsers each
 * called subscribeAllOrders independently (and AdminOverview + AdminUsers
 * each called subscribeAllUsers too). Since react-router unmounts/remounts
 * page components on navigation, every switch between those tabs re-ran a
 * full, unbounded collection read from Firestore — this was a major
 * contributor to blowing through the Firestore free-tier quota with only a
 * handful of real users. Mounting the listeners here, above <Routes>, means
 * they're set up once when the admin logs in and torn down once when they
 * leave /admin — tab switching is now free.
 */
export function AdminDataProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);

  // Keyed by sanitized mobile number — { [mobileKey]: { packedKeys, updatedAt } }.
  // See src/services/packingFirestore.js for the shape/reasoning.
  const [packingProgress, setPackingProgress] = useState({});
  const [packingProgressLoading, setPackingProgressLoading] = useState(true);

  // Keyed by sanitized mobile number — { [mobileKey]: { merged, updatedAt } }.
  // Drives the Order Management "merge into one estimate bill" feature —
  // see src/services/orderMergeFirestore.js.
  const [orderMergeProgress, setOrderMergeProgress] = useState({});
  const [orderMergeProgressLoading, setOrderMergeProgressLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeAllOrders(
      db,
      (fetched) => {
        setOrders(fetched);
        setOrdersLoading(false);
        setOrdersError(null);
      },
      (err) => {
        setOrdersError(err);
        setOrdersLoading(false);
      }
    );
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAllUsers(
      db,
      (fetched) => {
        setUsers(fetched);
        setUsersLoading(false);
        setUsersError(null);
      },
      (err) => {
        setUsersError(err);
        setUsersLoading(false);
      }
    );
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAllPackingProgress(
      db,
      (fetched) => {
        setPackingProgress(fetched);
        setPackingProgressLoading(false);
      },
      () => {
        setPackingProgressLoading(false);
      }
    );
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAllOrderMerges(
      db,
      (fetched) => {
        setOrderMergeProgress(fetched);
        setOrderMergeProgressLoading(false);
      },
      () => {
        setOrderMergeProgressLoading(false);
      }
    );
    return () => unsubscribe?.();
  }, []);

  const value = useMemo(
    () => ({
      orders,
      ordersLoading,
      ordersError,
      users,
      usersLoading,
      usersError,
      packingProgress,
      packingProgressLoading,
      orderMergeProgress,
      orderMergeProgressLoading,
    }),
    [
      orders,
      ordersLoading,
      ordersError,
      users,
      usersLoading,
      usersError,
      packingProgress,
      packingProgressLoading,
      orderMergeProgress,
      orderMergeProgressLoading,
    ]
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used within an AdminDataProvider');
  return ctx;
}
