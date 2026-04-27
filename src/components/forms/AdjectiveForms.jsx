export default function AdjectiveForms({ forms }) {
  if (!forms) return null
  const { comparative, superlative } = forms
  if (!comparative && !superlative) return null

  return (
    <section className="mt-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Forms
      </h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <tbody>
            {comparative && (
              <tr className="border-b border-slate-100">
                <td className="py-2.5 px-3 text-slate-500 font-medium w-32">Comparative</td>
                <td className="py-2.5 px-3 text-slate-900 font-medium">{comparative}</td>
              </tr>
            )}
            {superlative && (
              <tr>
                <td className="py-2.5 px-3 text-slate-500 font-medium">Superlative</td>
                <td className="py-2.5 px-3 text-slate-900 font-medium">{superlative}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
