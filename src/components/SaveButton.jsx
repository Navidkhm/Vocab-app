import { useSaveStatus } from '../hooks/useSavedWords'

export default function SaveButton({ entry }) {
  const { saved, toggle } = useSaveStatus(entry?.word)

  if (!entry) return null

  return (
    <button
      onClick={() => toggle(entry)}
      aria-label={saved ? 'Remove from saved words' : 'Save word'}
      className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
        saved
          ? 'bg-amber-100 hover:bg-amber-200 active:bg-amber-300'
          : 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-5 h-5 ${saved ? 'text-amber-500' : 'text-slate-600'}`}
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  )
}
