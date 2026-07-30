const shimmer = 'animate-shimmer bg-[linear-gradient(90deg,#1a1512_25%,#241c15_37%,#1a1512_63%)] bg-[length:200%_100%]';

export default function AdminOrderCardSkeleton() {
  return (
    <div className="surface-3d flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className={`h-3 w-28 rounded ${shimmer}`} />
        <div className="flex gap-1.5">
          <div className={`h-5 w-24 rounded-full ${shimmer}`} />
          <div className={`h-5 w-20 rounded-full ${shimmer}`} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-11 w-11 shrink-0 rounded-lg ${shimmer}`} />
        ))}
        <div className="min-w-0 flex-1 pl-1">
          <div className={`h-3 w-2/3 rounded ${shimmer}`} />
          <div className={`mt-1.5 h-2.5 w-1/2 rounded ${shimmer}`} />
        </div>
      </div>
    </div>
  );
}
