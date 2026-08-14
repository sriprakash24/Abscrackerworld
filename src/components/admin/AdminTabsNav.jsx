import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, PackageSearch, Boxes, LayoutGrid, Receipt, Users } from 'lucide-react';

const TABS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList, end: false },
  { to: '/admin/products', label: 'Products', icon: PackageSearch, end: false },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes, end: false },
  { to: '/admin/categories', label: 'Categories', icon: LayoutGrid, end: false },
  { to: '/admin/invoices', label: 'Invoices', icon: Receipt, end: false },
  { to: '/admin/users', label: 'Users', icon: Users, end: false },
];

/** Sticky tab strip switching between the Orders / Products / Categories admin screens. */
export default function AdminTabsNav() {
  return (
    <div className="sticky top-[57px] z-20 border-b border-white/10 bg-[#050505]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold tracking-wide transition-colors ${
                isActive
                  ? 'bg-orange/15 text-orange border border-orange/40'
                  : 'border border-transparent text-muted hover:text-[#f2ece2]'
              }`
            }
          >
            <Icon size={13} />
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
