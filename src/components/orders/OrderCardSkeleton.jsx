export default function OrderCardSkeleton() {
  return (
    <div className="surface-3d flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 animate-shimmer rounded bg-[linear-gradient(90deg,#1a1512_25%,#241c15_37%,#1a1512_63%)] bg-[length:200%_100%]" />
        <div className="h-5 w-24 animate-shimmer rounded-full bg-[linear-gradient(90deg,#1a1512_25%,#241c15_37%,#1a1512_63%)] bg-[length:200%_100%]" />
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-12 w-12 shrink-0 animate-shimmer rounded-lg bg-[linear-gradient(90deg,#1a1512_25%,#241c15_37%,#1a1512_63%)] bg-[length:200%_100%]"
          />
        ))}
      </div>
      <div className="h-3 w-1/2 animate-shimmer rounded bg-[linear-gradient(90deg,#1a1512_25%,#241c15_37%,#1a1512_63%)] bg-[length:200%_100%]" />
    </div>
  );
}
