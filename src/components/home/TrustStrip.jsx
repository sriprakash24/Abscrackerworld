import { Warehouse, Truck, ShieldCheck, PackageCheck, Users, Factory, Home } from 'lucide-react';
import { TRUST_ITEMS } from '../../constants/catalog';

const ICONS = [Warehouse, Truck, ShieldCheck, PackageCheck, Users];

/** Compact, static "factory → your doorstep" badge. No scrolling text — the
 *  only motion is a small truck icon running along a dashed route between
 *  the factory and home icons, looping forever. Reads once, doesn't repeat
 *  content, and takes a single slim row of height. */
function FactoryRouteBadge() {
  return (
    <div
      className="mx-4 mb-2.5 flex items-center justify-center gap-2 rounded-full px-3 py-1.5"
      style={{
        background: 'linear-gradient(90deg, #ffe3cc, #fff1de, #ffe3cc)',
        border: '1px solid rgba(255,138,101,0.5)',
        boxShadow: '0 6px 14px -8px rgba(240,100,70,0.4)',
      }}
    >
      <span
        className="orb-3d flex h-6 w-6 shrink-0 items-center justify-center !rounded-full"
        style={{ animation: 'glowPulse 2.6s ease-in-out infinite' }}
      >
        <Factory size={12} strokeWidth={2.2} className="text-red"  />
      </span>

      <div className="relative h-3 w-11 shrink-0">
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2"
          style={{ borderTop: '1.5px dashed rgba(255,183,77,0.55)' }}
        />
        <Truck
          size={13}
          strokeWidth={2.4}
          className="absolute top-1/2 text-orange"
          style={{
            transform: 'translateY(-50%)',
            animation: 'routeTruck 3.2s ease-in-out infinite',
          }}
        />
      </div>

      <span
        className="orb-3d flex h-6 w-6 shrink-0 items-center justify-center !rounded-full"
        style={{ animation: 'glowPulse 2.6s ease-in-out infinite', animationDelay: '1.3s' }}
      >
        <Home size={12} strokeWidth={2.2} className="text-red"  />
      </span>

      <span className="ml-0.5 text-[10px] font-extrabold tracking-wide text-brown whitespace-nowrap">
        Direct Factory Outlet
      </span>
      <span className="h-1 w-1 shrink-0 rounded-full bg-orange/70" />
      <span className="text-[10px] font-bold tracking-wide text-orange whitespace-nowrap">Sivakasi</span>
    </div>
  );
}

export default function TrustStrip() {
  return (
    <>
      <FactoryRouteBadge />

      <div
        className="mx-4 mb-4 grid grid-cols-5 rounded-2xl px-1 py-2 text-center"
        style={{
          background: '#ffffff',
          border: '1px solid rgba(255,138,101,0.4)',
          boxShadow: '0 10px 22px -12px rgba(240,100,70,0.4)',
        }}
      >
        {TRUST_ITEMS.map((item, i) => {
          const Icon = ICONS[i];
          return (
            <div
              key={item.label}
              className="flex flex-col items-center gap-0.5 px-0.5"
              style={{
                borderRight: i < TRUST_ITEMS.length - 1 ? '1px solid rgba(255,138,101,0.28)' : 'none',
              }}
            >
              <span className="orb-3d flex h-6 w-6 shrink-0 items-center justify-center !rounded-full">
                <Icon
                  size={12}
                  strokeWidth={2}
                  className="text-red"
                />
              </span>
              <span className="text-[7.5px] font-bold leading-tight text-brown">{item.label}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
