import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import TopBar from '../components/home/TopBar';
import SearchBar from '../components/home/SearchBar';
import HeroSlider from '../components/home/HeroSlider';
import TrustStrip from '../components/home/TrustStrip';
import CategoryGrid from '../components/home/CategoryGrid';
import FloatingButtons from '../components/home/FloatingButtons';
import BottomNav from '../components/home/BottomNav';
import QuickSearchOverlay from '../components/home/QuickSearchOverlay';
import EmberParticles from '../components/ui/EmberParticles';
import { useProducts } from '../contexts/ProductsContext';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export default function Home() {
  const categoryGridRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { products } = useProducts();
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);

  useEffect(() => {
    if (location.state?.scrollTo === 'categories') {
      categoryGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  return (
    <div className="relative min-h-screen w-full pb-28">
      <EmberParticles count={10} className="opacity-40" />

      <TopBar onOpenSearch={() => setQuickSearchOpen(true)} />
      <SearchBar products={products} />
      <HeroSlider />
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fadeUp}>
        <TrustStrip />
      </motion.div>

      {/* Category grid renders directly (no scroll-triggered fade wrapper) —
          it's the main content of the page and must always be visible
          immediately, and a `transform`-animated ancestor here would also
          break `position: sticky` on the category headers inside it. */}
      <CategoryGrid ref={categoryGridRef} onOpenSearch={() => setQuickSearchOpen(true)} />

      <FloatingButtons />
      <BottomNav />
      <QuickSearchOverlay open={quickSearchOpen} onClose={() => setQuickSearchOpen(false)} products={products} />
    </div>
  );
}
