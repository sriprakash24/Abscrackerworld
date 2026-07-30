import { AnimatePresence, motion } from 'framer-motion';
import { Check, AlertCircle } from 'lucide-react';

export default function TermsCheckbox({ checked, error, registration }) {
  return (
    <div className="px-1">
      <label className="flex cursor-pointer items-start gap-2.5 select-none">
        <span className="relative mt-0.5 shrink-0">
          {/* Uncontrolled — driven by react-hook-form's registration (name/onChange/onBlur/ref).
              `checked` (from a parent `watch`) only drives the visual state below. */}
          <input type="checkbox" className="peer sr-only" {...registration} />
          <motion.span
            animate={{
              backgroundColor: checked ? '#FF7A00' : 'rgba(12,9,6,1)',
              borderColor: checked ? '#FF7A00' : 'rgba(255,255,255,0.18)',
            }}
            transition={{ duration: 0.15 }}
            className="flex h-5 w-5 items-center justify-center rounded-md border"
            style={checked ? { boxShadow: '0 0 10px rgba(255,122,0,.6)' } : undefined}
          >
            <AnimatePresence>
              {checked && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Check size={13} strokeWidth={3} className="text-black" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
        </span>
        <span className="text-[11.5px] leading-snug text-[#cfc7bd]">
          I have reviewed my order details and agree to the{' '}
          <span className="font-bold text-gold">Terms &amp; Conditions</span>.
        </span>
      </label>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-[30px] flex items-center gap-1 overflow-hidden text-[10.5px] font-semibold text-[#e35226]"
          >
            <AlertCircle size={11} />
            {error.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
