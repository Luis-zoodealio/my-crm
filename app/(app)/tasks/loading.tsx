export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading tasks" className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="skeleton h-8 w-44" />
        <div className="skeleton h-9 w-28" />
      </div>
      {[0, 1].map((g) => (
        <div key={g} className="flex flex-col gap-3 rounded-xl border border-border bg-white p-[22px]">
          <div className="skeleton h-5 w-24" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3.5 border-t border-border pt-3">
              <div className="skeleton size-[18px]" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="skeleton h-4 w-64 max-w-full" />
                <div className="skeleton h-3.5 w-48" />
              </div>
              <div className="skeleton h-4 w-24" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
