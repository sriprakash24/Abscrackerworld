export default function SkeletonCard() {
  return (
    <div className="surface-3d flex flex-col overflow-hidden rounded-2xl p-2.5">
      <div className="h-[86px] w-full overflow-hidden rounded-xl bg-[#1a1512]">
        <div className="h-full w-full animate-shimmer bg-[linear-gradient(90deg,#1a1512_25%,#241c15_37%,#1a1512_63%)] bg-[length:200%_100%]" />
      </div>
      <div className="mt-2 h-3 w-[90%] animate-shimmer rounded bg-[linear-gradient(90deg,#1a1512_25%,#241c15_37%,#1a1512_63%)] bg-[length:200%_100%]" />
      <div className="mt-1.5 h-3 w-[60%] animate-shimmer rounded bg-[linear-gradient(90deg,#1a1512_25%,#241c15_37%,#1a1512_63%)] bg-[length:200%_100%]" />
      <div className="mt-1.5 h-3.5 w-[45%] animate-shimmer rounded bg-[linear-gradient(90deg,#1a1512_25%,#241c15_37%,#1a1512_63%)] bg-[length:200%_100%]" />
      <div className="mt-2 h-7 w-full animate-shimmer rounded-lg bg-[linear-gradient(90deg,#231a10_25%,#2e2214_37%,#231a10_63%)] bg-[length:200%_100%]" />
    </div>
  );
}
