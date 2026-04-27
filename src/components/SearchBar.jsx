import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { searchAllLocalWords } from '../db/dexie'

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

export default function SearchBar({ autoFocus = false, initialValue = '' }) {
  const [value, setValue] = useState(initialValue)
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const navigate = useNavigate()
  const location = useLocation()
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  function navigateTo(word) {
    const targetPath = `/word/${encodeURIComponent(word.trim())}`
    setSuggestions([])
    setShowDropdown(false)
    setActiveIndex(-1)
    navigate(targetPath, { replace: targetPath === location.pathname })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const word = activeIndex >= 0 ? suggestions[activeIndex] : value
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

    debounceRef.current = setTimeout(async () => {
      const local = await searchAllLocalWords(query.trim())

      let online = []
      if (navigator.onLine) {
        try {
          // Build umlaut-expanded variants so "grune" also searches "grüne"
          const wikiQueries = buildWiktionaryQueries(query.trim())
          const fetches = wikiQueries.map(q =>
            fetch(`https://de.wiktionary.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&namespace=0&limit=8&format=json&origin=*`)
              .then(r => r.json())
              .then(d => d[1] || [])
              .catch(() => [])
          )
          const results = await Promise.all(fetches)
          online = [...new Set(results.flat())]
        } catch {
          // silently ignore network errors
        }
      }

      const seen = new Set(local.map(w => w.toLowerCase()))
      const merged = [...local]
      for (const w of online) {
        if (!seen.has(w.toLowerCase())) {
          seen.add(w.toLowerCase())
          merged.push(w)
        }
      }

      const final = merged.slice(0, 8)
      setSuggestions(final)
      setShowDropdown(final.length > 0)
    }, 300)
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
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
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
            {suggestions.map((word, i) => (
              <li
                key={word}
                onMouseDown={() => navigateTo(word)}
                className={`px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                  i === activeIndex
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {word}
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
