import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { useCustomerStore } from '../store/useCustomerStore';
import { useCustomerGateStore } from '../store/useCustomerGateStore';
import { subscribeOrdersByMobile } from '../services/ordersFirestore';
import { buildConfirmedInvoiceGroups } from '../utils/orderMergeGroups';
import OrdersHeader from '../components/orders/OrdersHeader';
import OrderCard from '../components/orders/OrderCard';
import MergedOrderCard from '../components/orders/MergedOrderCard';
import OrderCardSkeleton from '../components/orders/OrderCardSkeleton';
import EmptyOrders from '../components/orders/EmptyOrders';
import EmberParticles from '../components/ui/EmberParticles';
import FestiveBackdrop from '../components/ui/FestiveBackdrop';
import BottomNav from '../components/home/BottomNav';

export default function OrderHistory() {
  const navigate = useNavigate();
  const customer = useCustomerStore((s) => s.customer);
  const requestDetails = useCustomerGateStore((s) => s.requestDetails);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!customer?.mobile) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = subscribeOrdersByMobile(
      db,
      customer.mobile,
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
  }, [customer?.mobile]);

  const handleIdentify = () => requestDetails();

  // Any 2+ of the customer's own orders that admin billed together (they
  // share one invoiceId — see MergedEstimateCard on the admin side) show as
  // one card here too, matching the single combined invoice/estimate they
  // were actually billed. Anything not merged renders exactly as before.
  const displayGroups = useMemo(() => buildConfirmedInvoiceGroups(orders), [orders]);

  return (
    <div className="relative min-h-screen w-full pb-28">
      <FestiveBackdrop />
      <EmberParticles count={8} className="opacity-30" />

      <OrdersHeader orderCount={orders.length} onBack={() => navigate(-1)} />

      <div className="mt-3 flex flex-col gap-3 px-4">
        {!customer?.mobile ? (
          <EmptyOrders needsIdentity onIdentify={handleIdentify} />
        ) : loading ? (
          <>
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </>
        ) : errored ? (
          <div className="surface-3d rounded-2xl px-4 py-6 text-center text-[12px] text-muted">
            Couldn't load your orders right now. Please check your connection and try again.
          </div>
        ) : orders.length === 0 ? (
          <EmptyOrders onShopNow={() => navigate('/')} />
        ) : (
          displayGroups.map((group, i) =>
            group.type === 'single' ? (
              <OrderCard key={group.order.id} order={group.order} delay={i * 0.05} />
            ) : (
              <MergedOrderCard key={`invoice:${group.invoiceId}`} orders={group.orders} delay={i * 0.05} />
            ),
          )
        )}
      </div>

      <BottomNav />
    </div>
  );
}
