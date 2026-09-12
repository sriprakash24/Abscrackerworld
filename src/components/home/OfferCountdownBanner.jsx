import { useEffect, useMemo, useState } from 'react';
import diwaliOfferBanner from '../../assets/hero/diwali-offer-banner.jpg';

// Offer end date: 21 September, end of day. Rolls forward to next year on
// its own once that date has passed, so nothing needs updating by hand.
function getOfferEndDate() {
  const now = new Date();
  const year = now.getFullYear();
  let end = new Date(year, 8, 21, 23, 59, 59);
  if (end.getTime() < now.getTime()) {
    end = new Date(year + 1, 8, 21, 23, 59, 59);
  }
  return end;
}

function useCountdown(targetDate) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, targetDate.getTime() - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      setRemainingMs(Math.max(0, targetDate.getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

const pad = (n) => String(n).padStart(2, '0');

// The artwork (src/assets/hero/diwali-offer-banner.jpg) already bakes in the
// "Offer ends on 21 September" pill plus 4 empty placeholder boxes labelled
// Days/Hours/Minutes/Seconds. These percentages were measured directly
// against those 4 boxes so the live numbers land exactly inside them at any
// width — keep in sync if the artwork changes.
const ROW = { top: '57.5%', bottom: '32.5%', left: '28.25%', right: '28.95%' };
const TILE_WIDTH = '17.4%';

export default function OfferCountdownBanner() {
  const offerEndDate = useMemo(() => getOfferEndDate(), []);
  const { days, hours, minutes, seconds } = useCountdown(offerEndDate);

  const fullDateLabel = offerEndDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="relative w-full" style={{ aspectRatio: '1717 / 916' }}>
      <img
        src={diwaliOfferBanner}
        alt={`ABS Crackers World Mega Diwali Sale — up to 91% off on all products, storewide, offer ends ${fullDateLabel}`}
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
      />

      {/* Live D/H/M/S values, seated inside the 4 placeholder boxes baked into the artwork */}
      <div
        className="absolute flex justify-between"
        style={ROW}
        role="group"
        aria-label={`Offer ends ${fullDateLabel}, in ${days} days ${pad(hours)} hours ${pad(minutes)} minutes ${pad(seconds)} seconds`}
      >
        {[days, hours, minutes, seconds].map((val, i) => (
          <div key={i} style={{ width: TILE_WIDTH }} className="flex h-full items-center justify-center">
            <span className="text-[13px] font-black leading-none text-gold">{pad(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
