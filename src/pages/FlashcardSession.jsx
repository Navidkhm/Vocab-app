import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getDueCards, getAllFlashcards, getReviewedToday, updateCardAfterReview } from '../db/flashcards'
import { getSavedWord, getCachedEntry } from '../db/dexie'
import FlashcardCard from '../components/FlashcardCard'

export default function FlashcardSession() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const filter = searchParams.get('filter') || 'all'
  const mode = searchParams.get('mode') || 'study'
  const drillCards = searchParams.get('cards') || 'all'
  const isDrill = mode === 'drill'

  const [cards, setCards] = useState(null)
  const [entries, setEntries] = useState({})
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState([]) // { correct: bool }
  const [done, setDone] = useState(false)
  const cardKeyRef = useRef(0)

  useEffect(() => {
    async function load() {
      let due
      if (isDrill) {
        due = drillCards === 'today' ? await getReviewedToday() : await getAllFlashcards()
      } else {
        due = await getDueCards(filter)
      }
      // Shuffle
      const shuffled = [...due].sort(() => Math.random() - 0.5)
      setCards(shuffled)

      // Load word entries in parallel
      const wordCards = shuffled.filter(c => c.type === 'word')
      const entryMap = {}
      await Promise.all(
        wordCards.map(async c => {
          const saved = await getSavedWord(c.word)
          if (saved) {
            entryMap[c.word] = saved.entry
          } else {
            const cached = await getCachedEntry(c.word)
            if (cached) entryMap[c.word] = cached
          }
        })
      )
      setEntries(entryMap)
    }
    load()
  }, [filter, isDrill, drillCards])

  async function handleAnswer(correct) {
    const card = cards[index]
    if (!isDrill) await updateCardAfterReview(card.id, correct)
    setResults(prev => [...prev, { correct }])

    const nextIndex = index + 1
    if (nextIndex >= cards.length) {
      setDone(true)
    } else {
      cardKeyRef.current += 1
      setIndex(nextIndex)
      setFlipped(false)
    }
  }

  if (cards === null) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (cards.length === 0) {
    return <NoDueCards isDrill={isDrill} drillCards={drillCards} onBack={() => navigate('/flashcards')} />
  }

  if (done) {
    const correct = results.filter(r => r.correct).length
    return <SessionSummary correct={correct} total={results.length} isDrill={isDrill} onBack={() => navigate('/flashcards')} />
  }

  const card = cards[index]
  const wordEntry = card.type === 'word' ? entries[card.word] : null

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="bg-slate-800 px-4 pt-10 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/flashcards')}
          className="text-slate-300 hover:text-white p-1.5 -ml-1.5"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isDrill && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-700 text-violet-200">
                Drill
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-300"
                style={{ width: `${(index / cards.length) * 100}%` }}
              />
            </div>
            <span className="text-slate-400 text-xs shrink-0">{index + 1} / {cards.length}</span>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 px-4 pt-6 pb-4">
        <FlashcardCard
          key={cardKeyRef.current}
          card={card}
          wordEntry={wordEntry}
          onFlipped={() => setFlipped(true)}
        />
      </div>

      {/* Action buttons — appear after flip */}
      <div className={`fixed bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-white border-t border-slate-100 transition-all duration-300 ${flipped ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            onClick={() => handleAnswer(false)}
            className="flex-1 py-3.5 border-2 border-red-200 text-red-500 font-semibold rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors"
          >
            Missed
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="flex-1 py-3.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 active:bg-green-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

function NoDueCards({ isDrill, drillCards, onBack }) {
  const isDrillToday = isDrill && drillCards === 'today'
  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-8 text-center">
      <div className="text-5xl mb-4">{isDrillToday ? '📖' : '✅'}</div>
      <p className="text-slate-800 font-semibold text-lg">
        {isDrillToday ? 'Nothing studied today yet' : 'All caught up!'}
      </p>
      <p className="text-slate-400 text-sm mt-1">
        {isDrillToday
          ? 'Complete a study session first, then come back to drill today\'s cards.'
          : 'No cards due today. Come back tomorrow.'}
      </p>
      <button
        onClick={onBack}
        className="mt-6 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700"
      >
        Back to deck
      </button>
    </div>
  )
}

function SessionSummary({ correct, total, isDrill, onBack }) {
  const pct = Math.round((correct / total) * 100)
  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-8 text-center">
      <div className="text-5xl mb-4">{pct >= 80 ? '🎉' : pct >= 50 ? '📚' : '💪'}</div>
      <p className="text-slate-800 font-bold text-2xl">{correct}/{total}</p>
      <p className="text-slate-500 text-sm mt-1">
        {isDrill ? 'Drill complete' : (pct >= 80 ? 'Great session!' : pct >= 50 ? 'Keep going!' : 'Keep practicing!')} · {pct}% correct
      </p>
      <div className="mt-4 w-full max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <button
        onClick={onBack}
        className="mt-8 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700"
      >
        Back to deck
      </button>
    </div>
  )
}
