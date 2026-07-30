import { motion } from 'framer-motion';
import { PackageSearch, SearchX } from 'lucide-react';

export default function AdminOrdersEmpty({ filtered, onClearFilters }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="surface-3d flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div className="orb-3d flex h-16 w-16 items-center justify-center !rounded-full text-orange">
        {filtered ? <SearchX size={26} /> : <PackageSearch size={26} className="art-float" />}
      </div>

      {filtered ? (
        <>
          <h3 className="mt-4 text-[13.5px] font-extrabold text-[#f2ece2]">No matching orders</h3>
          <p className="mt-1 max-w-[260px] text-[11.5px] leading-snug text-muted">
            Try a different search term or clear the filters to see everything.
          </p>
          <button
            onClick={onClearFilters}
            className="btn-3d-outline mt-4 rounded-lg px-5 py-2 text-[11px] font-bold text-gold"
          >
            Clear Filters
          </button>
        </>
      ) : (
        <>
          <h3 className="mt-4 text-[13.5px] font-extrabold text-[#f2ece2]">No orders yet</h3>
          <p className="mt-1 max-w-[260px] text-[11.5px] leading-snug text-muted">
            New orders placed by customers will show up here in real time.
          </p>
        </>
      )}
    </motion.div>
  );
}
