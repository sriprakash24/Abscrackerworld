import { forwardRef, useEffect, useRef, useState } from 'react';
import SectionHead from './SectionHead';
import CategoryQuickNav from './CategoryQuickNav';
import ProductCard from '../category/ProductCard';
import { useProducts } from '../../contexts/ProductsContext';
import { getCategoryTheme } from '../../utils/categoryTheme';

const INITIAL_VISIBLE = 6;

// One category's product grid, always expanded, with its own sticky
// header. The header pins to the top of the scroll area while its
// products are in view — as the user scrolls past, the next category's
// header takes its place, so it's always obvious which section they're
// browsing (and what's coming up next). Each category gets its own
// accent color (see utils/categoryTheme) so sections read as visually
// distinct instead of blending into one uniform dark/orange block.
function CategorySection({ category, headerRef, expanded, onToggleExpand }) {
  const items = expanded ? category.items : category.items.slice(0, INITIAL_VISIBLE);
  const hasMore = category.items.length > INITIAL_VISIBLE;
  const theme = getCategoryTheme(category.name);

  return (
    <div
      id={`category-section-${category.slug}`}
      data-slug={category.slug}
      style={{ scrollMarginTop: 76 }}
    >
      <div
        ref={headerRef}
        data-slug={category.slug}
        className="sticky top-2 z-20 mb-3 flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5"
        style={{
          background: 'linear-gradient(160deg, rgba(16,22,42,0.94), rgba(8,11,22,0.94))',
          backdropFilter: 'blur(14px) saturate(150%)',
          WebkitBackdropFilter: 'blur(14px) saturate(150%)',
          border: `1px solid ${theme.solid}55`,
          boxShadow: `0 10px 22px -10px rgba(0,0,0,0.65), 0 0 18px ${theme.solid}30`,
        }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[17px]"
            style={{
              background: `radial-gradient(circle at 32% 26%, ${theme.from}33 0%, #171009 62%, #0a0705 100%)`,
              border: `1px solid ${theme.solid}80`,
              boxShadow: `0 1px 0 rgba(255,255,255,.12) inset, 0 0 12px ${theme.solid}45`,
            }}
          >
            {/* quiet breathing ring in the category's own color */}
            <span
              className="pointer-events-none absolute inset-0 animate-glow-pulse rounded-xl"
              style={{ boxShadow: `0 0 0 1px ${theme.solid}66` }}
            />
            {category.icon}
          </span>
          <span
            className="text-embossed truncate text-[13px] font-extrabold uppercase tracking-wide"
            style={{ color: theme.from }}
          >
            {category.name}
          </span>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-[0_1px_0_rgba(255,220,170,.15)_inset]"
          style={{
            border: `1px solid ${theme.solid}55`,
            background: `${theme.solid}1f`,
            color: theme.from,
          }}
        >
          {category.items.length} items
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} theme={theme} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={onToggleExpand}
            className="btn-3d-outline rounded-lg px-4 py-2 text-[11px] font-bold text-[#f2ece2]"
          >
            {expanded ? 'Show Less' : `Show All ${category.items.length}`}
          </button>
        </div>
      )}
    </div>
  );
}

const CategoryGrid = forwardRef(function CategoryGrid(_, ref) {
  const { categories, loading } = useProducts();
  const [activeSlug, setActiveSlug] = useState(null);
  const [expandedSlugs, setExpandedSlugs] = useState(() => new Set());
  const headerRefs = useRef({});

  useEffect(() => {
    if (!categories.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSlug(entry.target.dataset.slug);
          }
        });
      },
      // Fires the moment a header crosses just below the top of the
      // scroll area — i.e. the moment it "takes over" as the sticky one.
      { rootMargin: '-8px 0px -85% 0px', threshold: 0 }
    );

    Object.values(headerRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  const handleJump = (slug) => {
    document.getElementById(`category-section-${slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleExpand = (slug) => {
    setExpandedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  // Lets the home search bar (and anything else) land on a specific
  // product without leaving this page: it expands that product's
  // category if needed, scrolls to the card, and gives it a brief glow
  // so the jump doesn't feel jarring.
  useEffect(() => {
    function onSearchJump(e) {
      const { productId, categorySlug } = e.detail || {};
      if (!productId || !categorySlug) return;

      setExpandedSlugs((prev) => {
        if (prev.has(categorySlug)) return prev;
        const next = new Set(prev);
        next.add(categorySlug);
        return next;
      });

      requestAnimationFrame(() => {
        setTimeout(() => {
          const el = document.getElementById(`product-card-${productId}`);
          if (!el) return;
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.remove('search-highlight');
          // restart the animation even if it was already applied recently
          void el.offsetWidth;
          el.classList.add('search-highlight');
          setTimeout(() => el.classList.remove('search-highlight'), 1800);
        }, 80);
      });
    }

    window.addEventListener('abs-search-jump', onSearchJump);
    return () => window.removeEventListener('abs-search-jump', onSearchJump);
  }, []);

  return (
    <div ref={ref} className="mb-5 px-4">
      <SectionHead
        title="Shop by Category"
        action={loading ? 'Loading…' : `${categories.length} Categories`}
      />

      <div className="flex flex-col gap-6">
        {categories.map((cat) => (
          <CategorySection
            key={cat.slug}
            category={cat}
            expanded={expandedSlugs.has(cat.slug)}
            onToggleExpand={() => toggleExpand(cat.slug)}
            headerRef={(el) => {
              headerRefs.current[cat.slug] = el;
            }}
          />
        ))}
      </div>

      <CategoryQuickNav categories={categories} activeSlug={activeSlug} onJump={handleJump} />
    </div>
  );
});

export default CategoryGrid;
