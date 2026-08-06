import { toast } from 'sonner';
import { Check, Trash2, TriangleAlert } from 'lucide-react';

const SPARKS = [
  { sx: '16px', sy: '-10px', delay: '0s' },
  { sx: '-14px', sy: '-12px', delay: '0.08s' },
  { sx: '12px', sy: '12px', delay: '0.16s' },
  { sx: '-10px', sy: '10px', delay: '0.05s' },
];

/** Small radial spark burst rendered around a toast's icon orb — reuses
 * the site's `toast-spark` keyframes so every cart toast feels lit,
 * rather than a plain notification popping onto the screen. */
function ToastSparks() {
  return (
    <>
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="toast-spark"
          style={{ left: '17px', top: '17px', '--sx': s.sx, '--sy': s.sy, animationDelay: s.delay }}
        />
      ))}
    </>
  );
}

function CrackerToast({ variant = 'success', title, subtitle }) {
  const orbClass =
    variant === 'success' ? 'toast-icon-orb' : variant === 'warn' ? 'toast-icon-orb toast-icon-orb--warn' : 'toast-icon-orb toast-icon-orb--muted';
  const Icon = variant === 'success' ? Check : variant === 'warn' ? TriangleAlert : Trash2;

  return (
    <div className="toast-3d">
      <span className={orbClass}>
        <ToastSparks />
        <Icon size={15} strokeWidth={3} />
      </span>
      <div className="min-w-0">
        <div className="truncate text-[12.5px] font-extrabold leading-tight text-[#f2ece2]">{title}</div>
        {subtitle && <div className="mt-0.5 text-[10px] font-semibold text-muted">{subtitle}</div>}
      </div>
    </div>
  );
}

/** Product added to cart — the main "payoff" toast. */
export function showAddedToast(productName) {
  toast.custom(() => <CrackerToast variant="success" title={productName} subtitle="Added to your cart" />, {
    duration: 2000,
  });
}

/** Product removed from cart. */
export function showRemovedToast(productName) {
  toast.custom(() => <CrackerToast variant="muted" title={productName} subtitle="Removed from cart" />, {
    duration: 1800,
  });
}

/** Hit the max-stock cap while incrementing quantity. */
export function showStockLimitToast(productName, maxQty) {
  toast.custom(() => <CrackerToast variant="warn" title={`Only ${maxQty} in stock`} subtitle={productName} />, {
    duration: 2000,
  });
}
