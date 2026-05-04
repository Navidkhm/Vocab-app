import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllFlashcards, getCardStats, deleteFlashcard, deleteWordCard } from '../db/flashcards'
import AddCustomCardModal from '../components/AddCustomCardModal'

const MATURITY_LABEL = {
  new: { label: 'New', cls: 'bg-slate-100 text-slate-500' },
  learning: { label: 'Learning', cls: 'bg-amber-50 text-amber-600' },
  mature: { label: 'Mature', cls: 'bg-green-50 text-green-600' },
}

function cardMaturity(card) {
  if (card.totalReviews === 0) return 'new'
  if (card.intervalIndex < 6) return 'learning'
  return 'mature'
}

export default function Flashcards() {
  const navigate = useNavigate()
  const [cards, setCards] = useState([])
  const [stats, setStats] = useState({ total: 0, new: 0, learning: 0, mature: 0, dueToday: 0, reviewedToday: 0 })
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async () => {
    const [all, s] = await Promise.all([getAllFlashcards(filter), getCardStats()])
    setCards(all)
    setStats(s)
  }, [filter])

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
  const reviewedCount = stats.reviewedToday

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header */}
      <div className="bg-slate-800 px-4 pt-12 pb-5">
        <h1 className="text-white text-2xl font-bold">Flashcards</h1>
        <p className="text-slate-400 text-sm mt-0.5">{stats.total} {stats.total === 1 ? 'card' : 'cards'}</p>

        {/* Stats row */}
        {stats.total > 0 && (
          <div className="flex gap-3 mt-3">
            <StatChip label="Due today" value={dueCount} highlight={dueCount > 0} />
            <StatChip label="Learning" value={stats.new + stats.learning} />
            <StatChip label="Mature" value={stats.mature} />
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* Filter tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {['all', 'word', 'custom'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {f === 'word' ? 'Bookmarks' : f === 'custom' ? 'Custom' : 'All'}
            </button>
          ))}
        </div>

        {/* Study + Add */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/flashcards/session?filter=${filter}`)}
            disabled={dueCount === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {dueCount > 0 ? `Study now (${dueCount})` : 'No cards due'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-3 border border-slate-200 bg-white text-slate-700 font-medium rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Custom
          </button>
        </div>

        {/* Drill row */}
        {stats.total > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 shrink-0">Drill</span>
            <div className="flex gap-2 flex-1">
              <button
                onClick={() => navigate(`/flashcards/session?mode=drill&cards=all`)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-slate-400">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-4" />
                </svg>
                All ({stats.total})
              </button>
              <button
                onClick={() => navigate(`/flashcards/session?mode=drill&cards=today`)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-slate-400">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-4" />
                </svg>
                Today's ({reviewedCount})
              </button>
            </div>
          </div>
        )}

        {/* Card list */}
        {cards.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
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
    <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg ${highlight ? 'bg-blue-600' : 'bg-slate-700'}`}>
      <span className={`text-lg font-bold leading-none ${highlight ? 'text-white' : 'text-slate-200'}`}>{value}</span>
      <span className={`text-xs mt-0.5 ${highlight ? 'text-blue-100' : 'text-slate-400'}`}>{label}</span>
    </div>
  )
}

function EmptyState({ filter }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-5xl mb-4">🃏</div>
      <p className="text-slate-700 font-medium">
        {filter === 'custom' ? 'No custom cards yet' : 'No cards in your deck'}
      </p>
      <p className="text-slate-400 text-sm mt-1">
        {filter === 'custom'
          ? 'Tap "Custom" above to add a sentence or proverb.'
          : 'Open any word and tap "Add to deck" to start learning.'}
      </p>
    </div>
  )
}
