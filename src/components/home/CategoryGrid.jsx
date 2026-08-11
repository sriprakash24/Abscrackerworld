import { forwardRef, useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import SectionHead from './SectionHead';
import CategoryQuickNav from './CategoryQuickNav';
import ProductCard from '../category/ProductCard';
import FestiveBackdrop from '../ui/FestiveBackdrop';
import { useProducts } from '../../contexts/ProductsContext';
import { getCategoryTheme } from '../../utils/categoryTheme';

// One category's product grid, always expanded, with its own sticky
// header. The header pins to the top of the scroll area while its
// products are in view — as the user scrolls past, the next category's
// header takes its place, so it's always obvious which section they're
// browsing (and what's coming up next). Each category gets its own
// accent color (see utils/categoryTheme) so sections read as visually
// distinct instead of blending into one uniform dark/orange block.
function CategorySection({ category, headerRef }) {
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
        className="sticky top-2 z-20 mb-3 overflow-hidden rounded-2xl"
        style={{
          border: `1px solid ${theme.solid}55`,
          boxShadow: `0 10px 22px -10px rgba(0,0,0,0.65), 0 0 18px ${theme.solid}30`,
        }}
      >
        {/* Full-bleed photo backdrop — the first product's photo, so the
            row feels alive instead of a flat text bar. Falls back to a
            plain theme-tinted background if no image is available yet. */}
        {category.items[0]?.img ? (
          <LazyLoadImage
            src={category.items[0].img}
            alt=""
            wrapperClassName="!absolute !inset-0 !block"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at 70% 40%, ${theme.from}33, #1c0201)` }}
          />
        )}

        {/* Dark-to-photo gradient so the icon + name stay legible on the
            left while the photo shows through toward the right. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(100deg, rgba(10,2,2,0.96) 0%, rgba(16,3,3,0.88) 38%, rgba(16,3,3,0.45) 68%, transparent 100%)`,
          }}
        />

        {/* Continuous, slow-moving glow sweep in the category's own
            color — the "advanced" animated touch, kept gentle so it reads
            as ambient light rather than a flashy loading shimmer. */}
        <div
          className="pointer-events-none absolute inset-0 animate-shimmer"
          style={{
            background: `linear-gradient(110deg, transparent 25%, ${theme.solid}40 50%, transparent 75%)`,
            backgroundSize: '250% 100%',
            animationDuration: '4.5s',
            mixBlendMode: 'screen',
          }}
        />

        <div className="relative z-10 flex items-center justify-between gap-2 px-3.5 py-2.5">
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
              style={{ color: theme.from, textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}
            >
              {category.name}
            </span>
          </div>

          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-[0_1px_0_rgba(255,220,170,.15)_inset]"
            style={{
              border: `1px solid ${theme.solid}70`,
              background: `${theme.solid}3a`,
              color: theme.from,
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          >
            {category.items.length} items
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {category.items.map((product) => (
          <ProductCard key={product.id} product={product} theme={theme} />
        ))}
      </div>
    </div>
  );
}

const CategoryGrid = forwardRef(function CategoryGrid(_, ref) {
  const { categories, loading } = useProducts();
  const [activeSlug, setActiveSlug] = useState(null);
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

  // Lets the home search bar (and anything else) land on a specific
  // product without leaving this page: it scrolls to the card and gives
  // it a brief glow so the jump doesn't feel jarring. Every category
  // already renders all its products, so there's no "expand" step needed
  // first — it just has to scroll.
  useEffect(() => {
    function onSearchJump(e) {
      const { productId } = e.detail || {};
      if (!productId) return;

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
    <div ref={ref} className="relative mb-5 px-4">
      {/* Festive backdrop photo — this is where it starts (right at "Shop
          by Category") and it runs all the way through every category
          section and product card below. See FestiveBackdrop for why
          it's tiled rather than stretched. Bled past this section's own
          px-4 padding so it's edge-to-edge, not inset. */}
      <FestiveBackdrop inset={{ top: -12, left: -16, right: -16 }} />

      <SectionHead
        title={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={12} className="text-gold" style={{ filter: 'drop-shadow(0 0 4px rgba(255,213,79,.6))' }} />
            Shop by Category
            <Sparkles size={12} className="text-gold" style={{ filter: 'drop-shadow(0 0 4px rgba(255,213,79,.6))' }} />
          </span>
        }
        action={loading ? 'Loading…' : `${categories.length} Categories ›`}
      />

      <div className="flex flex-col gap-6">
        {categories.map((cat) => (
          <CategorySection
            key={cat.slug}
            category={cat}
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
