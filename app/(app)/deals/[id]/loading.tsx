export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading deal" className="flex flex-col gap-6">
      <div className="skeleton h-4 w-32" />
      <div className="flex flex-col gap-5 rounded-xl border border-border bg-white px-7 pb-5 pt-6">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-9 w-[420px] max-w-full" />
        <div className="skeleton h-8 w-full" />
      </div>
      <div className="grid grid-cols-1 items-start gap-5 min-[1200px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3.5">
          <div className="skeleton h-28 w-full" />
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 w-full" />)}
        </div>
        <div className="flex flex-col gap-3.5">
          <div className="skeleton h-36 w-full" />
          <div className="skeleton h-40 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      </div>
    </div>
  )
}
