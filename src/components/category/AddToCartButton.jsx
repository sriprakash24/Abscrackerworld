import { useState } from 'react';
import { ShoppingBag, Loader2, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';

export default function AddToCartButton({
  inCart,
  disabled,
  maxQty = 99,
  productName = 'Item',
  onAdd,
  onIncrement,
  onDecrement,
}) {
  const [loading, setLoading] = useState(false);
  const [ripples, setRipples] = useState([]);

  const atMax = inCart >= maxQty;

  const handleAddClick = (e) => {
    if (disabled || loading) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 550);

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onAdd?.();
    }, 320);
  };

  const handleIncrement = () => {
    if (atMax) {
      toast(`Only ${maxQty} in stock for ${productName}`);
      return;
    }
    onIncrement?.();
  };

  // --- Quantity stepper mode (already in cart) ---
  if (inCart > 0) {
    return (
      <div
        className={cn(
          'btn-3d mt-2 flex items-center justify-between rounded-lg px-1.5 py-1.5',
          disabled && 'cursor-not-allowed opacity-40 grayscale'
        )}
      >
        <button
          onClick={onDecrement}
          disabled={disabled}
          aria-label="Decrease quantity"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/20 text-white transition-transform active:scale-90"
        >
          <Minus size={12} strokeWidth={2.6} />
        </button>

        <span className="text-[12px] font-extrabold text-white">{inCart}</span>

        <button
          onClick={handleIncrement}
          disabled={disabled || atMax}
          aria-label="Increase quantity"
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/20 text-white transition-transform active:scale-90',
            atMax && 'opacity-40'
          )}
        >
          <Plus size={12} strokeWidth={2.6} />
        </button>
      </div>
    );
  }

  // --- Add mode (not yet in cart) ---
  return (
    <button
      onClick={handleAddClick}
      disabled={disabled}
      className={cn(
        'btn-3d relative mt-2 flex items-center justify-center gap-1.5 overflow-hidden rounded-lg py-1.5 text-[11px] font-bold text-white transition-[filter]',
        disabled && 'cursor-not-allowed opacity-40 grayscale'
      )}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute rounded-full bg-white/40"
          style={{
            left: r.x,
            top: r.y,
            width: 10,
            height: 10,
            transform: 'translate(-50%,-50%)',
            animation: 'abs-ripple 550ms ease-out forwards',
          }}
        />
      ))}

      {loading ? <Loader2 size={13} className="animate-spin" /> : <ShoppingBag size={13} />}
      {disabled ? 'Sold Out' : loading ? 'Adding' : 'Add'}

      <style>{`
        @keyframes abs-ripple {
          to { width: 140px; height: 140px; opacity: 0; }
        }
      `}</style>
    </button>
  );
}
