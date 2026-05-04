import { useState } from 'react'
import { addCustomCard } from '../db/flashcards'

export default function AddCustomCardModal({ onClose, onAdded }) {
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!front.trim() || !back.trim()) return
    setSaving(true)
    await addCustomCard(front.trim(), back.trim())
    onAdded?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-t-2xl w-full max-w-lg p-6 pb-10 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">New custom card</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Front</label>
            <textarea
              value={front}
              onChange={e => setFront(e.target.value)}
              placeholder="e.g. Übung macht den Meister"
              className="w-full text-sm border border-slate-200 rounded-xl p-3 resize-none bg-slate-50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 focus:bg-white"
              rows={2}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Back</label>
            <textarea
              value={back}
              onChange={e => setBack(e.target.value)}
              placeholder="e.g. Practice makes perfect"
              className="w-full text-sm border border-slate-200 rounded-xl p-3 resize-none bg-slate-50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 focus:bg-white"
              rows={2}
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!front.trim() || !back.trim() || saving}
          className="mt-4 w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add card
        </button>
      </div>
    </div>
  )
}
