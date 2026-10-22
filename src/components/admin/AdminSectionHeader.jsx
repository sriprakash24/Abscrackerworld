import { LogOut } from 'lucide-react';
import absLogo from '../../assets/abs-logo.png';

/** Sticky header for admin screens other than Orders (which keeps AdminOrdersHeader). */
export default function AdminSectionHeader({ icon: Icon, title, subtitle, email, onLogout }) {
  return (
    <div
      className="glass relative sticky top-0 z-30 flex items-center justify-between gap-3 overflow-hidden px-4 py-3.5 sm:px-6"
      style={{
        borderBottom: '1px solid rgba(255,138,101,.35)',
        boxShadow: '0 10px 26px -16px rgba(240,100,70,.45)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,179,71,0.22) 0%, transparent 70%)' }}
      />

      <div className="flex min-w-0 items-center gap-2.5">
        <img
          src={absLogo}
          alt="ABS Crackers World"
          className="hidden h-8 w-8 shrink-0 object-contain sm:block"
          
        />
        <span className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-orange">
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[14px] font-extrabold tracking-wide text-gradient-gold">{title}</h1>
          <p className="truncate text-[11px] font-semibold text-muted">{email ? `${email} · ` : ''}{subtitle}</p>
        </div>
      </div>

      <button
        onClick={onLogout}
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-brown/12 bg-white px-3.5 py-2 text-[11.5px] font-bold text-brown transition-colors hover:border-orange/50 hover:text-orange"
      >
        <LogOut size={13} />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </div>
  );
}
