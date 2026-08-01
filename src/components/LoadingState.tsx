export function LoadingState() {
  return (
    <div className="flex w-full flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-neutral-100 bg-neutral-50 p-5"
        >
          <div className="mb-2 h-4 w-1/3 rounded bg-neutral-200" />
          <div className="h-3 w-2/3 rounded bg-neutral-200" />
        </div>
      ))}
    </div>
  )
}

export function InlineLoadingState() {
  return (
    <div className="flex flex-col gap-2 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-3 w-full animate-pulse rounded bg-neutral-200" />
      ))}
    </div>
  )
}
