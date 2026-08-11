import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import { toast } from 'sonner';
import heroSlide1 from '../../assets/hero/hero-slide-1.jpg';
import heroSlide2 from '../../assets/hero/hero-slide-2.jpg';
import heroSlide3 from '../../assets/hero/hero-slide-3.jpg';

// Full-bleed promo banners (replaces the old text/emoji overlay slides —
// these images already carry their own headline, offer and CTA artwork).
const HERO_SLIDES = [
  { image: heroSlide1, alt: 'ABS Crackers World — up to 90% off on all products' },
  { image: heroSlide2, alt: 'ABS Crackers — factory direct prices, bulk orders welcome' },
  { image: heroSlide3, alt: 'Light up the night — Diwali mega sale, up to 90% off' },
];

const AUTOPLAY_MS = 4200;

export default function HeroSlider() {
  const [active, setActive] = useState(0);
  // Bumped on every slide change (even when looping back to the same
  // index) so the active bar's fill animation reliably restarts.
  const [tick, setTick] = useState(0);

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden">
      <Swiper
        modules={[Autoplay, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={900}
        autoplay={{ delay: AUTOPLAY_MS, disableOnInteraction: false }}
        onSlideChange={(s) => {
          setActive(s.realIndex);
          setTick((t) => t + 1);
        }}
        loop
        className="h-full w-full"
      >
        {HERO_SLIDES.map((slide, i) => (
          <SwiperSlide key={i}>
            <button
              type="button"
              onClick={() => toast('Full catalog coming soon')}
              className="block h-full w-full"
              style={i === 0 ? { background: '#00030a' } : undefined}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                // Slide 1's artwork is a taller 3:2 poster with headline/offer
                // text running edge-to-edge top and bottom — object-cover on
                // this 16:9 rail was slicing that text off. object-contain
                // shows the whole poster; the near-black backdrop above
                // matches the artwork's own background so there's no visible
                // letterbox bar. Slides 2–3 fit the rail fine as-is.
                className={i === 0 ? 'h-full w-full object-contain' : 'h-full w-full object-cover'}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </button>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Glass depth scrims — seat the chip/progress rail readably over
          whatever's busy in the photo underneath, top and bottom. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 z-[1]"
        style={{ background: 'linear-gradient(180deg, rgba(10,0,2,.35), rgba(10,0,2,0))' }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 z-[1]"
        style={{ background: 'linear-gradient(0deg, rgba(10,0,2,.55), rgba(10,0,2,0))' }}
      />

      {/* Slim glass progress rail — a premium alternative to plain dots.
          One segment per slide; the active segment fills over the exact
          autoplay dwell time, completed ones stay lit, upcoming ones sit
          dim — so progress through the set is always legible at a glance. */}
      <div className="absolute inset-x-4 bottom-3 z-10 flex gap-1.5">
        {HERO_SLIDES.map((_, i) => (
          <div
            key={i}
            className="h-[3px] flex-1 overflow-hidden rounded-full"
            style={{ background: 'rgba(255,255,255,.22)', backdropFilter: 'blur(6px)' }}
          >
            <div
              key={i === active ? `fill-${i}-${tick}` : `static-${i}`}
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, var(--color-gold), var(--color-orange))',
                boxShadow: '0 0 8px 1px rgba(255,179,0,.75)',
                width: i < active ? '100%' : i > active ? '0%' : undefined,
                animation: i === active ? `heroBarFill ${AUTOPLAY_MS}ms linear forwards` : 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Slide counter chip — small glass pill, quietly premium, doesn't
          compete with the artwork's own baked-in headline/CTA. */}
      <div
        className="absolute right-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#f7ead0]"
        style={{
          background: 'rgba(20,2,4,.45)',
          backdropFilter: 'blur(10px) saturate(160%)',
          WebkitBackdropFilter: 'blur(10px) saturate(160%)',
          border: '1px solid rgba(255,213,79,.35)',
          boxShadow: '0 4px 14px -4px rgba(0,0,0,.6)',
        }}
      >
        {active + 1} / {HERO_SLIDES.length}
      </div>
    </div>
  );
}
