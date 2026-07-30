import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { HERO_SLIDES } from '../../constants/catalog';
import { toast } from 'sonner';

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
              <div className="relative flex min-h-[230px] items-center overflow-hidden px-[18px] py-[26px]">
                <div
                  className="absolute inset-0"
                  style={{ background: 'radial-gradient(circle at 78% 45%, rgba(255,122,0,.35), transparent 60%)' }}
                />
                <div className="relative z-10 max-w-[56%]">
                  <div className="text-[17px] font-black tracking-wide text-white">{slide.eyebrow}</div>
                  <div className="text-embossed my-0.5 mb-2 text-[30px] font-black leading-[1.02] text-gradient-gold">
                    {slide.headline}
                  </div>
                  <div className="mb-1 text-base font-extrabold text-white">
                    {slide.offerLabel} <b className="text-[20px] text-gold">{slide.offerValue}</b>
                  </div>
                  <div className="mb-3.5 text-[11px] text-[#e8ddce]">
                    {slide.note} <b className="text-orange">{slide.noteStrong}</b>
                  </div>
                  <button
                    onClick={() => toast(`${slide.cta} — full catalog coming soon`)}
                    className="btn-3d overflow-hidden rounded-[10px] px-[22px] py-2.5 text-xs font-extrabold tracking-wide text-white"
                  >
                    {slide.cta}
                  </button>
                </div>
                <div className="art-float absolute bottom-[-10px] right-[-10px] z-[1] text-[90px]">
                  {slide.art}
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      <div className="hero-dots mt-2.5 flex justify-center gap-1.5 pb-1 [&_.swiper-pagination-bullet]:h-1.5 [&_.swiper-pagination-bullet]:w-1.5 [&_.swiper-pagination-bullet]:rounded-full [&_.swiper-pagination-bullet]:bg-[#3a332c] [&_.swiper-pagination-bullet]:opacity-100 [&_.swiper-pagination-bullet-active]:w-[18px] [&_.swiper-pagination-bullet-active]:bg-orange [&_.swiper-pagination-bullet-active]:shadow-[0_0_6px_var(--color-glow)]" />
    </div>
  );
}
