export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 mx-auto max-w-[430px] overflow-hidden">
      {/* Theme 5 — Clean Light & Peach: cream base with a soft peach wash
          and a few warm glows, so cards (white) lift off the page. */}
      <div className="absolute inset-0 bg-bg" />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #fff7e8 0%, #ffe9d0 55%, #ffe4cc 100%)' }}
      />
      <div
        className="absolute inset-x-0 top-0 h-1/3"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,179,71,0.28) 0%, rgba(255,255,255,0) 68%)' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(255,138,101,0.22) 0%, rgba(240,68,82,0.08) 40%, rgba(255,255,255,0) 70%)' }}
      />
    </div>
  );
}
