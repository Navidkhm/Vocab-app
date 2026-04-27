export default function NounForms({ forms }) {
  if (!forms) return null
  const { article, plural, genitive } = forms
  if (!article && !plural && !genitive) return null

  return (
    <section className="mt-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Forms
      </h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <tbody>
            {article && (
              <tr className="border-b border-slate-100">
                <td className="py-2.5 px-3 text-slate-500 font-medium w-28">Article</td>
                <td className="py-2.5 px-3 text-slate-900 font-semibold">{article}</td>
              </tr>
            )}
            {plural && (
              <tr className="border-b border-slate-100">
                <td className="py-2.5 px-3 text-slate-500 font-medium">Plural</td>
                <td className="py-2.5 px-3 text-slate-900">{plural}</td>
              </tr>
            )}
            {genitive && (
              <tr>
                <td className="py-2.5 px-3 text-slate-500 font-medium">Genitive</td>
                <td className="py-2.5 px-3 text-slate-900">{genitive}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
