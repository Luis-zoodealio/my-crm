export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading board" className="flex flex-col gap-6">
      <div className="skeleton h-8 w-32" />
      <div className="flex gap-3.5 overflow-hidden">
        {[0, 1, 2, 3, 4].map((c) => (
          <div key={c} className="flex w-[252px] flex-none flex-col gap-2.5">
            <div className="skeleton h-4 w-36" />
            <div className="skeleton h-[3px] w-full" />
            {[0, 1].map((i) => (
              <div key={i} className="skeleton h-[150px] w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
