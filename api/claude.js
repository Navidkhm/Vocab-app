import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { word, wordType, definitions, level = 'A2' } = req.body

  if (!word) {
    return res.status(400).json({ error: 'Missing word parameter' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const client = new Anthropic({ apiKey })

  const definitionText = Array.isArray(definitions) && definitions.length > 0
    ? definitions.slice(0, 2).map(d => d.english).join('; ')
    : ''

  const levelDescriptions = {
    A1: 'A1 (complete beginner — only the most basic 300 German words)',
    A2: 'A2 (elementary — common everyday words, simple sentences)',
    B1: 'B1 (intermediate — wider vocabulary, some complex structures)',
    B2: 'B2 (upper intermediate — varied vocabulary, complex sentences allowed)',
  }

  const levelDesc = levelDescriptions[level] || levelDescriptions['A2']

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `You generate exactly 3 German example sentences for vocabulary learners.
STRICT RULES:
- Vocabulary level: ${levelDesc}
- Maximum 10 words per sentence
- Each sentence MUST use the target word "${word}" naturally
- Simple grammar: prefer Subjekt-Verb-Objekt order
- Return ONLY valid JSON in this exact format, nothing else:
{"sentences":[{"de":"German sentence","en":"English translation"},{"de":"...","en":"..."},{"de":"...","en":"..."}]}
- No idioms, no subordinate clauses at A1/A2, no complex grammar
- Each sentence should be different (different context, different subject)`,
      messages: [
        {
          role: 'user',
          content: `Word: "${word}" | Type: ${wordType || 'unknown'} | Meaning: ${definitionText || 'see above'}`,
        },
      ],
    })

    const responseText = message.content[0]?.text?.trim()
    if (!responseText) {
      return res.status(500).json({ error: 'Empty response from Claude' })
    }

    // Extract JSON even if Claude adds surrounding text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Invalid response format' })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return res.status(200).json(parsed)
  } catch (err) {
    console.error('Claude API error:', err)
    return res.status(500).json({ error: 'Failed to generate examples' })
  }
}
