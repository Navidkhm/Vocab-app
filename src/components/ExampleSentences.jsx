export default function ExampleSentences({ examples, loading, level }) {
  if (loading) {
    return (
      <section className="mt-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Examples ({level})
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse space-y-1.5">
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-3 bg-slate-100 rounded w-4/5" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (!examples?.length) return null

  return (
    <section className="mt-6">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Examples ({level})
      </h2>
      <div className="space-y-4">
        {examples.map((ex, i) => (
          <div key={i} className="bg-slate-50 rounded-xl p-3.5 space-y-1">
            <p className="text-slate-900 text-sm font-medium leading-snug">{ex.de}</p>
            <p className="text-slate-500 text-sm leading-snug">{ex.en}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
