import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { searchAllLocalWords } from '../db/dexie'

const WIKTIONARY_API = 'https://en.wiktionary.org/w/api.php'
const POS_TERMS = [
  'Noun',
  'Verb',
  'Adjective',
  'Adverb',
  'Pronoun',
  'Preposition',
  'Conjunction',
  'Article',
  'Interjection',
  'Numeral',
  'Particle',
]

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

// Returns original query + umlaut-expanded variants for Wiktionary
// e.g. "grune" → ["grune", "grüne"]  |  "gruene" → ["gruene", "grüne"]
function buildWiktionaryQueries(query) {
  const q = query.toLowerCase()
  const variants = new Set([q])
  // DIN 5007-2 reverse: ue→ü, oe→ö, ae→ä (handles "gruene" → "grüne")
  const din = q.replace(/ue/g, 'ü').replace(/oe/g, 'ö').replace(/ae/g, 'ä').replace(/ss/g, 'ß')
  variants.add(din)
  // Single bare-vowel → umlaut (handles "grune" → "grüne")
  if (q.includes('u')) variants.add(q.replace('u', 'ü'))
  if (q.includes('o')) variants.add(q.replace('o', 'ö'))
  if (q.includes('a')) variants.add(q.replace('a', 'ä'))
  return [...variants]
}

function normalizeType(type) {
  if (!type) return null
  const lower = type.toLowerCase()
  return TYPE_LABELS[lower] || type
}

function getSuggestionWord(suggestion) {
  return typeof suggestion === 'string' ? suggestion : suggestion.word
}

async function fetchOnlineType(word) {
  try {
    const url = `${WIKTIONARY_API}?action=parse&format=json&page=${encodeURIComponent(word)}&prop=tocdata&origin=*`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    const sections = data.parse?.tocdata?.sections || []
    const germanIndex = sections.findIndex(section => section.line === 'German')
    if (germanIndex < 0) return null

    for (let i = germanIndex + 1; i < sections.length; i += 1) {
      const section = sections[i]
      if (section.tocLevel === 1 || section.hLevel === 2) break
      if (section.tocLevel === 2 || section.hLevel === 3) {
        const pos = POS_TERMS.find(term => section.line.startsWith(term))
        if (pos) return pos
      }
    }
  } catch {
    // Suggestions still work without a type label.
  }
  return null
}

async function withOnlineTypes(words) {
  const suggestions = await Promise.all(
    words.map(async word => ({
      word,
      type: await fetchOnlineType(word),
    }))
  )
  return suggestions.filter(suggestion => suggestion.type)
}

export default function SearchBar({ autoFocus = false, initialValue = '' }) {
  const [value, setValue] = useState(initialValue)
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const navigate = useNavigate()
  const location = useLocation()
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  async function loadSuggestions(query) {
    const trimmed = query.trim()
    if (!trimmed) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    const local = await searchAllLocalWords(trimmed)

    let online = []
    if (navigator.onLine) {
      try {
        // Build umlaut-expanded variants so "grune" also searches "grüne"
        const wikiQueries = buildWiktionaryQueries(trimmed)
        const fetches = wikiQueries.map(q =>
          fetch(`https://en.wiktionary.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&namespace=0&limit=8&format=json&origin=*`, { cache: 'no-store' })
            .then(r => r.json())
            .then(d => d[1] || [])
            .catch(() => [])
        )
        const results = await Promise.all(fetches)
        const onlineWords = [...new Set(results.flat())]
          .filter(word => !local.some(suggestion => suggestion.word === word))
          .slice(0, Math.max(0, 8 - local.length))
        online = await withOnlineTypes(onlineWords)
      } catch {
        // silently ignore network errors
      }
    }

    const seen = new Set(local.map(suggestion => suggestion.word))
    const merged = [...local]
    for (const suggestion of online) {
      if (!seen.has(suggestion.word)) {
        seen.add(suggestion.word)
        merged.push(suggestion)
      }
    }

    const final = merged.slice(0, 8)
    setSuggestions(final)
    setShowDropdown(final.length > 0)
  }

  function navigateTo(word) {
    const nextValue = word.trim()
    const targetPath = `/word/${encodeURIComponent(nextValue)}`
    setValue(nextValue)
    setSuggestions([])
    setShowDropdown(false)
    setActiveIndex(-1)
    navigate(targetPath, { replace: targetPath === location.pathname })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const word = activeIndex >= 0 ? getSuggestionWord(suggestions[activeIndex]) : value
    if (!word.trim()) return
    navigateTo(word)
  }

  function handleChange(e) {
    const query = e.target.value
    setValue(query)
    setActiveIndex(-1)

    clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(() => loadSuggestions(query), 300)
  }

  function handleFocus() {
    if (!value.trim()) return
    if (suggestions.length > 0) {
      setShowDropdown(true)
      return
    }
    clearTimeout(debounceRef.current)
    loadSuggestions(value)
  }

  function handleKeyDown(e) {
    if (!showDropdown || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setActiveIndex(-1)
    }
  }

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <div className="relative flex-1" ref={containerRef}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="search"
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder="Search German word…"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {value && (
          <button
            type="button"
            onClick={() => { setValue(''); setSuggestions([]); setShowDropdown(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            aria-label="Clear search"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {showDropdown && suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {suggestions.map((suggestion, i) => (
              <li
                key={suggestion.word}
                onMouseDown={() => navigateTo(suggestion.word)}
                className={`px-4 py-2.5 cursor-pointer text-sm transition-colors flex items-center justify-between gap-3 ${
                  i === activeIndex
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{suggestion.word}</span>
                {suggestion.type && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    {normalizeType(suggestion.type)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="submit"
        disabled={!value.trim()}
        className="px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white rounded-xl font-medium transition-colors text-sm"
      >
        Look up
      </button>
    </form>
  )
}
