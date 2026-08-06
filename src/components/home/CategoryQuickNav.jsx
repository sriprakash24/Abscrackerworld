import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { getCategoryTheme } from "../../utils/categoryTheme";

const PREVIEW_VISIBLE_MS = 1700;
const PREVIEW_CYCLE_MS = 2900;

/** Center glyph for the launcher — a gentle breathing pulse. The spark
 * motion now lives in the `.beacon-ember-ring` orbiting the button itself
 * (see index.css), so this stays focused on the category icon. */
function CenterGlyph({ glyph }) {
  return (
    <motion.span
      className="relative text-[15px]"
      animate={{ scale: [1, 1.18, 1] }}
      transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
    >
      {glyph}
    </motion.span>
  );
}

/** Six small embers orbiting the launcher rim, like sparks catching as a
 * lit ground-spinner (Catherine wheel) turns — one of the site's own
 * cracker categories — instead of a generic decorative ring. */
function EmberRing() {
  const angles = [0, 60, 120, 180, 240, 300];
  return (
    <span className="beacon-ember-ring" aria-hidden="true">
      {angles.map((deg, i) => (
        <span
          key={deg}
          className="beacon-ember"
          style={{ "--a": `${deg}deg`, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </span>
  );
}

export default function CategoryQuickNav({ categories, activeSlug, onJump }) {
  const [open, setOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // Every ~2.9s, flash a chip showing the next category's icon + name next
  // to the launcher, then hide it again — a rhythmic hint instead of a
  // static "Explore" label, so people notice what the button does without
  // it permanently eating screen space or reading as a plain button.
  useEffect(() => {
    if (open || categories.length === 0) return undefined;

    let hideTimer = setTimeout(() => setShowPreview(true), 500);
    const interval = setInterval(() => {
      setShowPreview(true);
      setPreviewIndex((i) => (i + 1) % categories.length);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setShowPreview(false), PREVIEW_VISIBLE_MS);
    }, PREVIEW_CYCLE_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(hideTimer);
    };
  }, [open, categories.length]);

  const handlePick = (slug) => {
    setOpen(false);
    onJump(slug);
  };

  const previewCategory =
    categories[previewIndex % Math.max(categories.length, 1)];
  const previewTheme = previewCategory
    ? getCategoryTheme(previewCategory.name)
    : null;

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

      {/* Collapsed launcher — a firework-glyph orb that periodically flashes
          a category preview chip beside it, instead of sitting there as a
          silent, generic icon nobody recognizes as "explore categories". */}
      <AnimatePresence>
        {!open && (
          <div className="fixed right-4 top-[42%] z-40 flex -translate-y-1/2 items-center gap-2">
            <AnimatePresence>
              {showPreview && previewCategory && (
                <motion.div
                  key={previewCategory.slug}
                  initial={{ opacity: 0, x: 14, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 10, scale: 0.9 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => handlePick(previewCategory.slug)}
                  className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(28,22,17,0.92), rgba(10,8,6,0.92))",
                    border: `1px solid ${previewTheme.solid}70`,
                    boxShadow: `0 8px 18px -8px rgba(0,0,0,.6), 0 0 16px ${previewTheme.solid}40`,
                    color: previewTheme.from,
                  }}
                >
                  <span>{previewCategory.icon}</span>
                  {previewCategory.name}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setOpen(true)}
              aria-label="Explore categories"
              className="beacon-3d relative flex h-14 w-14 shrink-0 items-center justify-center !rounded-full"
            >
              <EmberRing />
              <CenterGlyph glyph={previewCategory?.icon || "🎆"} />
            </motion.button>
          </div>
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
            style={{
              transformPerspective: 1000,
              transformOrigin: "right center",
            }}
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

            <div
              className="flex-1 overflow-y-auto px-2 pb-1"
              style={{ scrollbarWidth: "thin" }}
            >
              {categories.map((cat) => {
                const isActive = cat.slug === activeSlug;
                const catTheme = getCategoryTheme(cat.name);
                return (
                  <motion.button
                    key={cat.slug}
                    onClick={() => handlePick(cat.slug)}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ x: -2 }}
                    className="mb-1.5 flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/5"
                    style={
                      isActive
                        ? {
                            background: `${catTheme.solid}1f`,
                            border: `1px solid ${catTheme.solid}70`,
                            boxShadow: `0 0 14px ${catTheme.solid}35`,
                          }
                        : undefined
                    }
                  >
                    <span
                      className="orb-3d flex h-8 w-8 shrink-0 items-center justify-center !rounded-lg text-[15px]"
                      style={{ border: `1px solid ${catTheme.solid}66` }}
                    >
                      {cat.icon}
                    </span>
                    <span
                      className="line-clamp-2 text-[10.5px] font-bold leading-tight"
                      style={{ color: isActive ? catTheme.from : "#f2ece2" }}
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
