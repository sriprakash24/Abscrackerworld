import { useState } from 'react';
import { Search, Mic } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function SearchBar({ onSearch }) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState('');

  return (
    <div className="px-4 pb-3.5 pt-1">
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-[14px] border border-[#262220] bg-gradient-to-b from-[#0d0a08] to-[#151109] px-3.5 py-3 transition-all duration-300',
          !focused && 'shadow-[0_2px_8px_rgba(0,0,0,.55)_inset,0_1px_0_rgba(255,255,255,.04)]',
          focused && 'border-orange shadow-[0_0_0_3px_rgba(255,122,0,.15),0_0_18px_rgba(255,122,0,.3),0_2px_8px_rgba(0,0,0,.5)_inset]'
        )}
      >
        <Search size={18} strokeWidth={2.2} className="shrink-0 text-muted" />
        <input
          type="text"
          value={value}
          placeholder="Search crackers, packs..."
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setValue(e.target.value);
            onSearch?.(e.target.value);
          }}
        />
        <Mic size={18} strokeWidth={2.2} className="shrink-0 text-muted" />
      </div>
    </div>
  );
}
