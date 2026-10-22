export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading agents" className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="skeleton h-8 w-36" />
        <div className="skeleton h-10 w-[420px] max-w-full" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl border border-border bg-white p-5">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-4 w-28" />
            <div className="skeleton mt-3 h-5 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
