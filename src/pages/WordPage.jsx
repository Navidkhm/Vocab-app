import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import WordEntry from '../components/WordEntry'
import SkeletonCard from '../components/SkeletonCard'
import SearchBar from '../components/SearchBar'
import { useWordLookup } from '../hooks/useWordLookup'
import { useSettings } from '../context/SettingsContext'

export default function WordPage() {
  const { word } = useParams()
  const navigate = useNavigate()
  const { entry, loading, error, loadingExamples, lookup } = useWordLookup()
  const { settings } = useSettings()

  useEffect(() => {
    if (word) {
      const decoded = decodeURIComponent(word)
      lookup(decoded, settings.cefrLevel)
    }
  }, [word, settings.cefrLevel])

  const decodedWord = word ? decodeURIComponent(word) : ''

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Search header */}
      <div className="bg-slate-800 px-4 pt-10 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-300 hover:text-white p-1.5 -ml-1.5"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1">
          <SearchBar key={decodedWord} initialValue={decodedWord} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {loading && <SkeletonCard />}

        {error === 'not_found' && (
          <div className="px-6 py-12 text-center">
            <p className="text-3xl mb-3">🤷</p>
            <p className="text-slate-700 font-medium">"{decodedWord}" not found</p>
            <p className="text-slate-400 text-sm mt-1">
              Check the spelling or try a different word.
            </p>
          </div>
        )}

        {error === 'offline' && (
          <div className="px-6 py-12 text-center">
            <p className="text-3xl mb-3">📵</p>
            <p className="text-slate-700 font-medium">You're offline</p>
            <p className="text-slate-400 text-sm mt-1">
              This word hasn't been saved. Connect to the internet to look it up.
            </p>
          </div>
        )}

        {error === 'error' && (
          <div className="px-6 py-12 text-center">
            <p className="text-3xl mb-3">⚠️</p>
            <p className="text-slate-700 font-medium">Something went wrong</p>
            <p className="text-slate-400 text-sm mt-1">
              Try again in a moment.
            </p>
            <button
              onClick={() => lookup(decodedWord, settings.cefrLevel)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && entry && (
          <WordEntry entry={entry} loadingExamples={loadingExamples} />
        )}
      </div>
    </div>
  )
}
