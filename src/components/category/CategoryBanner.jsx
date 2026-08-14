import { motion } from 'framer-motion';
import FireworkBurst from '../ui/FireworkBurst';
import CategoryIcon from '../home/CategoryIcon';

export default function CategoryBanner({ name, icon, image, tagline, productCount }) {
  return (
    <div className="px-4 pb-3 pt-3">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-[20px] p-5"
        style={{
          background:
            'radial-gradient(120% 140% at 15% 0%, #3a2410 0%, #1c1108 45%, #0a0705 100%)',
          border: '1px solid rgba(255,178,90,.22)',
          boxShadow:
            '0 1px 0 rgba(255,200,130,.14) inset, 0 18px 34px -16px rgba(0,0,0,.7), 0 0 30px rgba(255,122,0,.15)',
        }}
      >
        <FireworkBurst size={110} className="-right-4 -top-6 opacity-60" delay={0.2} />
        <FireworkBurst size={90} className="bottom-[-20px] right-16 opacity-40" delay={1.1} color="orange" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="orb-3d flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden !rounded-2xl text-[32px]">
            <CategoryIcon
              image={image}
              icon={icon}
              name={name}
              className="art-float flex h-full w-full items-center justify-center leading-none"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-embossed truncate text-[19px] font-extrabold tracking-wide text-[#f7f0e4]">
              {name}
            </h1>
            <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-[#cfc7bd]">{tagline}</p>
            <span className="mt-2 inline-flex items-center rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">
              {productCount} items available
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
