import { useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/useCartStore';
import absLogo from '../../assets/abs-logo.png';
import headerBgLeft from '../../assets/hero/header-bg-left.jpg';
import headerBgRight from '../../assets/hero/header-bg-right.jpg';
import SideMenu from './SideMenu';

export default function TopBar({ onOpenSearch }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const cart = useCartStore((s) => s.cart);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div className="relative -mx-0 overflow-hidden" style={{ height: 168 }}>
      {/* Full-bleed festival backdrop — the panoramic elephant/fireworks
          scene split down the middle so each elephant anchors its own
          screen edge (like a pair of ornamental "guardians" framing the
          header) while the fireworks sky reads as one continuous scene
          across the seam. No side padding/border so it runs edge to edge. */}
      <div className="absolute inset-0 z-0 flex">
        <div
          className="h-full w-1/2 bg-cover bg-no-repeat"
          style={{ backgroundImage: `url(${headerBgLeft})`, backgroundPosition: 'left top' }}
        />
        <div
          className="h-full w-1/2 bg-cover bg-no-repeat"
          style={{ backgroundImage: `url(${headerBgRight})`, backgroundPosition: 'right top' }}
        />
      </div>
      {/* Gentle scrim so the logo/icons stay legible over the busy photo */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(180deg, rgba(10,0,2,.55) 0%, rgba(10,0,2,.15) 32%, rgba(10,0,2,.1) 62%, rgba(10,0,2,.7) 100%)',
        }}
      />

      <div className="relative z-10 flex h-full items-start justify-between px-4 pb-2 pt-3">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="orb-3d flex h-9 w-9 items-center justify-center !rounded-full text-orange"
        >
          <Menu size={18} strokeWidth={2.2} />
        </button>

        <div className="flex flex-1 flex-col items-center text-center">
          <span
            className="text-[9.5px] font-bold tracking-[2.5px] text-orange"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,.85)' }}
          >
            DHEERAN ENTERPRISES
          </span>
          <img
            src={absLogo}
            alt="ABS Crackers World"
            className="mt-0.5 w-[104px]"
            style={{ filter: 'drop-shadow(0 0 14px rgba(255,122,0,.65)) drop-shadow(0 2px 10px rgba(0,0,0,.8))' }}
          />
          <div
            className="mt-0.5 flex items-center gap-2 text-[8.5px] font-semibold tracking-[1px] text-[#f2e9da]"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,.9)' }}
          >
            <span className="h-px w-4 bg-gradient-to-r from-transparent to-orange/70" />
            Festival Fireworks Store
            <span className="h-px w-4 bg-gradient-to-l from-transparent to-orange/70" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            aria-label="Search products"
            className="orb-3d flex h-9 w-9 items-center justify-center !rounded-full text-orange"
          >
            <Search size={17} strokeWidth={2.2} />
          </button>

          <button
            onClick={() => navigate('/cart')}
            aria-label="Open cart"
            className="orb-3d relative flex h-9 w-9 items-center justify-center !rounded-full text-orange"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
        </div>
      </div>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
