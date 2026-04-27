/* global process */

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { word, wordType, definitions, level = 'A2' } = body || {}

  if (!word) {
    return res.status(400).json({ error: 'Missing word parameter' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' })
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'
  const definitionText = Array.isArray(definitions) && definitions.length > 0
    ? definitions.slice(0, 2).map(d => d.english).join('; ')
    : ''

  const levelDescriptions = {
    A1: 'A1 (complete beginner - only the most basic 300 German words)',
    A2: 'A2 (elementary - common everyday words, simple sentences)',
    B1: 'B1 (intermediate - wider vocabulary, some complex structures)',
    B2: 'B2 (upper intermediate - varied vocabulary, complex sentences allowed)',
  }

  const levelDesc = levelDescriptions[level] || levelDescriptions.A2
  const prompt = `Generate exactly 3 German example sentences for vocabulary learners.

STRICT RULES:
- Vocabulary level: ${levelDesc}
- Maximum 10 words per sentence
- Each sentence must use the target word "${word}" naturally
- Simple grammar: prefer Subjekt-Verb-Objekt order
- No idioms, no subordinate clauses at A1/A2, no complex grammar
- Each sentence should be different
- Return only valid JSON in this exact shape:
{"sentences":[{"de":"German sentence","en":"English translation"},{"de":"...","en":"..."},{"de":"...","en":"..."}]}

Word: "${word}"
Type: ${wordType || 'unknown'}
Meaning: ${definitionText || 'see above'}`

  try {
    const response = await fetch(
      `${GEMINI_API}/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 400,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    const responseText = await response.text()
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to generate examples',
        detail: 'gemini_api_error',
        message: responseText,
      })
    }

    const data = JSON.parse(responseText)
    const generatedText = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim()

    if (!generatedText) {
      return res.status(500).json({
        error: 'Failed to generate examples',
        detail: 'empty_gemini_response',
      })
    }

    const parsed = JSON.parse(generatedText)
    const sentences = Array.isArray(parsed.sentences) ? parsed.sentences : []
    return res.status(200).json({ sentences: sentences.slice(0, 3) })
  } catch (err) {
    console.error('Gemini API error:', err)
    return res.status(500).json({
      error: 'Failed to generate examples',
      detail: 'gemini_request_failed',
      message: err.message || 'Unknown Gemini error',
    })
  }
}
