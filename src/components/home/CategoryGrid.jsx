import { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { ArrowRight, ChevronDown, ExternalLink } from 'lucide-react';
import SectionHead from './SectionHead';
import CategoryQuickNav from './CategoryQuickNav';
import ProductCard from '../category/ProductCard';
import { useProducts } from '../../contexts/ProductsContext';

const INITIAL_VISIBLE = 6;
const springLayout = { duration: 0.45, ease: [0.16, 1, 0.3, 1] };

function CategoryTile({ cat, isOpen, onToggle }) {
  return (
    <motion.button
      layout
      transition={{ layout: springLayout }}
      id={`cat-${cat.name}`}
      onClick={() => onToggle(cat)}
      aria-expanded={isOpen}
      whileHover={!isOpen ? { y: -3, rotateX: 4 } : {}}
      whileTap={{ scale: 0.98 }}
      style={{ transformPerspective: 800, scrollMarginTop: 84 }}
      className={`surface-3d rounded-2xl p-3 text-left ${
        isOpen ? 'surface-3d-open col-span-2 flex items-center gap-3' : 'col-span-1 flex flex-col items-start gap-2'
      }`}
    >
      {isOpen ? (
        <>
          <motion.span layout="position" className="orb-3d flex h-14 w-14 shrink-0 items-center justify-center !rounded-xl text-3xl">
            <span className="art-float">{cat.icon}</span>
          </motion.span>
          <motion.div layout="position" className="min-w-0 flex-1">
            <div className="text-embossed truncate text-[13px] font-extrabold text-[#f2ece2]">{cat.name}</div>
            <div className="truncate text-[10.5px] text-muted">{cat.tagline}</div>
          </motion.div>
          <motion.span
            layout="position"
            animate={{ rotate: 180 }}
            transition={{ duration: 0.3 }}
            className="orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-full text-orange"
          >
            <ChevronDown size={16} strokeWidth={3} />
          </motion.span>
        </>
      ) : (
        <>
          <div className="orb-3d flex h-[78px] w-full items-center justify-center !rounded-xl text-3xl">
            <span className="art-float">{cat.icon}</span>
          </div>
          <div className="text-embossed text-[12.5px] font-extrabold leading-tight tracking-wide text-[#f2ece2]">
            {cat.icon} {cat.name}
          </div>
          <div className="flex w-full items-center justify-between">
            <span className="rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold shadow-[0_1px_0_rgba(255,220,170,.15)_inset]">
              {cat.items.length} items
            </span>
            <span className="orb-3d flex h-[22px] w-[22px] items-center justify-center !rounded-full text-orange">
              <ArrowRight size={12} strokeWidth={3} />
            </span>
          </div>
        </>
      )}
    </motion.button>
  );
}

function CategoryPanel({ category, onClose }) {
  const [showAll, setShowAll] = useState(false);
  const items = showAll ? category.items : category.items.slice(0, INITIAL_VISIBLE);
  const hasMore = category.items.length > INITIAL_VISIBLE;

  return (
    <motion.div
      layout
      key={`panel-${category.slug}`}
      initial={{ opacity: 0, height: 0, rotateX: -12, y: -10 }}
      animate={{ opacity: 1, height: 'auto', rotateX: 0, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
      exit={{ opacity: 0, height: 0, rotateX: -8, y: -6, transition: { duration: 0.3, ease: 'easeInOut' } }}
      style={{ transformPerspective: 1000, transformOrigin: 'top center', overflow: 'hidden' }}
      className="col-span-2"
    >
      <div className="surface-3d mt-1 rounded-2xl p-3">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          className="grid grid-cols-2 gap-3"
        >
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </motion.div>

        <div className="mt-3 flex items-center justify-between gap-2">
          {hasMore && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="btn-3d-outline rounded-lg px-3.5 py-2 text-[11px] font-bold text-[#f2ece2]"
            >
              {showAll ? 'Show Less' : `Show All ${category.items.length}`}
            </button>
          )}
          <Link
            to={`/category/${category.slug}`}
            className="btn-3d ml-auto flex items-center gap-1 rounded-lg px-3.5 py-2 text-[11px] font-bold text-white"
          >
            Full Page <ExternalLink size={12} strokeWidth={2.5} />
          </Link>
          <button onClick={onClose} className="btn-3d-outline rounded-lg px-3.5 py-2 text-[11px] font-bold text-[#f2ece2]">
            Collapse
          </button>
        </div>
      </div>
    </motion.div>
  );
}

const CategoryGrid = forwardRef(function CategoryGrid(_, ref) {
  const { categories, loading } = useProducts();
  const [expandedSlug, setExpandedSlug] = useState(null);

  const handleToggle = (cat) => {
    setExpandedSlug((current) => (current === cat.slug ? null : cat.slug));
  };

  const handleJump = (slug) => {
    setExpandedSlug(slug);
    // Wait a tick for the grid to reflow/expand before scrolling to it.
    requestAnimationFrame(() => {
      setTimeout(() => {
        const cat = categories.find((c) => c.slug === slug);
        document.getElementById(`cat-${cat?.name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    });
  };

  return (
    <div ref={ref} className="mb-5 px-4">
      <SectionHead
        title="Shop by Category"
        action={loading ? 'Loading…' : `${categories.length} Categories`}
      />
      <LayoutGroup id="category-grid">
        <motion.div layout className="grid grid-cols-2 grid-flow-row-dense gap-3" style={{ perspective: 1200 }}>
          {categories.map((cat) => {
            const isOpen = cat.slug === expandedSlug;
            return (
              <AnimatePresence key={cat.slug} mode="popLayout">
                <CategoryTile key={cat.slug} cat={cat} isOpen={isOpen} onToggle={handleToggle} />
                {isOpen && (
                  <CategoryPanel key={`panel-${cat.slug}`} category={cat} onClose={() => setExpandedSlug(null)} />
                )}
              </AnimatePresence>
            );
          })}
        </motion.div>
      </LayoutGroup>

      <CategoryQuickNav categories={categories} activeSlug={expandedSlug} onJump={handleJump} />
    </div>
  );
});

export default CategoryGrid;
