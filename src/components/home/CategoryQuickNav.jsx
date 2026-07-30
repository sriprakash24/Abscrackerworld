import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

export default function CategoryQuickNav({ categories, activeSlug, onJump }) {
  const [open, setOpen] = useState(false);

  const handlePick = (slug) => {
    setOpen(false);
    onJump(slug);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      {/* Collapsed launcher — animated floating orb, icon-only */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpen(true)}
            aria-label="Explore categories"
            className="orb-3d fixed right-4 top-1/2 z-40 flex h-14 w-14 -translate-y-1/2 items-center justify-center !rounded-full text-orange"
          >
            {/* Outward-pulsing rim glow, draws the eye without needing a text label */}
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ border: '1.5px solid var(--color-orange)' }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.55, 0, 0.55] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.span
              aria-hidden="true"
              className="flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles size={22} strokeWidth={2.2} className="drop-shadow-[0_0_6px_rgba(255,150,0,.75)]" />
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded drawer — modern glass rail with all categories */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 60, rotateY: -18 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: 60, rotateY: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformPerspective: 1000, transformOrigin: 'right center' }}
            className="panel-3d fixed right-0 top-1/2 z-50 flex max-h-[78vh] w-[168px] -translate-y-1/2 flex-col rounded-l-[22px] rounded-r-none py-3"
          >
            <div className="mb-1 flex items-center justify-between px-3">
              <span className="text-embossed text-[11px] font-extrabold uppercase tracking-wide text-orange">
                Explore
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close category explorer"
                className="orb-3d flex h-6 w-6 items-center justify-center !rounded-full text-orange"
              >
                <X size={12} strokeWidth={3} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-1" style={{ scrollbarWidth: 'thin' }}>
              {categories.map((cat) => {
                const isActive = cat.slug === activeSlug;
                return (
                  <motion.button
                    key={cat.slug}
                    onClick={() => handlePick(cat.slug)}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ x: -2 }}
                    className={`mb-1.5 flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors ${
                      isActive ? 'surface-3d-open surface-3d' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-lg text-[15px]">
                      {cat.icon}
                    </span>
                    <span
                      className={`line-clamp-2 text-[10.5px] font-bold leading-tight ${
                        isActive ? 'text-gold' : 'text-[#f2ece2]'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
