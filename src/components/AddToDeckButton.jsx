import { useState, useEffect } from 'react'
import { isWordInDeck, addWordCard, updateWordCardExample, deleteWordCard, getWordCard } from '../db/flashcards'

export default function AddToDeckButton({ entry }) {
  const [inDeck, setInDeck] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [customDe, setCustomDe] = useState('')
  const [customEn, setCustomEn] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!entry?.word) return
    isWordInDeck(entry.word).then(setInDeck)
  }, [entry?.word])

  async function openPanel() {
    if (inDeck) {
      const card = await getWordCard(entry.word)
      setCustomDe(card?.customExample?.de || '')
      setCustomEn(card?.customExample?.en || '')
    } else {
      setCustomDe('')
      setCustomEn('')
    }
    setShowPanel(true)
  }

  async function handleSave() {
    setSaving(true)
    const de = customDe.trim()
    const en = customEn.trim()
    const customExample = de || en ? { de, en } : null
    if (inDeck) {
      await updateWordCardExample(entry.word, customExample)
    } else {
      await addWordCard(entry.word, customExample)
      setInDeck(true)
    }
    setShowPanel(false)
    setSaving(false)
  }

  async function handleRemove() {
    await deleteWordCard(entry.word)
    setInDeck(false)
    setShowPanel(false)
    setCustomDe('')
    setCustomEn('')
  }

  return (
    <div>
      <button
        onClick={openPanel}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          inDeck
            ? 'bg-violet-100 text-violet-700 border border-violet-200'
            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 active:bg-slate-300'
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <rect x="2" y="6" width="20" height="14" rx="2" />
          <path d="M16 2H8a2 2 0 0 0-2 2v2h12V4a2 2 0 0 0-2-2z" />
          {inDeck && <polyline points="8 13 11 16 16 11" strokeWidth="2" />}
          {!inDeck && <line x1="12" y1="11" x2="12" y2="17" />}
          {!inDeck && <line x1="9" y1="14" x2="15" y2="14" />}
        </svg>
        {inDeck ? 'In deck' : 'Add to deck'}
      </button>

      {showPanel && (
        <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-600 mb-0.5">
            Custom example sentence
          </p>
          <p className="text-xs text-slate-400 mb-3">
            Leave empty to use the AI-generated example
          </p>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">German</label>
              <textarea
                value={customDe}
                onChange={e => setCustomDe(e.target.value)}
                placeholder="e.g. Der Abend war sehr schön."
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 resize-none bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                rows={2}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">English translation</label>
              <textarea
                value={customEn}
                onChange={e => setCustomEn(e.target.value)}
                placeholder="e.g. The evening was very beautiful."
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 resize-none bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
            >
              {inDeck ? 'Update' : 'Add to deck'}
            </button>
            {inDeck && (
              <button
                onClick={handleRemove}
                className="py-1.5 px-3 text-red-500 text-sm font-medium rounded-lg hover:bg-red-50 active:bg-red-100"
              >
                Remove
              </button>
            )}
            <button
              onClick={() => setShowPanel(false)}
              className="py-1.5 px-3 text-slate-500 text-sm font-medium rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
