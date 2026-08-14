import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Mic, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import { slugify } from '../../utils/slugify';

export default function SearchBar({ products = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const containerRef = useRef(null);

  const fuse = useMemo(
    () => new Fuse(products, { keys: ['name', 'category'], threshold: 0.35 }),
    [products]
  );

  const results = useMemo(() => {
    if (!value.trim()) return [];
    return fuse.search(value.trim()).slice(0, 6).map((r) => r.item);
  }, [value, fuse]);

  // Close the results dropdown on outside taps/clicks.
  useEffect(() => {
    function onPointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, []);

  // Never leave the mic listening after the component goes away.
  useEffect(() => () => recognitionRef.current?.stop(), []);

  const goToProduct = (product) => {
    setShowResults(false);
    const categorySlug = slugify(product.category);

    const dispatchJump = () => {
      window.dispatchEvent(
        new CustomEvent('abs-search-jump', {
          detail: { productId: product.id, categorySlug },
        })
      );
    };

    // Products live inline on the home feed (grouped by category) rather
    // than on a separate page, so a search result should land you right
    // there instead of navigating away to a product/category page.
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(dispatchJump, 300);
    } else {
      dispatchJump();
    }
  };

  const startVoiceSearch = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice search isn't supported on this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setValue(transcript);
        setShowResults(true);
      }
    };
    recognition.onerror = (e) => {
      setListening(false);
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        toast.error("Couldn't hear that — try again");
      }
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div ref={containerRef} className="relative px-4 pb-3.5 pt-1">
      <div
        className={cn(
          'relative flex items-center gap-2.5 rounded-[14px] px-3.5 py-3 transition-all duration-300',
          !focused &&
            'border border-gold/70 shadow-[0_2px_10px_rgba(0,0,0,.45)_inset,0_0_0_1px_rgba(255,213,79,.18),0_4px_20px_-4px_rgba(255,154,0,.45)]',
          focused &&
            'border border-gold shadow-[0_0_0_3px_rgba(255,180,0,.3),0_0_26px_rgba(255,154,0,.55),0_2px_10px_rgba(0,0,0,.45)_inset]'
        )}
        style={{
          // Was near-identical in tone to the page's own #220000 background
          // (same dark-maroon family, low contrast) — this pulls the fill
          // noticeably lighter/warmer so the bar reads as its own surface
          // rather than blending into whatever's behind it.
          background: 'linear-gradient(180deg, rgba(120,42,24,.88), rgba(72,20,14,.92))',
          backdropFilter: 'blur(12px) saturate(150%)',
          WebkitBackdropFilter: 'blur(12px) saturate(150%)',
        }}
      >
        {/* Quiet breathing glow around the search icon — enough to say
            "this is tappable" without shouting over the rest of the page. */}
        <span className="relative shrink-0">
          <motion.span
            className="pointer-events-none absolute -inset-1.5 rounded-full"
            style={{ boxShadow: '0 0 0 1px rgba(255,180,0,.4)' }}
            animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.5, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <Search size={18} strokeWidth={2.2} className="relative text-gold" />
        </span>
        <input
          type="text"
          value={value}
          placeholder="Search crackers, packs..."
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#f2e9da]/80"
          onFocus={() => {
            setFocused(true);
            if (value.trim()) setShowResults(true);
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setValue(e.target.value);
            setShowResults(true);
          }}
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              setValue('');
              setShowResults(false);
            }}
            aria-label="Clear search"
            className="shrink-0 text-muted"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        )}

        <button
          type="button"
          onClick={startVoiceSearch}
          aria-label={listening ? 'Stop voice search' : 'Search by voice'}
          className={cn(
            'relative shrink-0 flex h-7 w-7 items-center justify-center rounded-full transition-colors',
            listening ? 'text-white' : 'text-muted'
          )}
          style={
            listening
              ? { background: 'linear-gradient(180deg,#ff6a2e,#f0400a)' }
              : undefined
          }
        >
          {listening && (
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ boxShadow: '0 0 0 2px rgba(255,87,34,.6)' }}
              animate={{ opacity: [0.9, 0, 0.9], scale: [1, 1.7, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <Mic size={16} strokeWidth={2.2} />
        </button>
      </div>

      <AnimatePresence>
        {showResults && value.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-x-4 top-full z-30 mt-1 max-h-[60vh] overflow-y-auto rounded-[14px] border border-[#262220]"
            style={{
              background: 'linear-gradient(180deg,#130f0c,#0c0906)',
              boxShadow: '0 14px 30px -10px rgba(0,0,0,.7)',
            }}
          >
            {results.length === 0 ? (
              <div className="px-4 py-3.5 text-[12px] text-muted">
                No crackers found for "{value.trim()}"
              </div>
            ) : (
              results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => goToProduct(p)}
                  className="flex w-full items-center gap-3 border-b border-white/5 px-3.5 py-2.5 text-left last:border-none active:bg-white/5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/30">
                    {p.img ? (
                      <img src={p.img} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-base">🎆</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-bold text-[#f2ece2]">{p.name}</span>
                    {p.nameTa && (
                      <span className="block truncate text-[10px] font-semibold text-gold">{p.nameTa}</span>
                    )}
                    <span className="block text-[10px] text-muted">{p.category}</span>
                  </span>
                  <span className="shrink-0 text-[12px] font-extrabold text-gold">₹{p.sale}</span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
