import { ArrowLeft, Search, Heart } from 'lucide-react';
import { cn } from '../../utils/cn';
import CategoryIcon from '../home/CategoryIcon';

export default function CategoryHeader({
  categoryName,
  categoryIcon,
  categoryImage,
  productCount,
  searchOpen,
  onToggleSearch,
  wishlistOnly,
  onToggleWishlistOnly,
  onBack,
}) {
  return (
    <div
      className="glass sticky top-0 z-30 flex items-center gap-2.5 px-3 py-3"
      style={{
        borderBottom: '1px solid rgba(255,154,0,.22)',
        boxShadow: '0 10px 26px -14px rgba(0,0,0,.7), 0 0 20px rgba(255,122,0,.1)',
      }}
    >
      <button
        onClick={onBack}
        className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-orange"
        aria-label="Go back"
      >
        <ArrowLeft size={18} strokeWidth={2.4} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate text-[13.5px] font-extrabold leading-tight text-[#f2ece2]">
          <CategoryIcon
            image={categoryImage}
            icon={categoryIcon}
            name={categoryName}
            className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full leading-none"
          />
          <span className="truncate">{categoryName}</span>
        </div>
        <div className="text-[10px] font-semibold text-muted">
          {productCount} {productCount === 1 ? 'Product' : 'Products'}
        </div>
      </div>

      <button
        onClick={onToggleWishlistOnly}
        className={cn(
          'orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-orange transition-colors',
          wishlistOnly && 'text-accent'
        )}
        style={wishlistOnly ? { boxShadow: '0 0 12px rgba(255,87,34,.6)' } : undefined}
        aria-label="Show wishlisted items"
      >
        <Heart size={17} strokeWidth={2.2} fill={wishlistOnly ? 'currentColor' : 'none'} />
      </button>

      <button
        onClick={onToggleSearch}
        className={cn(
          'orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full text-orange transition-colors',
          searchOpen && 'border-gold text-[#1a0d00]'
        )}
        style={searchOpen ? { background: 'linear-gradient(180deg,#ffcf6b,#ff7a00)' } : undefined}
        aria-label="Search in category"
      >
        <Search size={17} strokeWidth={2.4} />
      </button>
    </div>
  );
}
