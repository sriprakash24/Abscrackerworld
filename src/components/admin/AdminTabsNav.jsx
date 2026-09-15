import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ClipboardList,
  PackageOpen,
  Truck,
  Menu,
  X,
  PackageSearch,
  BadgePercent,
  Gauge,
  Boxes,
  LayoutGrid,
  Receipt,
  FileText,
  Users,
  BarChart3,
} from 'lucide-react';
import { useAdminData } from '../../contexts/AdminDataContext';
import { FINAL_STATUSES } from '../../constants/orderActions';
import { cn } from '../../utils/cn';
import absLogo from '../../assets/abs-logo.png';

// The long tail of admin screens, reached via the "More" sheet instead of
// cluttering the 5-slot bottom bar. Order here is the order they render in.
const MORE_LINKS = [
  { to: '/admin/product-insights', label: 'Product Insights', icon: BarChart3 },
  { to: '/admin/products', label: 'Products', icon: PackageSearch },
  { to: '/admin/price-update', label: 'Price Update', icon: BadgePercent },
  { to: '/admin/order-limits', label: 'Order Limits', icon: Gauge },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { to: '/admin/categories', label: 'Categories', icon: LayoutGrid },
  { to: '/admin/invoices', label: 'Invoices', icon: Receipt },
  { to: '/admin/estimates', label: 'Estimate Bill', icon: FileText },
  { to: '/admin/users', label: 'Users', icon: Users },
];

// Route -> tab key, so the highlight reflects where the admin actually is,
// not just which tab was last tapped from this mounted copy of the nav.
function tabForPath(pathname) {
  if (pathname === '/admin' || pathname === '/admin/') return 'overview';
  if (pathname.startsWith('/admin/orders')) return 'orders';
  if (pathname.startsWith('/admin/packing')) return 'packing';
  if (pathname.startsWith('/admin/delivery')) return 'deliver';
  if (MORE_LINKS.some((l) => pathname.startsWith(l.to))) return 'more';
  return 'overview';
}

/**
 * Fixed bottom nav for every /admin/* screen — replaces the old scrollable
 * top tab strip. Mirrors the shape of the customer-facing BottomNav (see
 * components/home/BottomNav.jsx): two tabs, a raised center logo emblem
 * (-> Overview), two more tabs, with the long tail of admin pages tucked
 * behind "More" as a slide-up sheet instead of an endless scrollable row.
 *
 * Kept as the same component name/import path (AdminTabsNav) so every
 * existing admin page that renders <AdminTabsNav /> picks this up for free.
 */
export default function AdminTabsNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { orders } = useAdminData();

  const active = tabForPath(location.pathname);
  const pendingOrders = orders.filter((o) => !FINAL_STATUSES.includes(o.status)).length;

  return (
    <>
      <div
        className="panel-3d fixed bottom-3 left-1/2 z-40 flex w-[94%] max-w-[440px] -translate-x-1/2 items-center justify-between rounded-[24px] bg-[#0c0906] px-3 py-2"
        style={{ boxShadow: '0 10px 30px -10px rgba(0,0,0,.75), 0 0 0 1px rgba(255,154,0,.12)' }}
      >
        <NavItem icon={ClipboardList} label="Orders" active={active === 'orders'} onClick={() => navigate('/admin/orders')} badge={pendingOrders} />
        <NavItem icon={PackageOpen} label="Packing" active={active === 'packing'} onClick={() => navigate('/admin/packing')} />

        {/* Raised center emblem — same idea as the customer nav's home button */}
        <button
          onClick={() => navigate('/admin')}
          className="relative -mt-9 flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'radial-gradient(circle at 40% 30%, #241a10 0%, #100b07 65%, #060403 100%)' }}
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{
              border: '2px solid var(--color-orange)',
              boxShadow: active === 'overview'
                ? '0 0 0 1px rgba(255,122,0,.35), 0 0 14px 2px rgba(255,122,0,.65), 0 0 30px 6px rgba(255,122,0,.35), 0 6px 16px -4px rgba(0,0,0,.7)'
                : '0 0 0 1px rgba(255,122,0,.2), 0 6px 16px -4px rgba(0,0,0,.7)',
            }}
          />
          <span className="flex flex-col items-center">
            <img src={absLogo} alt="ABS Crackers World" className="h-6 w-6 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(255,150,0,.8))' }} />
            <span className="mt-0.5 text-[7px] font-black leading-none tracking-[1px] text-orange" style={{ textShadow: '0 0 6px rgba(255,122,0,.8)' }}>
              OVERVIEW
            </span>
          </span>
        </button>

        <NavItem icon={Truck} label="Deliver" active={active === 'deliver'} onClick={() => navigate('/admin/delivery')} />
        <NavItem icon={Menu} label="More" active={active === 'more' || moreOpen} onClick={() => setMoreOpen(true)} />
      </div>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

function NavItem({ icon: Icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-2 py-1 text-[9px] font-bold tracking-wide text-muted transition-colors',
        active && 'text-orange'
      )}
    >
      <span className="relative">
        <Icon size={19} strokeWidth={2.2} />
        {!!badge && (
          <span
            className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-[3px] text-[8.5px] font-extrabold text-white"
            style={{ background: 'linear-gradient(180deg,#ff8a5c,#e35226)', boxShadow: '0 0 6px rgba(255,87,34,.7)' }}
          >
            {badge}
          </span>
        )}
      </span>
      {label.toUpperCase()}
    </button>
  );
}

/** Slide-up sheet listing every admin page that doesn't fit on the main bar. */
function MoreSheet({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-[520px] rounded-t-[28px] border-t border-orange/25 bg-[#0c0906] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 sm:px-6"
            style={{ boxShadow: '0 -14px 40px -12px rgba(0,0,0,.8)' }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13.5px] font-extrabold tracking-wide text-gradient-gold">More Tools</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-muted hover:text-orange"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pb-2 sm:grid-cols-4">
              {MORE_LINKS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'surface-3d flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5 text-center text-[10px] font-bold leading-tight transition-colors',
                      isActive ? 'text-orange ring-1 ring-orange/50' : 'text-muted hover:text-[#f2ece2]'
                    )
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
