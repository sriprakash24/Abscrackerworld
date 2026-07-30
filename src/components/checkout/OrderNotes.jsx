import { motion } from 'framer-motion';
import { NotebookPen } from 'lucide-react';
import FormField from './FormField';

export default function OrderNotes({ register, errors, isActive = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className={`surface-3d rounded-2xl px-4 py-4 ${isActive ? 'surface-3d-open animate-glow-pulse' : ''}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="orb-3d flex h-7 w-7 shrink-0 items-center justify-center !rounded-full text-orange">
          <NotebookPen size={13} />
        </span>
        <h3 className="text-[12.5px] font-extrabold tracking-wide text-[#f2ece2]">Order Notes</h3>
      </div>

      <FormField
        label="Anything we should know?"
        as="textarea"
        rows={3}
        placeholder="e.g. Deliver before evening · Call before delivery · Festival gift packing required"
        registration={register('orderNotes')}
        error={errors.orderNotes}
      />
    </motion.div>
  );
}
