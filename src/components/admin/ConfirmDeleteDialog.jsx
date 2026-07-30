import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

/** Small centered confirm modal used before any destructive admin action. */
export default function ConfirmDeleteDialog({ open, title, description, busy, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="surface-3d w-full max-w-sm rounded-2xl p-5"
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e35226]/40 bg-[#e35226]/10 text-[#e35226]">
                <AlertTriangle size={16} />
              </span>
              <h3 className="text-[14px] font-extrabold text-[#f2ece2]">{title}</h3>
            </div>
            <p className="mb-5 text-[12px] font-medium leading-relaxed text-muted">{description}</p>
            <div className="flex gap-2.5">
              <button
                onClick={onCancel}
                disabled={busy}
                className="btn-3d-outline flex-1 rounded-xl py-2.5 text-[12px] font-bold text-[#f2ece2] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#e35226] to-[#b8391a] py-2.5 text-[12px] font-bold text-white shadow-[0_8px_18px_-8px_rgba(227,82,38,0.55)] transition-transform active:scale-[0.97] disabled:opacity-50"
              >
                {busy && <Loader2 size={13} className="animate-spin" />}
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
