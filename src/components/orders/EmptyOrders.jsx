import { motion } from 'framer-motion';
import { PackageSearch, UserRound } from 'lucide-react';

/**
 * Two flavors: `needsIdentity` (we don't know who's asking yet — prompt to
 * identify via the existing customer-details sheet) vs a plain empty list
 * (we know them, they just haven't ordered yet).
 */
export default function EmptyOrders({ needsIdentity, onIdentify, onShopNow }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div className="orb-3d flex h-20 w-20 items-center justify-center !rounded-full text-orange">
        {needsIdentity ? (
          <UserRound size={30} className="art-float" />
        ) : (
          <PackageSearch size={30} className="art-float" />
        )}
      </div>

      {needsIdentity ? (
        <>
          <h3 className="mt-4 text-[14px] font-extrabold text-[#f2ece2]">Tell us who's asking</h3>
          <p className="mt-1 max-w-[240px] text-[12px] leading-snug text-muted">
            Share your name &amp; mobile number so we can pull up your past orders.
          </p>
          <button
            onClick={onIdentify}
            className="btn-3d mt-4 rounded-lg px-5 py-2 text-[11px] font-bold text-white"
          >
            View My Orders
          </button>
        </>
      ) : (
        <>
          <h3 className="mt-4 text-[14px] font-extrabold text-[#f2ece2]">No orders yet</h3>
          <p className="mt-1 max-w-[240px] text-[12px] leading-snug text-muted">
            Once you place an order, it'll show up here with live status updates.
          </p>
          <button
            onClick={onShopNow}
            className="btn-3d mt-4 rounded-lg px-5 py-2 text-[11px] font-bold text-white"
          >
            Start Shopping
          </button>
        </>
      )}
    </motion.div>
  );
}
