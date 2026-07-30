import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function WishlistButton({ active, onToggle, className }) {
  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      whileTap={{ scale: 1.3 }}
      className={cn(
        'absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/70 backdrop-blur-sm transition-colors',
        active && 'text-accent',
        className
      )}
      style={active ? { boxShadow: '0 0 10px rgba(255,87,34,.6)' } : undefined}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart size={14} fill={active ? 'currentColor' : 'none'} />
    </motion.button>
  );
}
