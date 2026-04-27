export default function SkeletonCard() {
  return (
    <div className="animate-pulse px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-9 bg-slate-200 rounded w-40" />
        <div className="h-9 w-9 bg-slate-200 rounded-full" />
        <div className="h-9 w-9 bg-slate-200 rounded-full" />
      </div>
      <div className="h-4 bg-slate-200 rounded w-32" />
      <div className="space-y-2 pt-2">
        <div className="h-3 bg-slate-200 rounded w-full" />
        <div className="h-3 bg-slate-200 rounded w-5/6" />
        <div className="h-3 bg-slate-200 rounded w-4/6" />
      </div>
      <div className="pt-2 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-24" />
        <div className="h-20 bg-slate-200 rounded" />
      </div>
    </div>
  )
}
