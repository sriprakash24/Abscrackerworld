import { useEffect, useState } from 'react';
import { toast } from 'sonner';

function useCountdown(startSeconds) {
  const [remaining, setRemaining] = useState(startSeconds);
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => (r <= 0 ? 3 * 3600 : r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(Math.floor(remaining / 3600)).padStart(2, '0');
  const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  return { h, m, s };
}

export default function DealSection() {
  const { h, m, s } = useCountdown(2 * 3600 + 15 * 60 + 36);

  return (
    <div className="mb-5 px-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Flash deal */}
        <div className="surface-3d relative flex min-h-[230px] flex-col overflow-hidden rounded-[20px] p-3.5">
          <div className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-orange shadow-[0_1px_0_rgba(255,220,170,.15)_inset]">
            ⚡ FLASH DEAL
          </div>
          <div className="art-float my-2 text-center text-[46px] leading-none">🎇</div>
          <div className="mb-2 flex justify-center gap-1.5">
            {[
              [h, 'HRS'],
              [m, 'MINS'],
              [s, 'SECS'],
            ].map(([val, label]) => (
              <div key={label} className="orb-3d px-1.5 py-1 text-center !rounded-lg">
                <b className="block text-xs font-black text-gold">{val}</b>
                <span className="text-[8px] font-semibold text-muted">{label}</span>
              </div>
            ))}
          </div>
          <div className="mb-0.5 text-[12px] font-bold leading-tight text-white">Electric Sparklers (40 Pcs)</div>
          <div className="mb-2 text-[13px] font-extrabold text-gold">
            <s className="mr-1 font-normal text-muted">₹180</s>₹120
          </div>
          <button
            onClick={() => toast('Added to cart')}
            className="btn-3d mt-auto overflow-hidden rounded-lg py-2 text-[11px] font-extrabold tracking-wide text-white"
          >
            BUY NOW
          </button>
        </div>

        {/* New arrivals */}
        <div className="surface-3d relative flex min-h-[230px] flex-col overflow-hidden rounded-[20px] p-3.5">
          <div className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-gold shadow-[0_1px_0_rgba(255,220,170,.15)_inset]">
            <span className="rounded bg-gradient-to-b from-[#ffe9a8] to-gold px-1 text-[9px] font-black text-[#1a0d00]">NEW</span>
            NEW ARRIVALS
          </div>
          <div className="art-float my-2 text-center text-[46px] leading-none">🎆</div>
          <p className="mb-3 flex-1 text-center text-[12px] leading-snug text-[#cfc7bd]">
            Check out our latest collection
          </p>
          <button
            onClick={() => toast('Full catalog coming soon')}
            className="btn-3d-outline mt-auto overflow-hidden rounded-lg py-2 text-[11px] font-extrabold tracking-wide text-orange"
          >
            SHOP NOW
          </button>
        </div>
      </div>
    </div>
  );
}
