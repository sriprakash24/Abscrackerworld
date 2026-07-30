import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

/**
 * Premium, reusable text input wired for react-hook-form's `register`.
 * Handles label, required marker, focus glow, and animated validation error.
 */
export default function FormField({
  label,
  required = false,
  error,
  registration,
  as = 'input',
  rows = 3,
  className = '',
  ...props
}) {
  const Comp = as === 'textarea' ? 'textarea' : 'input';

  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold tracking-wide text-[#cfc7bd]">
        {label}
        {required && <span className="text-orange">*</span>}
      </span>

      <Comp
        {...registration}
        {...props}
        {...(as === 'textarea' ? { rows } : {})}
        className={`w-full rounded-xl border bg-[#0c0906] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#f2ece2] outline-none transition-all duration-200 placeholder:text-muted placeholder:font-normal ${
          error
            ? 'border-[#e35226] shadow-[0_0_0_3px_rgba(227,82,38,0.15)]'
            : 'border-white/10 focus:border-orange/70 focus:shadow-[0_0_0_3px_rgba(255,122,0,0.14)]'
        }`}
      />

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 5 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex items-center gap-1 overflow-hidden text-[10.5px] font-semibold text-[#e35226]"
          >
            <AlertCircle size={11} />
            {error.message}
          </motion.div>
        )}
      </AnimatePresence>
    </label>
  );
}
