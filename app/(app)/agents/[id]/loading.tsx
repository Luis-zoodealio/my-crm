export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading agent" className="flex flex-col gap-6">
      <div className="skeleton h-4 w-32" />
      <div className="grid grid-cols-1 items-start gap-5 min-[1100px]:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-white p-6">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-4 w-40" />
          <div className="skeleton mt-3 h-12 w-full" />
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-[22px]">
          <div className="skeleton h-5 w-48" />
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-12 w-full" />)}
        </div>
      </div>
    </div>
  )
}
