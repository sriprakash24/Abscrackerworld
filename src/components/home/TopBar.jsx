import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/useCartStore';
import absLogo from '../../assets/abs-logo.png';
import SideMenu from './SideMenu';

export default function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const cart = useCartStore((s) => s.cart);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div className="relative flex items-start justify-between overflow-hidden px-4 pb-3 pt-4">
      <button
        onClick={() => setMenuOpen(true)}
        aria-label="Open menu"
        className="orb-3d flex h-10 w-10 items-center justify-center !rounded-full text-orange"
      >
        <Menu size={20} strokeWidth={2.2} />
      </button>

      <div className="flex flex-1 flex-col items-center text-center">
        <span className="text-[11px] font-bold tracking-[3px] text-orange">DHEERAN ENTERPRISES</span>
        <img
          src={absLogo}
          alt="ABS Crackers World"
          className="mt-1 w-[150px]"
          style={{ filter: 'drop-shadow(0 0 14px rgba(255,122,0,.5))' }}
        />
        <div className="mt-0.5 flex items-center gap-2 text-[9.5px] font-semibold tracking-[1px] text-[#e8ddce]">
          <span className="h-px w-4 bg-gradient-to-r from-transparent to-orange/70" />
          Festival Fireworks Store
          <span className="h-px w-4 bg-gradient-to-l from-transparent to-orange/70" />
        </div>
      </div>

      <button
        onClick={() => navigate('/cart')}
        aria-label="Open cart"
        className="orb-3d relative flex h-10 w-10 items-center justify-center !rounded-full text-orange"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        <span
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-[3px] text-[10px] font-extrabold text-white"
          style={{
            background: 'linear-gradient(180deg,#ff8a5c,#e35226)',
            boxShadow: '0 1px 0 rgba(255,255,255,.4) inset, 0 0 8px rgba(255,87,34,.7)',
          }}
        >
          {count}
        </span>
      </button>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
