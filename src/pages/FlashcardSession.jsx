import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getDueCards, getCardsByCategory, updateCardAfterReview, INTERVALS } from '../db/flashcards'
import { getSavedWord, getCachedEntry } from '../db/dexie'
import FlashcardCard from '../components/FlashcardCard'

const DRILL_LABEL = { new: 'New', learning: 'Learning', review: 'Review', mature: 'Mature' }

function getCarryOverFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('drillCarryOver') || '{}')
  } catch {
    return {}
  }
}

function saveCarryOverToStorage(data) {
  localStorage.setItem('drillCarryOver', JSON.stringify(data))
}

export default function FlashcardSession() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') || 'suggested'
  const category = searchParams.get('category') || 'new'
  const isSuggested = mode === 'suggested'

  const [cards, setCards] = useState(null)
  const [entries, setEntries] = useState({})
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const cardKeyRef = useRef(0)

  // Suggested mode
  const [round, setRound] = useState(1)
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [totalSeen, setTotalSeen] = useState(0)
  const [masteredThisSession, setMasteredThisSession] = useState(0)
  const [showRoundTransition, setShowRoundTransition] = useState(false)
  const missedCardsRef = useRef([])

  // Drill mode
  const [carryOverCount, setCarryOverCount] = useState(0)
  const drillResultsRef = useRef([])

  const [done, setDone] = useState(false)

  useEffect(() => {
    loadCards()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadCards() {
    let deck
    let coCount = 0

    if (isSuggested) {
      const due = await getDueCards()
      deck = [...due].sort(() => Math.random() - 0.5)
    } else {
      const carryOverAll = getCarryOverFromStorage()
      const carryOverIds = (carryOverAll[category] || []).slice(0, 25)
      const categoryCards = await getCardsByCategory(category)

      const carryOverCards = categoryCards.filter(c => carryOverIds.includes(c.id))
      const freshPool = categoryCards.filter(c => !carryOverIds.includes(c.id))
      const freshNeeded = Math.max(0, 25 - carryOverCards.length)
      const shuffledFresh = [...freshPool].sort(() => Math.random() - 0.5).slice(0, freshNeeded)

      deck = [...carryOverCards, ...shuffledFresh]
      coCount = carryOverCards.length
    }

    setCarryOverCount(coCount)
    setCards(deck)
    await loadEntries(deck)
  }

  async function loadEntries(deck) {
    const wordCards = deck.filter(c => c.type === 'word')
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
    setEntries(prev => ({ ...prev, ...entryMap }))
  }

  async function handleAnswer(correct) {
    const card = cards[index]
    // Suggested: always update SRS. Drill: only penalize on miss, never advance on correct.
    if (isSuggested) {
      await updateCardAfterReview(card.id, correct)
    } else if (!correct) {
      await updateCardAfterReview(card.id, false)
    }

    const newTotalCorrect = correct ? totalCorrect + 1 : totalCorrect
    const newTotalSeen = totalSeen + 1
    setTotalCorrect(newTotalCorrect)
    setTotalSeen(newTotalSeen)

    if (isSuggested) {
      if (correct) {
        const newIdx = Math.min(card.intervalIndex + 1, INTERVALS.length - 1)
        if (card.intervalIndex < 6 && newIdx >= 6) {
          setMasteredThisSession(m => m + 1)
        }
      } else {
        missedCardsRef.current = [...missedCardsRef.current, card]
      }

      const nextIndex = index + 1
      if (nextIndex >= cards.length) {
        if (missedCardsRef.current.length > 0) {
          setShowRoundTransition(true)
        } else {
          setDone(true)
        }
      } else {
        advance()
      }
    } else {
      drillResultsRef.current = [...drillResultsRef.current, { cardId: card.id, correct }]

      const nextIndex = index + 1
      if (nextIndex >= cards.length) {
        await finalizeDrillCarryOver()
        setDone(true)
      } else {
        advance()
      }
    }
  }

  function advance() {
    cardKeyRef.current += 1
    setIndex(i => i + 1)
    setFlipped(false)
  }

  function startNextRound() {
    const missed = missedCardsRef.current
    missedCardsRef.current = []
    setCards(missed)
    setIndex(0)
    setFlipped(false)
    setRound(r => r + 1)
    setShowRoundTransition(false)
    cardKeyRef.current += 1
    loadEntries(missed)
  }

  async function finalizeDrillCarryOver() {
    const results = drillResultsRef.current
    const wrongIds = results.filter(r => !r.correct).map(r => r.cardId)

    const allCarryOver = getCarryOverFromStorage()
    if (wrongIds.length === 0) {
      allCarryOver[category] = []
      saveCarryOverToStorage(allCarryOver)
      return
    }

    const categoryCards = await getCardsByCategory(category)
    const categoryIdSet = new Set(categoryCards.map(c => c.id))
    allCarryOver[category] = wrongIds.filter(id => categoryIdSet.has(id))
    saveCarryOverToStorage(allCarryOver)
  }

  if (cards === null) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (cards.length === 0) {
    return <NoDueCards isSuggested={isSuggested} category={category} onBack={() => navigate('/flashcards')} />
  }

  if (showRoundTransition) {
    return (
      <RoundTransition
        round={round + 1}
        missedCount={missedCardsRef.current.length}
        onContinue={startNextRound}
        onEnd={() => navigate('/flashcards')}
      />
    )
  }

  if (done) {
    return (
      <SessionSummary
        correct={totalCorrect}
        total={totalSeen}
        mastered={masteredThisSession}
        rounds={round}
        isSuggested={isSuggested}
        onBack={() => navigate('/flashcards')}
      />
    )
  }

  const card = cards[index]
  const wordEntry = card.type === 'word' ? entries[card.word] : null
  const progress = (index / cards.length) * 100

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
          <div className="flex items-center gap-2 mb-1.5">
            {isSuggested ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-600 text-blue-100">
                Suggested · Round {round}
              </span>
            ) : (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-700 text-violet-200">
                Drill · {DRILL_LABEL[category]}
                {carryOverCount > 0 && (
                  <span className="ml-1 opacity-80">· {carryOverCount} from last session</span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
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

      {/* Action buttons */}
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

function RoundTransition({ round, missedCount, onContinue, onEnd }) {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-8 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-amber-500">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 .49-4" />
        </svg>
      </div>
      <p className="text-slate-800 font-bold text-xl">Round {round}</p>
      <p className="text-slate-500 text-sm mt-2">
        {missedCount} {missedCount === 1 ? 'card' : 'cards'} to retry
      </p>
      <div className="flex gap-3 mt-8 w-full max-w-xs">
        <button
          onClick={onEnd}
          className="flex-1 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50"
        >
          End session
        </button>
        <button
          onClick={onContinue}
          className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function NoDueCards({ isSuggested, category, onBack }) {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-8 text-center">
      <div className="text-5xl mb-4">{isSuggested ? '✅' : '📭'}</div>
      <p className="text-slate-800 font-semibold text-lg">
        {isSuggested ? 'All caught up!' : `No ${DRILL_LABEL[category]} cards`}
      </p>
      <p className="text-slate-400 text-sm mt-1">
        {isSuggested
          ? 'No cards due today. Come back tomorrow.'
          : 'Add words to your deck to fill this category.'}
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

function SessionSummary({ correct, total, mastered, rounds, isSuggested, onBack }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 100
  const isPerfect = isSuggested && rounds === 1 && pct === 100

  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-8 text-center">
      <p className="text-slate-800 font-bold text-3xl">{pct}%</p>
      <p className="text-slate-500 text-sm mt-1">
        {correct} / {total} correct
        {rounds > 1 && ` · ${rounds} rounds`}
      </p>

      {isPerfect && (
        <p className="text-green-600 font-semibold mt-2">Perfect session!</p>
      )}

      {mastered > 0 && (
        <div className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl">
          <span className="text-green-600 text-sm font-semibold">+{mastered} mastered</span>
          <span className="text-green-400 text-xs">moved to mature stage</span>
        </div>
      )}

      <div className="mt-5 w-full max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden">
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
