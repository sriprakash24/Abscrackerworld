import { Warehouse, Truck, ShieldCheck, PackageCheck, Users } from 'lucide-react';
import { TRUST_ITEMS } from '../../constants/catalog';

const ICONS = [Warehouse, Truck, ShieldCheck, PackageCheck, Users];

export default function TrustStrip() {
  return (
    <div
      className="mx-4 mb-5 grid grid-cols-5 rounded-2xl px-1 py-3.5 text-center"
      style={{
        background: 'linear-gradient(160deg, rgba(42,10,12,0.94), rgba(18,4,6,0.94))',
        backdropFilter: 'blur(14px) saturate(150%)',
        WebkitBackdropFilter: 'blur(14px) saturate(150%)',
        border: '1px solid rgba(255,154,0,0.35)',
        boxShadow: '0 10px 22px -10px rgba(0,0,0,0.65), 0 0 18px rgba(255,122,0,0.25)',
      }}
    >
      {TRUST_ITEMS.map((item, i) => {
        const Icon = ICONS[i];
        return (
          <div
            key={item.label}
            className="flex flex-col items-center gap-1.5 px-0.5"
            style={{
              borderRight: i < TRUST_ITEMS.length - 1 ? '1px solid rgba(255,154,0,0.22)' : 'none',
            }}
          >
            <span className="orb-3d flex h-9 w-9 shrink-0 items-center justify-center !rounded-full">
              <Icon
                size={17}
                strokeWidth={2}
                className="text-gold"
                style={{ filter: 'drop-shadow(0 0 5px rgba(255,213,79,.65))' }}
              />
            </span>
            <span className="text-[9px] font-bold leading-tight text-[#f0e6d8]">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
