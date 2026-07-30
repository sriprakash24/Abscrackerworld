import { ShieldCheck, Truck, Undo2, Headset } from 'lucide-react';
import { FOOTER_ITEMS } from '../../constants/catalog';

const ICONS = [ShieldCheck, Truck, Undo2, Headset];

export default function FooterStrip() {
  return (
    <div className="px-4 pb-28">
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[#221d19] bg-card p-4">
        {FOOTER_ITEMS.map((item, i) => {
          const Icon = ICONS[i];
          return (
            <div key={item.label} className="flex items-center gap-2.5">
              <Icon size={20} strokeWidth={1.8} className="shrink-0 text-orange" />
              <span className="flex flex-col text-[11px] font-semibold text-[#ddd4c8]">
                {item.label}
                <small className="text-[9.5px] font-normal text-muted">{item.sub}</small>
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-[10px] text-muted">
        © 2026 Dheeran Enterprises. All Rights Reserved.
      </p>
    </div>
  );
}
