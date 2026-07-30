import { ArrowLeft, ClipboardList } from 'lucide-react';

export default function OrdersHeader({ orderCount, onBack }) {
  return (
    <div
      className="glass relative sticky top-0 z-30 flex items-center gap-2.5 overflow-hidden px-3 py-3"
      style={{
        borderBottom: '1px solid rgba(255,154,0,.22)',
        boxShadow: '0 10px 26px -14px rgba(0,0,0,.7), 0 0 20px rgba(255,122,0,.1)',
      }}
    >
      {/* Orange ambient glow behind the header */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,122,0,0.14) 0%, transparent 70%)' }}
      />

      <button
        onClick={onBack}
        className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-orange"
        aria-label="Go back"
      >
        <ArrowLeft size={18} strokeWidth={2.4} />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-orange">
          <ClipboardList size={16} strokeWidth={2.3} />
        </span>
        <div className="min-w-0">
          <div className="text-embossed truncate text-[14.5px] font-extrabold leading-tight text-[#f2ece2]">
            My Orders
          </div>
          <div className="text-[10px] font-semibold text-muted">
            {orderCount > 0
              ? `${orderCount} ${orderCount === 1 ? 'order' : 'orders'} placed so far`
              : 'Track your cracker orders here'}
          </div>
        </div>
      </div>
    </div>
  );
}
