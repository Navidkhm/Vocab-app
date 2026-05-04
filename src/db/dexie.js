import Dexie from 'dexie'

export const db = new Dexie('GermanVocabDB')

db.version(1).stores({
  savedWords:   '++id, &word, savedAt',
  lookupCache:  '&word, cachedAt',
  bundledWords: '&word',
})

db.version(2).stores({
  savedWords:   '++id, &word, savedAt',
  lookupCache:  '&word, cachedAt',
  bundledWords: '&word',
  flashcards:   '++id, type, word, nextReviewDate',
})

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function getCachedEntry(word) {
  const cached = await db.lookupCache.get(word)
  if (!cached) return null
  if (cached.entry?.examples?.length > 0) return cached.entry
  if (Date.now() - cached.cachedAt > CACHE_TTL_MS) return null
  return cached.entry
}

export async function setCachedEntry(word, entry) {
  await db.lookupCache.put({ word, entry, cachedAt: Date.now() })
}

export async function getSavedWord(word) {
  return db.savedWords.where('word').equals(word).first()
}

export async function saveWord(entry) {
  const existing = await getSavedWord(entry.word)
  if (existing) return
  await db.savedWords.add({ word: entry.word, entry, savedAt: Date.now() })
}

export async function unsaveWord(word) {
  await db.savedWords.where('word').equals(word).delete()
}

export async function getAllSavedWords() {
  return db.savedWords.orderBy('savedAt').reverse().toArray()
}

export async function getRecentLookups(limit = 10) {
  return db.lookupCache.orderBy('cachedAt').reverse().limit(limit).toArray()
}

export async function seedBundledWords(words) {
  const count = await db.bundledWords.count()
  if (count > 0) return
  await db.bundledWords.bulkPut(words)
}

export async function getBundledWord(word) {
  return db.bundledWords.get(word)
}

export async function searchBundledWords(query) {
  const lower = query.toLowerCase()
  return db.bundledWords
    .filter(w => w.word.toLowerCase().startsWith(lower))
    .limit(20)
    .toArray()
}

// Strip diacritics: ä→a, ö→o, ü→u, ß→ss — used to match umlaut words against plain-ASCII queries
function normSearch(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
}

function localMatch(word, normQuery) {
  const normWord = normSearch(word)
  // Forward: "grüner" matches query "grune" ✓
  if (normWord.startsWith(normQuery)) return true
  // Reverse: "grün" (grun) matches query "grune" because "grune".startsWith("grun") and diff ≤ 2
  // The ≤2 guard prevents "grün" from matching unrelated long queries like "grundstuck"
  return normQuery.startsWith(normWord) && normQuery.length - normWord.length <= 2
}

export async function searchAllLocalWords(query) {
  const normQuery = normSearch(query)
  const [saved, cached, bundled] = await Promise.all([
    db.savedWords.filter(w => localMatch(w.word, normQuery)).limit(10).toArray(),
    db.lookupCache.filter(w => localMatch(w.word, normQuery)).limit(10).toArray(),
    db.bundledWords.filter(w => localMatch(w.word, normQuery)).limit(10).toArray(),
  ])
  const seen = new Set()
  const results = []
  for (const w of [
    ...saved.map(w => ({ word: w.word, type: w.entry?.type })),
    ...cached.map(w => ({ word: w.word, type: w.entry?.type })),
    ...bundled.map(w => ({ word: w.word, type: w.type })),
  ]) {
    if (!seen.has(w.word)) {
      seen.add(w.word)
      results.push(w)
    }
  }
  return results.slice(0, 10)
}
