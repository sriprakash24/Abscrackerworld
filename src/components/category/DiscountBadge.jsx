export default function DiscountBadge({ percent }) {
  if (!percent || percent <= 0) return null;

  return (
    <div
      className="absolute left-2 top-2 z-10 rounded-md bg-gradient-to-b from-[#ff7a52] to-accent px-1.5 py-0.5 text-[9px] font-bold text-white"
      style={{ boxShadow: '0 2px 6px rgba(0,0,0,.5), 0 0 10px rgba(255,87,34,.35)' }}
    >
      {percent}% OFF
    </div>
  );
}
