export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading leads" className="grid grid-cols-1 items-start gap-5 min-[1400px]:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6">
        <div className="skeleton h-8 w-60" />
        <div className="skeleton h-8 w-96 max-w-full" />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border py-3">
            <div className="skeleton h-5 w-16" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="skeleton h-4 w-64 max-w-full" />
              <div className="skeleton h-3.5 w-32" />
            </div>
            <div className="skeleton h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-[22px]">
        <div className="skeleton h-5 w-36" />
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 w-full" />)}
      </div>
    </div>
  )
}
