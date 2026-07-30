import { Warehouse, Truck, ShieldCheck, PackageCheck, Users } from 'lucide-react';
import { TRUST_ITEMS } from '../../constants/catalog';

const ICONS = [Warehouse, Truck, ShieldCheck, PackageCheck, Users];

export default function TrustStrip() {
  return (
    <div className="surface-3d mx-4 mb-5 grid grid-cols-5 gap-1 rounded-2xl px-1.5 py-4 text-center">
      {TRUST_ITEMS.map((item, i) => {
        const Icon = ICONS[i];
        return (
          <div key={item.label} className="flex flex-col items-center gap-1.5">
            <Icon
              size={22}
              strokeWidth={1.8}
              className="text-orange"
              style={{ filter: 'drop-shadow(0 0 6px rgba(255,122,0,.55))' }}
            />
            <span className="text-[9.5px] font-semibold leading-tight text-[#cfc7bd]">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
