export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 mx-auto max-w-[430px] overflow-hidden">
      {/* Deep navy base */}
      <div className="absolute inset-0 bg-[#0a0f1e]" />
      {/* Dark navy ambient layer */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#080c17] via-transparent to-[#080c17]" />
      {/* Orange radial glow, bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            'radial-gradient(ellipse at 50% 100%, rgba(255,122,0,0.22) 0%, rgba(0,0,0,0) 60%)',
        }}
      />
      {/* Golden ambient lighting, top */}
      <div
        className="absolute inset-x-0 top-0 h-1/3"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(255,213,79,0.10) 0%, rgba(0,0,0,0) 65%)',
        }}
      />
      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </div>
  );
}
