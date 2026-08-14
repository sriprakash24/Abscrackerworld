import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ClipboardList, Truck } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useCartStore } from '../../store/useCartStore';
import absLogo from '../../assets/abs-logo.png';
import navElephants from '../../assets/backgrounds/bottomnav-elephants.jpg';

const LEFT_TABS = [{ key: 'home', label: 'HOME', icon: Home }, { key: 'orders', label: 'ORDERS', icon: ClipboardList }];
const RIGHT_TABS = [{ key: 'cart', label: 'CART', icon: null }, { key: 'track', label: 'TRACK', icon: Truck }];

// Route -> tab key, so the highlight always reflects where the user
// actually is instead of only updating when they tap a tab from
// *this* mounted copy of BottomNav.
function tabForPath(pathname) {
  if (pathname === '/cart') return 'cart';
  if (pathname === '/orders') return 'orders';
  if (pathname === '/track-order') return 'track';
  return 'home';
}

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const active = tabForPath(location.pathname);
  const count = useCartStore((s) => Object.values(s.cart).reduce((a, b) => a + b, 0));

  const goTab = (tab) => {
    if (tab === 'home') {
      navigate('/');
      document.getElementById('app-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (tab === 'cart') {
      navigate('/cart');
      return;
    }
    if (tab === 'orders') {
      navigate('/orders');
      return;
    }
    if (tab === 'track') {
      navigate('/track-order');
      return;
    }
  };

  return (
    <div
      className="panel-3d fixed bottom-3 left-1/2 z-50 flex w-[92%] max-w-[400px] -translate-x-1/2 items-center justify-between rounded-[24px] px-3 py-2"
      style={{
        backgroundImage: `linear-gradient(160deg, rgba(18,9,5,0.62), rgba(8,4,2,0.7)), url(${navElephants})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 38%',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {LEFT_TABS.map((tab) => (
        <NavItem key={tab.key} tab={tab} active={active} onClick={goTab} />
      ))}

      {/* Raised center emblem */}
      <button
        onClick={() => goTab('home')}
        className="relative -mt-9 flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
        style={{
          background: 'radial-gradient(circle at 40% 30%, #241a10 0%, #100b07 65%, #060403 100%)',
        }}
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            border: '2px solid var(--color-orange)',
            boxShadow:
              '0 0 0 1px rgba(255,122,0,.35), 0 0 14px 2px rgba(255,122,0,.65), 0 0 30px 6px rgba(255,122,0,.35), 0 6px 16px -4px rgba(0,0,0,.7)',
          }}
        />
        <span className="flex flex-col items-center">
          <img src={absLogo} alt="" className="h-6 w-6 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(255,150,0,.8))' }} />
          <span className="mt-0.5 text-[7.5px] font-black leading-none tracking-[1px] text-orange" style={{ textShadow: '0 0 6px rgba(255,122,0,.8)' }}>
            ABS WORLD
          </span>
        </span>
      </button>

      <div className="relative">
        <button
          onClick={() => goTab('cart')}
          className={cn(
            'flex flex-col items-center gap-1 px-2 py-1 text-[9px] font-bold tracking-wide text-muted transition-colors',
            active === 'cart' && 'text-orange'
          )}
        >
          <span className="relative">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {count > 0 && (
              <span
                className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-[3px] text-[8.5px] font-extrabold text-white"
                style={{ background: 'linear-gradient(180deg,#ff8a5c,#e35226)', boxShadow: '0 0 6px rgba(255,87,34,.7)' }}
              >
                {count}
              </span>
            )}
          </span>
          CART
        </button>
      </div>
      <NavItem tab={RIGHT_TABS[1]} active={active} onClick={goTab} />
    </div>
  );
}

function NavItem({ tab, active, onClick }) {
  const Icon = tab.icon;
  const isActive = active === tab.key;
  return (
    <button
      onClick={() => onClick(tab.key)}
      className={cn(
        'flex flex-col items-center gap-1 px-2 py-1 text-[9px] font-bold tracking-wide text-muted transition-colors',
        isActive && 'text-orange'
      )}
    >
      <Icon size={20} strokeWidth={2.2} />
      {tab.label}
    </button>
  );
}
