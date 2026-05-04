import { useState, useRef } from 'react'
import NounForms from './forms/NounForms'
import VerbForms from './forms/VerbForms'
import AdjectiveForms from './forms/AdjectiveForms'

export default function FlashcardCard({ card, wordEntry, onFlipped }) {
  const [side, setSide] = useState('front')
  const [hasFlipped, setHasFlipped] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const nodeRef = useRef(null)
  const flippingRef = useRef(false)

  function handleFlip() {
    if (flippingRef.current) return
    flippingRef.current = true
    const el = nodeRef.current
    if (!el) return
    el.style.transition = 'transform 0.15s ease-in'
    el.style.transform = 'scaleX(0)'
    setTimeout(() => {
      const next = side === 'front' ? 'back' : 'front'
      setSide(next)
      if (next === 'front') setShowMore(false)
      if (next === 'back' && !hasFlipped) {
        setHasFlipped(true)
        onFlipped?.()
      }
      el.style.transition = 'none'
      el.style.transform = 'scaleX(0)'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = 'transform 0.15s ease-out'
          el.style.transform = 'scaleX(1)'
          flippingRef.current = false
        })
      })
    }, 150)
  }

  return (
    <div ref={nodeRef} className="w-full will-change-transform">
      {side === 'front'
        ? <FrontFace card={card} wordEntry={wordEntry} onFlip={handleFlip} />
        : <BackFace card={card} wordEntry={wordEntry} showMore={showMore} onToggleMore={() => setShowMore(v => !v)} onFlip={handleFlip} />
      }
    </div>
  )
}

function FrontFace({ card, wordEntry, onFlip }) {
  const article = wordEntry?.type === 'noun' ? wordEntry?.forms?.article : null
  const label = article ? `${article} ${card.word}` : card.word
  const displayLabel = card.type === 'word' ? label : card.front

  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[200px] flex flex-col items-center justify-center p-8 cursor-pointer select-none active:bg-slate-50"
      onClick={onFlip}
    >
      <p className="text-3xl font-bold text-slate-900 text-center leading-tight mb-3">{displayLabel}</p>
      {card.type === 'word' && wordEntry?.ipa && (
        <p className="text-slate-400 text-sm font-mono mb-4">{wordEntry.ipa}</p>
      )}
      <p className="text-slate-300 text-xs mt-2">tap to flip</p>
    </div>
  )
}

function BackFace({ card, wordEntry, showMore, onToggleMore, onFlip }) {
  if (card.type === 'custom') {
    return (
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 cursor-pointer select-none"
        onClick={onFlip}
      >
        <p className="text-lg text-slate-800 leading-relaxed text-center mb-6">{card.back}</p>
        <p className="text-slate-300 text-xs text-center">tap to flip</p>
      </div>
    )
  }

  const example = card.customExample ?? wordEntry?.examples?.[0]
  const exampleDe = example?.de
  const exampleEn = example?.en

  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 cursor-pointer select-none"
      onClick={onFlip}
    >
      {/* Primary: example sentence */}
      {exampleDe ? (
        <div className="mb-4">
          <p className="text-slate-800 text-base leading-relaxed italic">"{exampleDe}"</p>
          {exampleEn && (
            <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">"{exampleEn}"</p>
          )}
        </div>
      ) : (
        <p className="text-slate-400 text-sm mb-4 italic">No example yet — tap Show more for details</p>
      )}

      {/* Show more — isolated from the flip click */}
      {wordEntry && (
        <div onClick={e => e.stopPropagation()}>
          <button
            onClick={onToggleMore}
            className="flex items-center gap-1.5 text-sm text-blue-600 font-medium py-1 select-auto"
          >
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              className={`w-3.5 h-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {showMore ? 'Show less' : 'Show more'}
          </button>

          {showMore && (
            <div className="mt-3 pt-3 border-t border-slate-100 select-auto">
              {wordEntry.definitions?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Definition{wordEntry.definitions.length > 1 ? 's' : ''}
                  </p>
                  <ol className="space-y-1">
                    {wordEntry.definitions.map((d, i) => (
                      <li key={i} className="text-sm text-slate-700 flex gap-1.5">
                        {wordEntry.definitions.length > 1 && (
                          <span className="text-slate-400 shrink-0">{i + 1}.</span>
                        )}
                        {d.english}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {wordEntry.type === 'noun' && <NounForms forms={wordEntry.forms} />}
              {wordEntry.type === 'verb' && <VerbForms forms={wordEntry.forms} />}
              {wordEntry.type === 'adjective' && <AdjectiveForms forms={wordEntry.forms} />}
            </div>
          )}
        </div>
      )}

      {/* Flip hint — only visible when show more is collapsed */}
      {!showMore && (
        <p className="text-slate-300 text-xs mt-4">tap to flip</p>
      )}
    </div>
  )
}
