import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { slugify } from '../constants/catalog';
import TopBar from '../components/home/TopBar';
import SearchBar from '../components/home/SearchBar';
import HeroSlider from '../components/home/HeroSlider';
import TrustStrip from '../components/home/TrustStrip';
import QuickCategoryStrip from '../components/home/QuickCategoryStrip';
import DealSection from '../components/home/DealSection';
import CategoryGrid from '../components/home/CategoryGrid';
import FooterStrip from '../components/home/FooterStrip';
import FloatingButtons from '../components/home/FloatingButtons';
import BottomNav from '../components/home/BottomNav';
import EmberParticles from '../components/ui/EmberParticles';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export default function Home() {
  const categoryGridRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.scrollTo === 'categories') {
      categoryGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const handleJump = (categoryName) => {
    if (categoryName) {
      navigate(`/category/${slugify(categoryName)}`);
      return;
    }
    categoryGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="relative min-h-screen w-full pb-6">
      <EmberParticles count={10} className="opacity-40" />

      <TopBar />
      <SearchBar />
      <HeroSlider />
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fadeUp}>
        <TrustStrip />
      </motion.div>
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fadeUp}>
        <QuickCategoryStrip onJump={handleJump} />
      </motion.div>
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fadeUp}>
        <DealSection />
      </motion.div>
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} variants={fadeUp}>
        <CategoryGrid ref={categoryGridRef} />
      </motion.div>
      <FooterStrip />

      <FloatingButtons />
      <BottomNav />
    </div>
  );
}
