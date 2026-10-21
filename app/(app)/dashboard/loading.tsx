export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-9 w-[420px] max-w-full" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-white p-5">
            <div className="skeleton h-3.5 w-28" />
            <div className="skeleton h-9 w-16" />
            <div className="skeleton h-3.5 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl border border-border bg-white p-[22px]">
            <div className="skeleton h-5 w-24" />
            {[0, 1, 2].map((j) => (
              <div key={j} className="flex flex-col gap-1.5 border-t border-border pt-3">
                <div className="skeleton h-4 w-56 max-w-full" />
                <div className="skeleton h-3.5 w-32" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
