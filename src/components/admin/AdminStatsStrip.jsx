import { Clock, Loader, CheckCircle2, IndianRupee } from 'lucide-react';

export default function AdminStatsStrip({ orders }) {
  const awaiting = orders.filter((o) => o.status === 'AWAITING_ADMIN_CONFIRMATION').length;
  const inProgress = orders.filter((o) => ['CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY'].includes(o.status)).length;
  const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
  const pendingRevenue = orders
    .filter((o) => o.paymentStatus === 'PENDING' && o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  const stats = [
    { label: 'Awaiting Confirmation', value: awaiting, icon: Clock, className: 'text-gold' },
    { label: 'In Progress', value: inProgress, icon: Loader, className: 'text-orange' },
    { label: 'Delivered', value: delivered, icon: CheckCircle2, className: 'text-[#8fe3a0]' },
    { label: 'Payment Pending', value: `₹${pendingRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, className: 'text-[#e35226]' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, className }) => (
        <div key={label} className="surface-3d flex items-center gap-2.5 rounded-xl px-3.5 py-3">
          <span className={`orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-full ${className}`}>
            <Icon size={14} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-extrabold text-[#f2ece2]">{value}</div>
            <div className="truncate text-[9.5px] font-semibold text-muted">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
