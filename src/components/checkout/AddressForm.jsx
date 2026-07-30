import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import FormField from './FormField';

export default function AddressForm({ register, errors, isActive = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className={`surface-3d rounded-2xl px-4 py-4 ${isActive ? 'surface-3d-open animate-glow-pulse' : ''}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="orb-3d flex h-7 w-7 shrink-0 items-center justify-center !rounded-full text-orange">
          <MapPin size={13} />
        </span>
        <h3 className="text-[12.5px] font-extrabold tracking-wide text-[#f2ece2]">Delivery Address</h3>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Door / House No."
            required
            placeholder="e.g. 12-A"
            registration={register('houseNumber')}
            error={errors.houseNumber}
          />
          <FormField
            label="Street"
            required
            placeholder="e.g. Gandhi Street"
            registration={register('street')}
            error={errors.street}
          />
        </div>

        <FormField
          label="Area / Locality"
          required
          placeholder="e.g. Anna Nagar"
          registration={register('area')}
          error={errors.area}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Village / Town / City"
            required
            placeholder="e.g. Sivakasi"
            registration={register('city')}
            error={errors.city}
          />
          <FormField
            label="District"
            required
            placeholder="e.g. Virudhunagar"
            registration={register('district')}
            error={errors.district}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="State"
            required
            placeholder="e.g. Tamil Nadu"
            registration={register('state')}
            error={errors.state}
          />
          <FormField
            label="PIN Code"
            required
            type="tel"
            inputMode="numeric"
            maxLength={6}
            placeholder="626123"
            registration={register('pincode')}
            error={errors.pincode}
          />
        </div>

        <FormField
          label="Landmark"
          placeholder="Optional — near ... "
          registration={register('landmark')}
          error={errors.landmark}
        />

        <FormField
          label="Delivery Notes"
          as="textarea"
          rows={2}
          placeholder="Optional — gate colour, floor, timing, etc."
          registration={register('deliveryNotes')}
          error={errors.deliveryNotes}
        />
      </div>
    </motion.div>
  );
}
