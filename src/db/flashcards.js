import { db } from './dexie'

export const INTERVALS = [1, 1, 1, 2, 4, 8, 15, 30, 60, 90, 180] // days

function startOfTomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function daysFromNow(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export async function addWordCard(word, customExample = null) {
  const existing = await db.flashcards.where('word').equals(word).first()
  if (existing) return existing.id
  return db.flashcards.add({
    type: 'word',
    word,
    customExample,
    intervalIndex: 0,
    nextReviewDate: 0,
    totalReviews: 0,
    totalCorrect: 0,
    createdAt: Date.now(),
  })
}

export async function addCustomCard(front, back) {
  return db.flashcards.add({
    type: 'custom',
    front,
    back,
    customExample: null,
    intervalIndex: 0,
    nextReviewDate: 0,
    totalReviews: 0,
    totalCorrect: 0,
    createdAt: Date.now(),
  })
}

export async function isWordInDeck(word) {
  const card = await db.flashcards.where('word').equals(word).first()
  return !!card
}

export async function getWordCard(word) {
  return db.flashcards.where('word').equals(word).first()
}

export async function updateWordCardExample(word, customExample) {
  const card = await db.flashcards.where('word').equals(word).first()
  if (card) await db.flashcards.update(card.id, { customExample })
}

export async function getAllFlashcards(filter = 'all') {
  let cards
  if (filter === 'word') cards = await db.flashcards.where('type').equals('word').toArray()
  else if (filter === 'custom') cards = await db.flashcards.where('type').equals('custom').toArray()
  else cards = await db.flashcards.toArray()
  return cards.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getDueCards(filter = 'all') {
  const now = Date.now()
  let cards = await db.flashcards.where('nextReviewDate').belowOrEqual(now).toArray()
  if (filter === 'word') cards = cards.filter(c => c.type === 'word')
  if (filter === 'custom') cards = cards.filter(c => c.type === 'custom')
  return cards
}

export async function updateCardAfterReview(id, correct) {
  const card = await db.flashcards.get(id)
  if (!card) return
  const newIndex = correct
    ? Math.min(card.intervalIndex + 1, INTERVALS.length - 1)
    : Math.max(card.intervalIndex - 2, 0)
  const nextDate = correct ? daysFromNow(INTERVALS[newIndex]) : startOfTomorrow()
  await db.flashcards.update(id, {
    intervalIndex: newIndex,
    nextReviewDate: nextDate,
    totalReviews: card.totalReviews + 1,
    totalCorrect: card.totalCorrect + (correct ? 1 : 0),
    lastReviewedAt: Date.now(),
  })
}

export async function getReviewedToday() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const startMs = start.getTime()
  const now = Date.now()
  const all = await db.flashcards.toArray()

  // Once any card has lastReviewedAt tracked, use it as the source of truth
  const hasTracking = all.some(c => c.lastReviewedAt != null)
  if (hasTracking) {
    return all.filter(c => c.lastReviewedAt >= startMs)
  }

  // Migration fallback: session ran before lastReviewedAt was tracked.
  // Cards reviewed but not yet due again are a reliable proxy.
  return all.filter(c => c.totalReviews > 0 && c.nextReviewDate > now)
}

export async function deleteFlashcard(id) {
  await db.flashcards.delete(id)
}

export async function deleteWordCard(word) {
  await db.flashcards.where('word').equals(word).delete()
}

export async function getCardStats() {
  const all = await db.flashcards.toArray()
  const now = Date.now()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startMs = startOfToday.getTime()

  const hasTracking = all.some(c => c.lastReviewedAt != null)
  const reviewedToday = hasTracking
    ? all.filter(c => c.lastReviewedAt >= startMs).length
    : all.filter(c => c.totalReviews > 0 && c.nextReviewDate > now).length

  return {
    total: all.length,
    new: all.filter(c => c.totalReviews === 0).length,
    learning: all.filter(c => c.totalReviews > 0 && c.intervalIndex < 6).length,
    mature: all.filter(c => c.intervalIndex >= 6).length,
    dueToday: all.filter(c => c.nextReviewDate <= now).length,
    reviewedToday,
  }
}
