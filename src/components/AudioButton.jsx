import { useState } from 'react'

export default function AudioButton({ word }) {
  const [speaking, setSpeaking] = useState(false)

  if (!('speechSynthesis' in window)) return null

  function speak() {
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(word)
    utt.lang = 'de-DE'
    utt.rate = 0.85
    utt.pitch = 1
    utt.onstart = () => setSpeaking(true)
    utt.onend = () => setSpeaking(false)
    utt.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utt)
  }

  return (
    <button
      onClick={speak}
      disabled={speaking}
      aria-label={`Pronounce ${word}`}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors disabled:opacity-50"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-5 h-5 text-slate-600 ${speaking ? 'text-blue-500' : ''}`}
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {speaking ? (
          <>
            <line x1="15.54" y1="8.46" x2="19.07" y2="4.93" />
            <line x1="19.07" y1="19.07" x2="15.54" y2="15.54" />
          </>
        ) : (
          <>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        )}
      </svg>
    </button>
  )
}
