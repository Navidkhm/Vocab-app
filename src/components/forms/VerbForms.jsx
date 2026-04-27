const PERSONS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie']

const TENSES = [
  { key: 'praesens', label: 'Präsens' },
  { key: 'praeteritum', label: 'Präteritum' },
  { key: 'perfekt', label: 'Perfekt' },
  { key: 'futur', label: 'Futur I' },
]

export default function VerbForms({ forms }) {
  if (!forms) return null

  const hasTenses = TENSES.some(t => forms[t.key] && Object.keys(forms[t.key]).length > 0)
  if (!hasTenses && !forms.partizipII && !forms.imperativ) return null

  return (
    <section className="mt-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Conjugation
      </h2>
      <div className="space-y-4">
        {TENSES.map(({ key, label }) => {
          const tenseData = forms[key]
          if (!tenseData || Object.keys(tenseData).length === 0) return null
          return (
            <div key={key}>
              <h3 className="text-xs font-semibold text-blue-600 mb-1.5 px-1">{label}</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <tbody>
                    {PERSONS.map(person => {
                      const form = tenseData[person]
                      if (!form) return null
                      return (
                        <tr key={person} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 px-3 text-slate-500 w-24">{person}</td>
                          <td className="py-2 px-3 text-slate-900 font-medium">{form}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        {(forms.partizipII || forms.imperativ) && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <tbody>
                {forms.partizipII && (
                  <tr className="border-b border-slate-100">
                    <td className="py-2.5 px-3 text-slate-500 font-medium w-28">Partizip II</td>
                    <td className="py-2.5 px-3 text-slate-900 font-medium">{forms.partizipII}</td>
                  </tr>
                )}
                {forms.imperativ && (
                  <tr>
                    <td className="py-2.5 px-3 text-slate-500 font-medium">Imperativ</td>
                    <td className="py-2.5 px-3 text-slate-900">{forms.imperativ}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
