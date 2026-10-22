import { AnimatePresence, motion } from 'framer-motion';
import { LogOut } from 'lucide-react';

/** Small centered "are you sure?" prompt shown before logging out. */
export default function LogoutConfirmDialog({ open, onCancel, onConfirm }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-brown/50 backdrop-blur-[2px]"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label="Log out"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className="relative z-10 w-full max-w-[300px] rounded-[20px] border border-peach bg-cream p-5 text-center shadow-[0_24px_60px_-16px_rgba(113,50,31,0.45)]"
          >
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-peach text-red">
              <LogOut size={20} strokeWidth={2.4} />
            </span>
            <h3 className="mt-3 text-[15px] font-extrabold text-brown">Log out?</h3>
            <p className="mt-1 text-[12px] leading-snug text-muted">
              Your cart and saved details on this phone will be cleared. Your placed orders stay safe.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 rounded-xl border border-peach bg-white py-2.5 text-[12.5px] font-bold text-brown"
              >
                Stay
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 rounded-xl bg-gradient-to-b from-coral to-red py-2.5 text-[12.5px] font-extrabold text-white"
              >
                Log out
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
