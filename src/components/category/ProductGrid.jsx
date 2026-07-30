import { memo } from 'react';
import ProductCard from './ProductCard';
import SkeletonCard from './SkeletonCard';
import EmptyState from './EmptyState';

function ProductGrid({ products, loading, onResetFilters }) {
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

  return (
    <div className="grid grid-cols-2 items-stretch gap-3 px-4 pb-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default memo(ProductGrid);
