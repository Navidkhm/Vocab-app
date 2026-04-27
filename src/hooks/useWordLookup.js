import { useState, useCallback } from 'react'

// Strips common German inflection endings so "grüne" → "grün", "grünen" → "grün", etc.
// Used as a fallback when Wiktionary has no standalone entry for the inflected form.
// Endings are tried longest-first; minimum stem is 3 chars to avoid over-stripping.
const GERMAN_ENDINGS = ['sten','stem','ster','stes','en','er','em','es','te','st','e','t','s']
const EXAMPLE_RETRY_DELAY_MS = 24 * 60 * 60 * 1000

function stripGermanEnding(word) {
  const lower = word.toLowerCase()
  for (const ending of GERMAN_ENDINGS) {
    if (lower.endsWith(ending) && lower.length - ending.length >= 3) {
      return word.slice(0, word.length - ending.length)
    }
  }
  return null
}
import { lookupWord } from '../api/wiktionary'
import { fetchExamples } from '../api/aiRequest'
import {
  getCachedEntry,
  setCachedEntry,
  getSavedWord,
  getBundledWord,
} from '../db/dexie'

export function useWordLookup() {
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [loadingExamples, setLoadingExamples] = useState(false)

  const lookup = useCallback(async (word, level = 'A2') => {
    if (!word.trim()) return
    setLoading(true)
    setError(null)
    setEntry(null)

    const normalizedWord = word.trim()

    try {
      // 1. Check saved words first (always available offline)
      const saved = await getSavedWord(normalizedWord)
      if (saved?.entry) {
        setEntry({ ...saved.entry, isSaved: true })
        setLoading(false)
        // Refresh examples in background if online
        refreshExamplesInBackground(saved.entry, level)
        return
      }

      // 2. Check lookup cache
      const cached = await getCachedEntry(normalizedWord)
      if (cached) {
        setEntry(cached)
        setLoading(false)
        if (shouldFetchExamples(cached)) {
          refreshExamplesInBackground(cached, level)
        }
        return
      }

      // 3. Try bundled A1/A2 words for offline hint
      const bundled = await getBundledWord(normalizedWord)

      // 4. Online: fetch from Wiktionary
      if (!navigator.onLine) {
        if (bundled) {
          setEntry({
            word: bundled.word,
            type: bundled.type || 'noun',
            ipa: null,
            definitions: [{ english: bundled.translation }],
            forms: bundled.article
              ? { article: bundled.article, plural: bundled.plural }
              : null,
            examples: [],
            source: 'bundled',
            offlineOnly: true,
          })
        } else {
          setError('offline')
        }
        setLoading(false)
        return
      }

      let wiktionaryEntry = await lookupWord(normalizedWord)
      if (!wiktionaryEntry) {
        // Wiktionary often lacks standalone entries for inflected forms (e.g. "grüne" → look up "grün")
        const baseForm = stripGermanEnding(normalizedWord)
        if (baseForm) wiktionaryEntry = await lookupWord(baseForm)
      }
      if (!wiktionaryEntry) {
        setError('not_found')
        setLoading(false)
        return
      }

      // Show entry immediately without examples
      setEntry(wiktionaryEntry)
      setLoading(false)

      // 5. Fetch AI examples asynchronously
      setLoadingExamples(true)
      try {
        const examples = await fetchExamples(
          normalizedWord,
          wiktionaryEntry.type,
          wiktionaryEntry.definitions,
          level
        )
        const fullEntry = {
          ...wiktionaryEntry,
          examples,
          source: 'wiktionary',
          examplesAttemptedAt: Date.now(),
        }
        setEntry(fullEntry)
        await setCachedEntry(normalizedWord, fullEntry)
      } finally {
        setLoadingExamples(false)
      }
    } catch (err) {
      setError('error')
      setLoading(false)
    }
  }, [])

  async function refreshExamplesInBackground(existingEntry, level) {
    if (!navigator.onLine) return
    if (!shouldFetchExamples(existingEntry)) return
    setLoadingExamples(true)
    try {
      const examples = await fetchExamples(
        existingEntry.word,
        existingEntry.type,
        existingEntry.definitions,
        level
      )
      if (examples.length > 0) {
        const updated = { ...existingEntry, examples, examplesAttemptedAt: Date.now() }
        setEntry(prev => prev ? { ...prev, examples } : prev)
        await setCachedEntry(existingEntry.word, updated)
      } else {
        const updated = { ...existingEntry, examplesAttemptedAt: Date.now() }
        await setCachedEntry(existingEntry.word, updated)
      }
    } finally {
      setLoadingExamples(false)
    }
  }

  return { entry, loading, error, loadingExamples, lookup }
}

function shouldFetchExamples(entry) {
  if (entry.examples?.length > 0) return false
  if (!entry.examplesAttemptedAt) return true
  return Date.now() - entry.examplesAttemptedAt > EXAMPLE_RETRY_DELAY_MS
}
