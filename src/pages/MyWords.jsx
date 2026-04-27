import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSavedWords } from '../hooks/useSavedWords'

export default function MyWords() {
  const { savedWords, unsave } = useSavedWords()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(null)

  const grouped = groupAlphabetically(savedWords)

  function handleDelete(word) {
    if (confirmDelete === word) {
      unsave(word)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(word)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <div className="bg-slate-800 px-4 pt-12 pb-6">
        <h1 className="text-white text-2xl font-bold">My Words</h1>
        <p className="text-slate-400 text-sm mt-1">
          {savedWords.length} {savedWords.length === 1 ? 'word' : 'words'} saved
        </p>
      </div>

      {savedWords.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 px-8 text-center mt-12">
          <div className="text-5xl mb-4">🔖</div>
          <p className="text-slate-700 font-medium">No saved words yet</p>
          <p className="text-slate-400 text-sm mt-1">
            Tap the bookmark icon on any word to save it for offline access.
          </p>
        </div>
      ) : (
        <div className="px-4 pt-4">
          {grouped.map(({ letter, words }) => (
            <div key={letter} className="mb-4">
              <div className="text-xs font-bold text-slate-400 px-1 mb-1 uppercase tracking-widest">
                {letter}
              </div>
              <div className="space-y-1">
                {words.map(({ word, entry, savedAt }) => (
                  <div
                    key={word}
                    className="flex items-center bg-white border border-slate-100 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => navigate(`/word/${encodeURIComponent(word)}`)}
                      className="flex-1 flex items-center justify-between py-3 px-4 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
                    >
                      <div>
                        <span className="text-slate-900 font-medium text-sm">{word}</span>
                        {entry?.definitions?.[0]?.english && (
                          <span className="text-slate-400 text-sm ml-2">
                            {entry.definitions[0].english.slice(0, 35)}
                            {entry.definitions[0].english.length > 35 ? '…' : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-300 text-xs ml-2 shrink-0">
                        {entry?.type || ''}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDelete(word)}
                      className={`px-4 py-3 text-xs font-medium transition-colors shrink-0 border-l border-slate-100 ${
                        confirmDelete === word
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      }`}
                      aria-label={`Remove ${word}`}
                    >
                      {confirmDelete === word ? 'Confirm' : '✕'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function groupAlphabetically(words) {
  const map = {}
  for (const item of words) {
    const letter = item.word[0].toUpperCase()
    if (!map[letter]) map[letter] = []
    map[letter].push(item)
  }
  return Object.keys(map)
    .sort()
    .map(letter => ({
      letter,
      words: map[letter].sort((a, b) => a.word.localeCompare(b.word)),
    }))
}
