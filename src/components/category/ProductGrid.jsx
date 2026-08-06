import { memo } from 'react';
import ProductCard from './ProductCard';
import SkeletonCard from './SkeletonCard';
import EmptyState from './EmptyState';
import { getCategoryTheme } from '../../utils/categoryTheme';

function ProductGrid({ products, loading, onResetFilters, categoryName }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 px-4 pb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3 px-4 pb-6">
        <EmptyState onReset={onResetFilters} />
      </div>
    );
  }

  const theme = categoryName ? getCategoryTheme(categoryName) : undefined;

  return (
    <div className="grid grid-cols-2 items-stretch gap-3 px-4 pb-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} theme={theme} />
      ))}
    </div>
  );
}

export default memo(ProductGrid);
