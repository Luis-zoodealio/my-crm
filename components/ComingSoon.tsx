export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-[-0.03em]">{title}</h1>
      <div className="max-w-[520px] rounded-xl border border-border bg-white p-6 text-[15px] leading-normal text-gray-700 shadow-sm">
        This screen is built in a later step.
      </div>
    </>
  )
}
