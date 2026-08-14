import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Fuse from 'fuse.js';
import { useProducts } from '../contexts/ProductsContext';
import { getCategoryBySlug } from '../services/products';
import { useCartStore } from '../store/useCartStore';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import CategoryHeader from '../components/category/CategoryHeader';
import CategorySearchBar from '../components/category/CategorySearchBar';
import CategoryBanner from '../components/category/CategoryBanner';
import FilterBar from '../components/category/FilterBar';
import ProductGrid from '../components/category/ProductGrid';
import EmberParticles from '../components/ui/EmberParticles';
import BottomNav from '../components/home/BottomNav';
import FloatingButtons from '../components/home/FloatingButtons';

export default function CategoryListing() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { categories, loading, error } = useProducts();
  const category = getCategoryBySlug(categories, slug);

  const wishlist = useCartStore((s) => s.wishlist);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [sort, setSort] = useState('popular');
  const [priceRange, setPriceRange] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [bestOffersOnly, setBestOffersOnly] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 250);

  const fuse = useMemo(() => {
    if (!category) return null;
    return new Fuse(category.items, { keys: ['name'], threshold: 0.35 });
  }, [category]);

  const filteredProducts = useMemo(() => {
    if (!category) return [];

    let list = category.items;

    if (debouncedQuery.trim() && fuse) {
      list = fuse.search(debouncedQuery.trim()).map((r) => r.item);
    }

    if (wishlistOnly) {
      list = list.filter((p) => wishlist[p.id]);
    }

    if (inStockOnly) {
      list = list.filter((p) => p.stock !== 'out');
    }

    if (bestOffersOnly) {
      list = list.filter((p) => p.discountPercentage >= 40);
    }

    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-').map(Number);
      list = list.filter((p) => p.sale >= min && p.sale <= max);
    }

    const sorted = [...list];
    switch (sort) {
      case 'newest':
        sorted.sort((a, b) =>
          b.newArrival === a.newArrival ? b.displayOrder - a.displayOrder : b.newArrival ? 1 : -1
        );
        break;
      case 'price-asc':
        sorted.sort((a, b) => a.sale - b.sale);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.sale - a.sale);
        break;
      case 'discount-desc':
        sorted.sort((a, b) => b.discountPercentage - a.discountPercentage);
        break;
      case 'popular':
      default:
        sorted.sort((a, b) => Number(b.bestSeller) - Number(a.bestSeller));
        break;
    }

    return sorted;
  }, [category, debouncedQuery, fuse, wishlistOnly, wishlist, inStockOnly, bestOffersOnly, priceRange, sort]);

  const resetFilters = () => {
    setQuery('');
    setWishlistOnly(false);
    setSort('popular');
    setPriceRange('all');
    setInStockOnly(false);
    setBestOffersOnly(false);
  };

  if (loading && !category) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <span className="art-float text-5xl">🎆</span>
        <p className="mt-4 text-[12px] text-muted">Loading category…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <span className="art-float text-5xl">⚠️</span>
        <h1 className="mt-4 text-[16px] font-extrabold text-[#f2ece2]">Couldn't load products</h1>
        <p className="mt-1 text-[12px] text-muted">
          There was a problem reaching the catalog. Please check your connection and try again.
        </p>
        <Link to="/" className="btn-3d mt-5 rounded-lg px-5 py-2.5 text-[12px] font-bold text-white">
          Back to Home
        </Link>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <span className="art-float text-5xl">🎆</span>
        <h1 className="mt-4 text-[16px] font-extrabold text-[#f2ece2]">Category not found</h1>
        <p className="mt-1 text-[12px] text-muted">This category doesn't exist or may have been removed.</p>
        <Link to="/" className="btn-3d mt-5 rounded-lg px-5 py-2.5 text-[12px] font-bold text-white">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full pb-24">
      <EmberParticles count={8} className="opacity-30" />

      <CategoryHeader
        categoryName={category.name}
        categoryIcon={category.icon}
        categoryImage={category.image}
        productCount={filteredProducts.length}
        searchOpen={searchOpen}
        onToggleSearch={() => setSearchOpen((o) => !o)}
        wishlistOnly={wishlistOnly}
        onToggleWishlistOnly={() => setWishlistOnly((w) => !w)}
        onBack={() => navigate(-1)}
      />

      <CategorySearchBar open={searchOpen} value={query} onChange={setQuery} categoryName={category.name} />

      <CategoryBanner
        name={category.name}
        icon={category.icon}
        image={category.image}
        tagline={category.tagline}
        productCount={category.items.length}
      />

      <FilterBar
        sort={sort}
        onSortChange={setSort}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        inStockOnly={inStockOnly}
        onToggleInStock={() => setInStockOnly((v) => !v)}
        bestOffersOnly={bestOffersOnly}
        onToggleBestOffers={() => setBestOffersOnly((v) => !v)}
      />

      <div className="pt-3">
        <ProductGrid products={filteredProducts} loading={loading} onResetFilters={resetFilters} categoryName={category.name} />
      </div>

      <FloatingButtons />
      <BottomNav />
    </div>
  );
}
