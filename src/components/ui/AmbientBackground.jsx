export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 mx-auto max-w-[430px] overflow-hidden">
      {/* Deep crimson-black base, sampled from the festival scene's own sky
          gradient (near-black at the top, warming through crimson toward
          a glow) rather than a flat maroon fill. Retuned to sit closer to
          the new festive photo backdrop's own reds (#5a0605 / #910000-ish)
          so the two blend instead of reading as two different reds. */}
      <div className="absolute inset-0 bg-[#150007]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #0d0003 0%, #5a0605 38%, #3a0503 62%, #150006 100%)',
        }}
      />

      {/* Warm gold glow, top — diya/marquee lighting spilling down */}
      <div
        className="absolute inset-x-0 top-0 h-1/3"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(255,180,60,0.20) 0%, rgba(0,0,0,0) 65%)',
        }}
      />
      {/* Crimson/orange ambient glow, bottom — echoes the ground-level glow
          in the festival artwork */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            'radial-gradient(ellipse at 50% 100%, rgba(244,105,23,0.24) 0%, rgba(216,28,43,0.22) 35%, rgba(0,0,0,0) 68%)',
        }}
      />
      {/* Side embers — subtle warmth at the edges, echoing festoon lighting */}
      <div
        className="absolute inset-y-0 left-0 w-1/3"
        style={{
          background:
            'radial-gradient(ellipse at 0% 50%, rgba(255,140,20,0.10) 0%, rgba(0,0,0,0) 60%)',
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-1/3"
        style={{
          background:
            'radial-gradient(ellipse at 100% 50%, rgba(255,140,20,0.10) 0%, rgba(0,0,0,0) 60%)',
        }}
      />
      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.62) 100%)',
        }}
      />
    </div>
  );
}
