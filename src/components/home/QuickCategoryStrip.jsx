import SectionHead from './SectionHead';
import CategoryIcon from './CategoryIcon';
import { useProducts } from '../../contexts/ProductsContext';

export default function QuickCategoryStrip({ onJump }) {
  const { categories } = useProducts();

  return (
    <div className="mb-5 px-4">
      <SectionHead title="Quick Jump" action="Browse All ›" onAction={() => onJump?.(null)} />
      <div className="flex snap-x gap-4 overflow-x-auto pb-1 pt-0.5">
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => onJump?.(cat.name)}
            className="flex shrink-0 snap-start flex-col items-center gap-2"
          >
            <div className="orb-3d flex h-[62px] w-[62px] items-center justify-center overflow-hidden !rounded-full text-[26px]">
              <CategoryIcon
                image={cat.image}
                icon={cat.icon}
                name={cat.name}
                className="art-float flex h-full w-full items-center justify-center leading-none"
              />
            </div>
            <span className="whitespace-nowrap text-[11px] font-semibold text-[#ddd4c8]">
              {cat.name.charAt(0) + cat.name.slice(1).toLowerCase()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
