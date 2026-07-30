import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import FormField from './FormField';

export default function CustomerForm({ register, errors, isActive = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`surface-3d rounded-2xl px-4 py-4 ${isActive ? 'surface-3d-open animate-glow-pulse' : ''}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="orb-3d flex h-7 w-7 shrink-0 items-center justify-center !rounded-full text-orange">
          <User size={13} />
        </span>
        <h3 className="text-[12.5px] font-extrabold tracking-wide text-[#f2ece2]">Customer Information</h3>
      </div>

      <div className="flex flex-col gap-3">
        <FormField
          label="Full Name"
          required
          placeholder="e.g. Arun Kumar"
          registration={register('fullName')}
          error={errors.fullName}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Mobile Number"
            required
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="98765 43210"
            registration={register('mobile')}
            error={errors.mobile}
          />
          <FormField
            label="Alternate Mobile"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="Optional"
            registration={register('alternateMobile')}
            error={errors.alternateMobile}
          />
        </div>

        <FormField
          label="Email Address"
          type="email"
          placeholder="Optional — you@example.com"
          registration={register('email')}
          error={errors.email}
        />
      </div>
    </motion.div>
  );
}
