import AudioButton from './AudioButton'
import SaveButton from './SaveButton'
import NounForms from './forms/NounForms'
import VerbForms from './forms/VerbForms'
import AdjectiveForms from './forms/AdjectiveForms'
import ExampleSentences from './ExampleSentences'
import { useSettings } from '../context/SettingsContext'

const TYPE_LABELS = {
  noun: 'Noun',
  verb: 'Verb',
  adjective: 'Adjective',
  adverb: 'Adverb',
  pronoun: 'Pronoun',
  preposition: 'Preposition',
  conjunction: 'Conjunction',
  article: 'Article',
  interjection: 'Interjection',
  numeral: 'Numeral',
  particle: 'Particle',
}

export default function WordEntry({ entry, loadingExamples }) {
  const { settings } = useSettings()

  if (!entry) return null

  const typeLabel = TYPE_LABELS[entry.type] || entry.type

  return (
    <article className="px-4 py-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">{entry.word}</h1>
          <AudioButton word={entry.word} />
          <SaveButton entry={entry} />
        </div>
      </div>

      {/* IPA + type badge */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {entry.ipa && (
          <span className="text-slate-500 text-sm font-mono">{entry.ipa}</span>
        )}
        {entry.ipa && <span className="text-slate-300">·</span>}
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
          {typeLabel}
        </span>
        {entry.offlineOnly && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
            Offline
          </span>
        )}
      </div>

      {/* Definitions */}
      {entry.definitions?.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Definition{entry.definitions.length > 1 ? 's' : ''}
          </h2>
          <ol className="space-y-1.5">
            {entry.definitions.map((def, i) => (
              <li key={i} className="flex gap-2 text-slate-800 text-sm leading-relaxed">
                {entry.definitions.length > 1 && (
                  <span className="text-slate-400 font-medium shrink-0 w-4">{i + 1}.</span>
                )}
                <span>{def.english}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Word forms by type */}
      {entry.type === 'noun' && <NounForms forms={entry.forms} />}
      {entry.type === 'verb' && <VerbForms forms={entry.forms} />}
      {entry.type === 'adjective' && <AdjectiveForms forms={entry.forms} />}

      {/* Example sentences */}
      <ExampleSentences
        examples={entry.examples}
        loading={loadingExamples}
        level={settings.cefrLevel}
      />
    </article>
  )
}
