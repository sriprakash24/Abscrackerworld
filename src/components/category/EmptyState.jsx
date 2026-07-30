import { motion } from 'framer-motion';
import { SearchX } from 'lucide-react';

export default function EmptyState({ onReset }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="col-span-2 flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      <div className="orb-3d flex h-20 w-20 items-center justify-center !rounded-full text-orange">
        <SearchX size={30} className="art-float" />
      </div>
      <h3 className="mt-4 text-[14px] font-extrabold text-[#f2ece2]">No crackers found</h3>
      <p className="mt-1 max-w-[220px] text-[12px] leading-snug text-muted">
        We couldn't find anything matching your filters. Try adjusting or resetting them.
      </p>
      <button
        onClick={onReset}
        className="btn-3d mt-4 rounded-lg px-5 py-2 text-[11px] font-bold text-white"
      >
        Reset Filters
      </button>
    </motion.div>
  );
}
