export async function fetchExamples(word, wordType, definitions, level = 'A2') {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, wordType, definitions, level }),
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.sentences) ? data.sentences : []
  } catch {
    return []
  }
}
