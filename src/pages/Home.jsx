import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import { getRecentLookups } from '../db/dexie'

export default function Home() {
  const [recents, setRecents] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    getRecentLookups(10).then(setRecents)
  }, [])

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Hero search */}
      <div className="bg-slate-800 px-4 pt-12 pb-8">
        <h1 className="text-white text-2xl font-bold mb-1">German Vocab</h1>
        <p className="text-slate-400 text-sm mb-6">Your pocket German dictionary</p>
        <SearchBar autoFocus />
      </div>

      {/* Recent lookups */}
      {recents.length > 0 && (
        <div className="px-4 pt-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Recent
          </h2>
          <div className="space-y-1">
            {recents.map(({ word, entry }) => (
              <button
                key={word}
                onClick={() => navigate(`/word/${encodeURIComponent(word)}`)}
                className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-white border border-slate-100 hover:border-slate-200 active:bg-slate-50 transition-colors text-left"
              >
                <div>
                  <span className="text-slate-900 font-medium text-sm">{word}</span>
                  {entry?.definitions?.[0]?.english && (
                    <span className="text-slate-400 text-sm ml-2">
                      {entry.definitions[0].english.slice(0, 40)}
                      {entry.definitions[0].english.length > 40 ? '…' : ''}
                    </span>
                  )}
                </div>
                <span className="text-slate-300 text-xs ml-2 shrink-0">
                  {entry?.type || ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {recents.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 px-8 text-center mt-12">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-slate-500 text-sm">
            Search for any German word to see its full dictionary entry, pronunciation, and example sentences.
          </p>
        </div>
      )}
    </div>
  )
}
