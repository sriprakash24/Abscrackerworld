import { LogOut, ShieldCheck } from 'lucide-react';

export default function AdminOrdersHeader({ email, orderCount, onLogout }) {
  return (
    <div
      className="glass relative sticky top-0 z-30 flex items-center justify-between gap-3 overflow-hidden px-4 py-3.5 sm:px-6"
      style={{
        borderBottom: '1px solid rgba(255,154,0,.22)',
        boxShadow: '0 10px 26px -14px rgba(0,0,0,.7), 0 0 20px rgba(255,122,0,.1)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,122,0,0.14) 0%, transparent 70%)' }}
      />

      <div className="flex min-w-0 items-center gap-2.5">
        <span className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-orange">
          <ShieldCheck size={17} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[14px] font-extrabold tracking-wide text-gradient-gold">Order Management</h1>
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#8fe3a0]/35 bg-[#8fe3a0]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#8fe3a0]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8fe3a0]" />
              LIVE
            </span>
          </div>
          <p className="truncate text-[11px] font-semibold text-muted">
            {email} · {orderCount} {orderCount === 1 ? 'order' : 'orders'} total
          </p>
        </div>
      </div>

      <button
        onClick={onLogout}
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-[#0c0906] px-3.5 py-2 text-[11.5px] font-bold text-[#f2ece2] transition-colors hover:border-orange/50 hover:text-orange"
      >
        <LogOut size={13} />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </div>
  );
}
