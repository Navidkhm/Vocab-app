import { createContext, useContext, useState } from 'react'

const SettingsContext = createContext(null)

const STORAGE_KEY = 'german-vocab-settings'

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...defaultSettings(), ...JSON.parse(saved) }
  } catch {}
  return defaultSettings()
}

function defaultSettings() {
  return { cefrLevel: 'A2' }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)

  function updateSettings(updates) {
    setSettings(prev => {
      const next = { ...prev, ...updates }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
