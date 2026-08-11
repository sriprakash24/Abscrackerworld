import { motion } from 'framer-motion';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/opacity.css';
import { PackageSearch } from 'lucide-react';

export default function OrderReview({ items }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="surface-3d rounded-2xl px-4 py-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="orb-3d flex h-7 w-7 shrink-0 items-center justify-center !rounded-full text-orange">
          <PackageSearch size={13} />
        </span>
        <h3 className="text-[12.5px] font-extrabold tracking-wide text-[#f2ece2]">
          Review Order <span className="font-semibold text-muted">({items.length})</span>
        </h3>
      </div>

      <div className="flex flex-col divide-y divide-white/[0.06]">
        {items.map(({ product, qty }) => {
          const lineTotal = product.sale * qty;
          return (
            <div key={product.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="orb-3d orb-cream flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden !rounded-lg">
                {product.img ? (
                  <LazyLoadImage
                    src={product.img}
                    alt={product.name}
                    effect="opacity"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-lg">🎆</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-[12px] font-bold text-[#f2ece2]">{product.name}</div>
                <div className="mt-0.5 text-[10px] text-muted">
                  Qty {qty} × ₹{product.sale}
                </div>
              </div>

              <div className="shrink-0 text-[12.5px] font-extrabold text-gold">₹{lineTotal}</div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
