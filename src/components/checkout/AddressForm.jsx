import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import FormField from './FormField';

/**
 * Delivery address — a single free-text box. Orders go out by transport, so
 * we only need enough for the team to know where to send it; customers can
 * type whatever they like (village, town, landmark, transport office...).
 */
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
        <h3 className="text-[12.5px] font-extrabold tracking-wide text-brown">Delivery Address</h3>
      </div>

      <FormField
        label="Address"
        required
        as="textarea"
        rows={4}
        placeholder="Type your full address — village / town, district, state, PIN, landmark or transport name, anything that helps us deliver"
        registration={register('address')}
        error={errors.address}
        className="[&_textarea]:resize-none [&_textarea]:leading-relaxed"
      />
    </motion.div>
  );
}
