import { forwardRef, useEffect, useRef, useState } from 'react';
import { Sparkles, Search } from 'lucide-react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import SectionHead from './SectionHead';
import CategoryQuickNav from './CategoryQuickNav';
import CategoryIcon from './CategoryIcon';
import ProductCard from '../category/ProductCard';
import ComboCard from '../combo/ComboCard';
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
function CategorySection({ category, headerRef, isActive, onOpenSearch }) {
  const theme = getCategoryTheme(category.name);
  const isCombo = !!category.isCombo;

  // Rough placeholder height for `content-visibility: auto` below — only
  // used before this section has ever been rendered/measured, so the page
  // doesn't jump around as sections further down the list get skipped.
  // Doesn't need to be exact, just in the right ballpark (2-col grid).
  const estimatedRows = Math.ceil(category.items.length / 2);
  const estimatedHeight = 70 + estimatedRows * (isCombo ? 330 : 195) + Math.max(estimatedRows - 1, 0) * 12;

  return (
    <div
      id={`category-section-${category.slug}`}
      data-slug={category.slug}
      style={{
        scrollMarginTop: 76,
        // Off-screen sections skip layout/paint/style work entirely until
        // they're near the viewport — this is the fix for "N categories'
        // worth of cards all costing scroll performance at once" (see
        // ProductCard.jsx for why each card isn't cheap on its own).
        contentVisibility: 'auto',
        containIntrinsicHeight: `${estimatedHeight}px`,
      }}
    >
      {/* Sticky category header — one single card. Search lives inside it as
          a round button at the end of the same row. The pinned COMBO ABS
          section gets a solid coral→red header so it stands out as the
          first thing on the page. */}
      <div
        ref={headerRef}
        data-slug={category.slug}
        className="sticky top-2 z-20 mb-3 relative overflow-hidden rounded-2xl"
        style={{
          background: isCombo ? 'linear-gradient(120deg, #ff8a65 0%, #f04452 100%)' : '#ffffff',
          border: `1px solid ${isCombo ? '#f04452' : theme.solid + '66'}`,
          boxShadow: `0 10px 22px -12px ${isCombo ? 'rgba(240,68,82,0.6)' : theme.solid + '80'}`,
        }}
      >
        {!isCombo && (category.image || category.items[0]?.img) && (
          <>
            <LazyLoadImage
              src={category.image || category.items[0].img}
              alt=""
              wrapperClassName="!absolute !inset-0 !block"
              className="absolute inset-0 h-full w-full object-cover opacity-70"
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(100deg, #ffffff 0%, rgba(255,255,255,0.94) 42%, rgba(255,255,255,0.35) 72%, transparent 100%)' }}
            />
          </>
        )}
        {!isCombo && (
          <span
            className="pointer-events-none absolute inset-y-0 left-0 w-[5px]"
            style={{ background: `linear-gradient(180deg, ${theme.from}, ${theme.to})` }}
          />
        )}

        {/* Slow glow sweep — only on the currently pinned header */}
        {isActive && (
          <div
            className="pointer-events-none absolute inset-0 animate-shimmer"
            style={{
              background: `linear-gradient(110deg, transparent 25%, ${isCombo ? 'rgba(255,255,255,0.35)' : theme.solid + '30'} 50%, transparent 75%)`,
              backgroundSize: '250% 100%',
              animationDuration: '4.5s',
            }}
          />
        )}

        <div className="relative z-10 flex items-center justify-between gap-2 px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl text-[17px]"
              style={{
                background: isCombo ? 'rgba(255,255,255,0.95)' : `linear-gradient(135deg, #ffffff, ${theme.from}33)`,
                border: `1px solid ${isCombo ? '#fff' : theme.solid + '80'}`,
                boxShadow: '0 4px 10px -4px rgba(113,50,31,0.25)',
              }}
            >
              <CategoryIcon
                image={category.image}
                icon={category.icon}
                name={category.name}
                className="flex h-full w-full items-center justify-center leading-none"
              />
            </span>
            <span className="min-w-0">
              <span
                className="block truncate text-[13px] font-extrabold uppercase tracking-wide"
                style={{ color: isCombo ? '#ffffff' : theme.ink }}
              >
                {category.name}
              </span>
              {isCombo ? (
                <span className="block truncate text-[10.5px] font-semibold text-white/90">{category.tagline}</span>
              ) : (
                category.nameTa && (
                  <span className="block truncate text-[10.5px] font-semibold text-brown/80">{category.nameTa}</span>
                )
              )}
            </span>
          </div>

          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={
              isCombo
                ? { background: 'rgba(255,255,255,0.95)', color: '#f04452' }
                : { border: `1px solid ${theme.solid}70`, background: `${theme.solid}22`, color: theme.ink }
            }
          >
            {category.items.length} {isCombo ? (category.items.length === 1 ? 'combo' : 'combos') : 'items'}
          </span>

          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search products"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{
              background: isCombo ? '#ffffff' : 'linear-gradient(135deg,#ff8a65,#f04452)',
              boxShadow: '0 4px 10px -3px rgba(240,68,82,.5)',
            }}
          >
            <Search size={14} strokeWidth={2.6} className={isCombo ? 'text-red' : 'text-white'} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {category.items.map((product) =>
          isCombo ? (
            <ComboCard key={product.id} product={product} theme={theme} />
          ) : (
            <ProductCard key={product.id} product={product} theme={theme} />
          ),
        )}
      </div>
    </div>
  );
}

const CategoryGrid = forwardRef(function CategoryGrid({ onOpenSearch }, ref) {
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
            <Sparkles size={12} className="text-gold" />
            Shop by Category
            <Sparkles size={12} className="text-gold" />
          </span>
        }
        action={loading ? 'Loading…' : `${categories.length} Categories ›`}
      />

      <div className="flex flex-col gap-6">
        {categories.map((cat) => (
          <CategorySection
            key={cat.slug}
            category={cat}
            isActive={cat.slug === activeSlug}
            onOpenSearch={onOpenSearch}
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
