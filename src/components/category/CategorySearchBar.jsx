import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

export default function CategorySearchBar({ open, value, onChange, categoryName }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.3, 0.8, 0.4, 1] }}
          className="glass sticky top-[60px] z-20 overflow-hidden"
          style={{ borderBottom: '1px solid rgba(255,154,0,.16)' }}
        >
          <div className="px-4 py-2.5">
            <div
              className="flex items-center gap-2.5 rounded-[14px] border border-orange bg-gradient-to-b from-[#0d0a08] to-[#151109] px-3.5 py-2.5"
              style={{ boxShadow: '0 0 0 3px rgba(255,122,0,.15), 0 0 18px rgba(255,122,0,.3), 0 2px 8px rgba(0,0,0,.5) inset' }}
            >
              <Search size={16} strokeWidth={2.2} className="shrink-0 text-orange" />
              <input
                autoFocus
                type="text"
                value={value}
                placeholder={`Search in ${categoryName}...`}
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted"
                onChange={(e) => onChange(e.target.value)}
              />
              {value && (
                <button onClick={() => onChange('')} className="shrink-0 text-muted">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
