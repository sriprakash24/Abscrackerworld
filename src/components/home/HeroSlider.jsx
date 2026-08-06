import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
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

export default function HeroSlider() {
  return (
    <div className="px-4 pb-3.5">
      <div
        className="overflow-hidden rounded-[20px] border border-orange/35 bg-gradient-to-br from-[#1a0f04] to-[#0c0704]"
        style={{
          boxShadow:
            '0 1px 0 rgba(255,210,150,.15) inset, 0 20px 40px -14px rgba(0,0,0,.7), 0 8px 30px rgba(255,122,0,.18)',
        }}
      >
        <Swiper
          modules={[Autoplay, Pagination]}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true, el: '.hero-dots' }}
          loop
        >
          {HERO_SLIDES.map((slide, i) => (
            <SwiperSlide key={i}>
              <button
                type="button"
                onClick={() => toast('Full catalog coming soon')}
                className="block w-full"
              >
                <img
                  src={slide.image}
                  alt={slide.alt}
                  className="aspect-[3/2] w-full object-cover"
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      <div className="hero-dots mt-2.5 flex justify-center gap-1.5 pb-1 [&_.swiper-pagination-bullet]:h-1.5 [&_.swiper-pagination-bullet]:w-1.5 [&_.swiper-pagination-bullet]:rounded-full [&_.swiper-pagination-bullet]:bg-[#3a332c] [&_.swiper-pagination-bullet]:opacity-100 [&_.swiper-pagination-bullet-active]:w-[18px] [&_.swiper-pagination-bullet-active]:bg-orange [&_.swiper-pagination-bullet-active]:shadow-[0_0_6px_var(--color-glow)]" />
    </div>
  );
}
