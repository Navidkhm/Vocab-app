export async function fetchExamples(word, wordType, definitions, level = 'A2') {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, wordType, definitions, level }),
    })
    if (!res.ok) {
      console.warn('Example request failed:', res.status, await res.text())
      return []
    }
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      console.warn('Example request returned non-JSON response:', contentType)
      return []
    }
    const data = await res.json()
    return Array.isArray(data.sentences) ? data.sentences : []
  } catch (err) {
    console.warn('Example request failed:', err)
    return []
  }
}
