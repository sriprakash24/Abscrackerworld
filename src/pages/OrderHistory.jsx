import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { useCustomerStore } from '../store/useCustomerStore';
import { useCustomerGateStore } from '../store/useCustomerGateStore';
import { subscribeOrdersByMobile } from '../services/ordersFirestore';
import OrdersHeader from '../components/orders/OrdersHeader';
import OrderCard from '../components/orders/OrderCard';
import OrderCardSkeleton from '../components/orders/OrderCardSkeleton';
import EmptyOrders from '../components/orders/EmptyOrders';
import EmberParticles from '../components/ui/EmberParticles';
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

  return (
    <div className="relative min-h-screen w-full pb-28">
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
          orders.map((order, i) => <OrderCard key={order.id} order={order} delay={i * 0.05} />)
        )}
      </div>

      <BottomNav />
    </div>
  );
}
