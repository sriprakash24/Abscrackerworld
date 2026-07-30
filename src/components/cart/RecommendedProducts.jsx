import ProductCard from '../category/ProductCard';

export default function RecommendedProducts({ title, products }) {
  if (!products?.length) return null;

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-[12.5px] font-extrabold tracking-wide text-[#f2ece2]">{title}</h3>
      </div>
      <div className="mt-2.5 flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollSnapType: 'x proximity' }}>
        {products.map((product) => (
          <div key={product.id} className="w-[128px] shrink-0" style={{ scrollSnapAlign: 'start' }}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
