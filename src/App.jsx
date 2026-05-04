import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { SettingsProvider } from './context/SettingsContext'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import WordPage from './pages/WordPage'
import MyWords from './pages/MyWords'
import Settings from './pages/Settings'
import Flashcards from './pages/Flashcards'
import FlashcardSession from './pages/FlashcardSession'
import { seedBundledWords } from './db/dexie'
import a1a2Words from './data/a1a2-words.json'

function AppInner() {
  useEffect(() => {
    seedBundledWords(a1a2Words)
  }, [])

  return (
    <div className="max-w-lg mx-auto bg-slate-50 min-h-screen relative">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/word/:word" element={<WordPage />} />
        <Route path="/my-words" element={<MyWords />} />
        <Route path="/flashcards" element={<Flashcards />} />
        <Route path="/flashcards/session" element={<FlashcardSession />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </SettingsProvider>
  )
}
