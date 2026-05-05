import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllFlashcards, getCardStats, deleteFlashcard, deleteWordCard } from '../db/flashcards'
import AddCustomCardModal from '../components/AddCustomCardModal'

const DRILL_CATEGORIES = [
  {
    key: 'new',
    label: 'New',
    cls: 'bg-slate-100 text-slate-600 border-slate-200',
    info: 'Words you\'ve never reviewed yet.',
    interval: 'No history — first review coming up',
  },
  {
    key: 'learning',
    label: 'Learning',
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'Recently added words you\'re actively building memory for.',
    interval: '1-day review intervals',
  },
  {
    key: 'review',
    label: 'Review',
    cls: 'bg-violet-50 text-violet-700 border-violet-200',
    info: 'Words you know a bit — being reinforced over days.',
    interval: '2–8 day review intervals',
  },
  {
    key: 'mature',
    label: 'Mature',
    cls: 'bg-green-50 text-green-700 border-green-200',
    info: 'Well-known words reviewed infrequently to keep them fresh.',
    interval: '15–180 day review intervals',
  },
]

const MATURITY_LABEL = {
  new: { label: 'New', cls: 'bg-slate-100 text-slate-500' },
  learning: { label: 'Learning', cls: 'bg-amber-50 text-amber-600' },
  review: { label: 'Review', cls: 'bg-violet-50 text-violet-600' },
  mature: { label: 'Mature', cls: 'bg-green-50 text-green-600' },
}

function cardMaturity(card) {
  if (card.totalReviews === 0) return 'new'
  if (card.intervalIndex <= 2) return 'learning'
  if (card.intervalIndex < 6) return 'review'
  return 'mature'
}

function getCategoryCounts(allCards) {
  return {
    new: allCards.filter(c => c.totalReviews === 0).length,
    learning: allCards.filter(c => c.totalReviews > 0 && c.intervalIndex <= 2).length,
    review: allCards.filter(c => c.intervalIndex >= 3 && c.intervalIndex < 6).length,
    mature: allCards.filter(c => c.intervalIndex >= 6).length,
  }
}

function getCategoryAccuracy(allCards) {
  const buckets = {
    new: allCards.filter(c => c.totalReviews === 0),
    learning: allCards.filter(c => c.totalReviews > 0 && c.intervalIndex <= 2),
    review: allCards.filter(c => c.intervalIndex >= 3 && c.intervalIndex < 6),
    mature: allCards.filter(c => c.intervalIndex >= 6),
  }
  return Object.fromEntries(
    Object.entries(buckets).map(([key, cards]) => {
      const reviewed = cards.filter(c => c.totalReviews > 0)
      const accuracy = reviewed.length > 0
        ? Math.round(reviewed.reduce((sum, c) => sum + c.totalCorrect / c.totalReviews, 0) / reviewed.length * 100)
        : null
      return [key, accuracy]
    })
  )
}

function getCarryOverCounts() {
  try {
    const data = JSON.parse(localStorage.getItem('drillCarryOver') || '{}')
    return {
      new: (data.new || []).length,
      learning: (data.learning || []).length,
      review: (data.review || []).length,
      mature: (data.mature || []).length,
    }
  } catch {
    return { new: 0, learning: 0, review: 0, mature: 0 }
  }
}

export default function Flashcards() {
  const navigate = useNavigate()
  const [cards, setCards] = useState([])
  const [stats, setStats] = useState({ total: 0, dueToday: 0, learning: 0, mature: 0 })
  const [categoryCounts, setCategoryCounts] = useState({ new: 0, learning: 0, review: 0, mature: 0 })
  const [categoryAccuracy, setCategoryAccuracy] = useState({ new: null, learning: null, review: null, mature: null })
  const [carryOver, setCarryOver] = useState({ new: 0, learning: 0, review: 0, mature: 0 })
  const [showModal, setShowModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [openPopover, setOpenPopover] = useState(null)
  const popoverRef = useRef(null)

  const load = useCallback(async () => {
    const [all, s] = await Promise.all([getAllFlashcards(), getCardStats()])
    setCards(all)
    setStats(s)
    setCategoryCounts(getCategoryCounts(all))
    setCategoryAccuracy(getCategoryAccuracy(all))
    setCarryOver(getCarryOverCounts())
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpenPopover(null)
      }
    }
    if (openPopover) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openPopover])

  useEffect(() => { load() }, [load])

  async function handleDelete(card) {
    if (confirmDelete === card.id) {
      if (card.type === 'word') await deleteWordCard(card.word)
      else await deleteFlashcard(card.id)
      setConfirmDelete(null)
      load()
    } else {
      setConfirmDelete(card.id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  const dueCount = stats.dueToday
  const inProgress = stats.new + stats.learning

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header */}
      <div className="bg-slate-800 px-4 pt-12 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-bold">Flashcards</h1>
            <p className="text-slate-400 text-sm mt-0.5">{stats.total} {stats.total === 1 ? 'card' : 'cards'}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-600 text-slate-300 font-medium rounded-xl hover:bg-slate-700 active:bg-slate-600 transition-colors text-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" className="w-3.5 h-3.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Custom
          </button>
        </div>

        {stats.total > 0 && (
          <div className="flex gap-3 mt-3">
            <StatChip label="In progress" value={inProgress} />
            <StatChip label="Mastered" value={stats.mature} highlight={stats.mature > 0} />
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Suggested button */}
        <button
          onClick={() => navigate('/flashcards/session?mode=suggested')}
          disabled={dueCount === 0}
          className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base shadow-sm"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          {dueCount > 0 ? `Suggested  ·  ${dueCount} due` : 'Nothing due today'}
        </button>

        {/* Drill section */}
        {stats.total > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Drill</p>
            <div className="grid grid-cols-2 gap-2">
              {DRILL_CATEGORIES.map(({ key, label, cls, info, interval }) => {
                const count = categoryCounts[key]
                const co = carryOver[key]
                const accuracy = categoryAccuracy[key]
                const isOpen = openPopover === key
                return (
                  <div key={key} className="relative">
                    <div
                      onClick={() => count > 0 && navigate(`/flashcards/session?mode=drill&category=${key}`)}
                      className={`relative w-full flex flex-col items-start px-4 py-3 border rounded-xl transition-colors ${cls} ${count === 0 ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer active:brightness-95'}`}
                    >
                      {co > 0 && (
                        <span className="absolute top-2 right-2 text-xs font-bold bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center leading-none">
                          {co}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm">{label}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={e => { e.stopPropagation(); setOpenPopover(isOpen ? null : key) }}
                          onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), setOpenPopover(isOpen ? null : key))}
                          className="opacity-40 hover:opacity-70 transition-opacity"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        </span>
                      </div>
                      <span className="text-xs opacity-60 mt-0.5">{count} {count === 1 ? 'card' : 'cards'}</span>
                    </div>

                    {isOpen && (
                      <div
                        ref={popoverRef}
                        className="absolute bottom-full left-0 mb-2 z-20 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-3.5 text-left"
                      >
                        <p className="text-slate-700 text-xs leading-relaxed">{info}</p>
                        <p className="text-slate-400 text-xs mt-1.5">{interval}</p>
                        {accuracy !== null && (
                          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-400">Your accuracy</span>
                            <span className={`text-xs font-semibold ${accuracy >= 80 ? 'text-green-600' : accuracy >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                              {accuracy}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Card list */}
        {cards.length === 0 ? (
          <EmptyState />
        ) : (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Your cards</p>
            <div className="space-y-1.5">
              {cards.map(card => {
                const maturity = cardMaturity(card)
                const { label, cls } = MATURITY_LABEL[maturity]
                return (
                  <div
                    key={card.id}
                    className="flex items-center bg-white border border-slate-100 rounded-xl overflow-hidden"
                  >
                    <div className="flex-1 flex items-center justify-between py-3 px-4 min-w-0">
                      <span className="text-slate-800 text-sm font-medium truncate">
                        {card.type === 'word' ? card.word : card.front}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-3 shrink-0 ${cls}`}>
                        {label}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(card)}
                      className={`px-4 py-3 text-xs font-medium transition-colors shrink-0 border-l border-slate-100 ${
                        confirmDelete === card.id
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {confirmDelete === card.id ? 'Confirm' : '✕'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <AddCustomCardModal
          onClose={() => setShowModal(false)}
          onAdded={load}
        />
      )}
    </div>
  )
}

function StatChip({ label, value, highlight }) {
  return (
    <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg ${highlight ? 'bg-green-600' : 'bg-slate-700'}`}>
      <span className={`text-lg font-bold leading-none ${highlight ? 'text-white' : 'text-slate-200'}`}>{value}</span>
      <span className={`text-xs mt-0.5 ${highlight ? 'text-green-100' : 'text-slate-400'}`}>{label}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-5xl mb-4">🃏</div>
      <p className="text-slate-700 font-medium">No cards in your deck</p>
      <p className="text-slate-400 text-sm mt-1">
        Open any word and tap "Add to deck" to start learning.
      </p>
    </div>
  )
}
