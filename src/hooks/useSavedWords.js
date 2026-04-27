import { useState, useEffect, useCallback } from 'react'
import { saveWord, unsaveWord, getAllSavedWords, getSavedWord } from '../db/dexie'

export function useSavedWords() {
  const [savedWords, setSavedWords] = useState([])

  useEffect(() => {
    getAllSavedWords().then(setSavedWords)
  }, [])

  const save = useCallback(async (entry) => {
    await saveWord(entry)
    const updated = await getAllSavedWords()
    setSavedWords(updated)
  }, [])

  const unsave = useCallback(async (word) => {
    await unsaveWord(word)
    setSavedWords(prev => prev.filter(w => w.word !== word))
  }, [])

  const isSaved = useCallback(async (word) => {
    const existing = await getSavedWord(word)
    return !!existing
  }, [])

  return { savedWords, save, unsave, isSaved }
}

export function useSaveStatus(word) {
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!word) return
    getSavedWord(word).then(existing => setSaved(!!existing))
  }, [word])

  const toggle = useCallback(async (entry) => {
    if (saved) {
      await unsaveWord(word)
      setSaved(false)
    } else {
      await saveWord(entry)
      setSaved(true)
    }
  }, [saved, word])

  return { saved, toggle }
}
