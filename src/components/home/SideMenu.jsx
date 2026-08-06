import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Home, LayoutGrid, Truck, ClipboardList, ShoppingCart, MessageCircleMore, PhoneCall } from 'lucide-react';
import absLogo from '../../assets/abs-logo.png';

const NAV_LINKS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'categories', label: 'Shop by Category', icon: LayoutGrid },
  { key: 'track-order', label: 'Track Order', icon: Truck },
  { key: 'orders', label: 'My Orders', icon: ClipboardList },
  { key: 'cart', label: 'Cart', icon: ShoppingCart },
];

export default function SideMenu({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (key) => {
    onClose();
    if (key === 'home') {
      navigate('/');
      document.getElementById('app-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (key === 'categories') {
      if (location.pathname === '/') {
        document.getElementById('app-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
        window.setTimeout(() => navigate('/', { state: { scrollTo: 'categories' } }), 50);
      } else {
        navigate('/', { state: { scrollTo: 'categories' } });
      }
      return;
    }
    navigate(`/${key}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, x: -60, rotateY: 18 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: -60, rotateY: 12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformPerspective: 1000, transformOrigin: 'left center' }}
            className="panel-3d fixed left-0 top-0 z-50 flex h-full w-[248px] flex-col rounded-l-none rounded-r-[22px] py-4"
          >
            <div className="mb-2 flex items-center justify-between px-4">
              <img src={absLogo} alt="ABS Crackers World" className="h-8 w-auto object-contain" />
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-orange"
              >
                <X size={14} strokeWidth={3} />
              </button>
            </div>
            <div className="mx-4 mb-2 h-px bg-gradient-to-r from-transparent via-orange/30 to-transparent" />

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-1">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <motion.button
                    key={link.key}
                    onClick={() => handleNav(link.key)}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ x: 2 }}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                  >
                    <span className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-lg text-orange">
                      <Icon size={16} strokeWidth={2.2} />
                    </span>
                    <span className="text-[12.5px] font-bold text-[#f2ece2]">{link.label}</span>
                  </motion.button>
                );
              })}
            </nav>

            <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-orange/30 to-transparent" />

            <div className="flex flex-col gap-1 px-3">
              <a
                href="https://wa.me/919597189599"
                target="_blank"
                rel="noreferrer"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#25d366]"
                  style={{ background: 'rgba(37,211,102,.12)', border: '1px solid rgba(37,211,102,.3)' }}
                >
                  <MessageCircleMore size={16} strokeWidth={2.2} />
                </span>
                <span className="text-[12.5px] font-bold text-[#f2ece2]">WhatsApp Support</span>
              </a>
              <a
                href="tel:+919597189599"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
              >
                <span className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-lg text-orange">
                  <PhoneCall size={16} strokeWidth={2.2} />
                </span>
                <span className="text-[12.5px] font-bold text-[#f2ece2]">Call Us</span>
              </a>
            </div>

            <div className="mt-3 px-4 text-[9.5px] font-semibold uppercase tracking-wide text-muted">
              Dheeran Enterprises · Festival Fireworks Store
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
