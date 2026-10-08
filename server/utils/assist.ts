/*
 * Dev Studio AI assist (local only): looks at a picture with the model you choose and
 * suggests the Studio's form fields. Bring your own key in .env (see .env.example).
 *
 * It never decides how a picture was made: it only offers a labelled guess, and the
 * facilitator chooses. Nothing here runs in the published game.
 */
import Anthropic from '@anthropic-ai/sdk'

export type Provider = 'openai' | 'gemini' | 'anthropic' | 'ollama'

export interface Suggestion {
  title: string
  caption: string
  notes: string[]
  madeWith: string
  visibleText: string
  truthGuess: { label: 'camera' | 'edited' | 'drawn' | 'assisted' | 'ai' | 'unsure', confidence: 'low' | 'medium' | 'high', why: string }
}

const DEFAULT_MODEL: Partial<Record<Provider, string>> = { anthropic: 'claude-opus-5-5' }

/** Which provider and model are set up, without ever exposing the key. */
export function assistConfig() {
  const provider = (process.env.HH_AI_PROVIDER ?? '').trim().toLowerCase() as Provider | ''
  const model = (process.env.HH_AI_MODEL ?? '').trim() || (provider ? DEFAULT_MODEL[provider] ?? '' : '')
  const keyVar = provider === 'openai' ? 'OPENAI_API_KEY' : provider === 'gemini' ? 'GEMINI_API_KEY' : provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : ''
  const key = keyVar ? (process.env[keyVar] ?? '').trim() : ''
  let problem = ''
  if (!provider) problem = 'No AI provider is set. Copy .env.example to .env and set HH_AI_PROVIDER.'
  else if (!['openai', 'gemini', 'anthropic', 'ollama'].includes(provider)) problem = `HH_AI_PROVIDER "${provider}" isn't one of openai, gemini, anthropic or ollama.`
  else if (keyVar && !key) problem = `Add your ${keyVar} to .env.`
  else if (!model) problem = 'Set HH_AI_MODEL in .env to a vision-capable model from your provider.'
  return { provider, model, key, problem, ollamaUrl: (process.env.HH_OLLAMA_URL ?? 'http://localhost:11434').replace(/\/$/, '') }
}

const LABELS = ['camera', 'edited', 'drawn', 'assisted', 'ai', 'unsure'] as const

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'caption', 'notes', 'madeWith', 'visibleText', 'truthGuess'],
  properties: {
    title: { type: 'string' },
    caption: { type: 'string' },
    notes: { type: 'array', items: { type: 'string' } },
    madeWith: { type: 'string' },
    visibleText: { type: 'string' },
    truthGuess: {
      type: 'object',
      additionalProperties: false,
      required: ['label', 'confidence', 'why'],
      properties: {
        label: { type: 'string', enum: [...LABELS] },
        confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        why: { type: 'string' },
      },
    },
  },
}

const SYSTEM = `You help a facilitator prepare pictures for Hearsay Harbour, a media-literacy game where players work out how a picture was made before sharing it. Look closely at the picture and reply with JSON only, matching this shape:
{"title": "...", "caption": "...", "notes": ["..."], "madeWith": "...", "visibleText": "...", "truthGuess": {"label": "...", "confidence": "...", "why": "..."}}

- title: a short, neutral name for the picture (2 to 5 words).
- caption: a realistic social-media caption someone might share it with. If it could plausibly circulate as misinformation, write that kind of caption, without adding new false claims about real, named people.
- notes: 2 to 4 specific things worth pointing out to learners, each saying where it is (for example "top left: the railings bend into the water"). Include at least one detail that looks convincing but proves nothing on its own.
- madeWith: a tool, maker or credit ONLY if it is visibly written in the picture itself (a watermark, logo, signature or credit line). Otherwise an empty string.
- visibleText: any readable text in the picture, or an empty string.
- truthGuess: your hunch about how it was made. label is one of camera, edited, drawn (hand-drawn or illustrated by a person), assisted (AI-assisted), ai (AI-generated) or unsure; confidence is low, medium or high; why is one sentence.

Never claim to know where the picture came from or who made it unless that is written in the picture. Pixels alone can't prove how a picture was made, so keep the guess modest.`

const USER = 'Suggest the Studio fields for this picture.'

function parse(text: string): Suggestion {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('The model didn\'t return any suggestions. Try again, or try another model.')
  const raw = JSON.parse(text.slice(start, end + 1))
  const label = LABELS.includes(raw?.truthGuess?.label) ? raw.truthGuess.label : 'unsure'
  const confidence = ['low', 'medium', 'high'].includes(raw?.truthGuess?.confidence) ? raw.truthGuess.confidence : 'low'
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  return {
    title: str(raw.title),
    caption: str(raw.caption),
    notes: Array.isArray(raw.notes) ? raw.notes.map(str).filter(Boolean).slice(0, 4) : [],
    madeWith: str(raw.madeWith),
    visibleText: str(raw.visibleText),
    truthGuess: { label, confidence, why: str(raw?.truthGuess?.why) },
  }
}

async function postJson(url: string, body: unknown, headers: Record<string, string>) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({})) as Record<string, any>
  if (!res.ok) throw new Error(data?.error?.message ?? data?.error ?? `The provider replied ${res.status}.`)
  return data
}

/** Ask the configured model about one picture (a data: URL, already resized by the Studio). */
export async function suggestFields(dataUrl: string): Promise<{ suggestion: Suggestion, provider: string, model: string }> {
  const cfg = assistConfig()
  if (cfg.problem) throw new Error(cfg.problem)
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(dataUrl)
  if (!m) throw new Error('That picture couldn\'t be read. Try a JPG, PNG or WebP.')
  const [, mediaType, data] = m as unknown as [string, 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', string]
  let text = ''

  if (cfg.provider === 'anthropic') {
    const client = new Anthropic({ apiKey: cfg.key })
    const res = await client.beta.messages.create({
      model: cfg.model,
      max_tokens: 16000,
      // If a safety check declines, the API retries on a suitable fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
          { type: 'text', text: USER },
        ],
      }],
    })
    if (res.stop_reason === 'refusal') throw new Error('The model declined to describe this picture.')
    for (const block of res.content) if (block.type === 'text') text += block.text
  }
  else if (cfg.provider === 'gemini') {
    const res = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`,
      {
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mediaType, data } }, { text: USER }] }],
        generationConfig: { responseMimeType: 'application/json' },
      },
      { 'x-goog-api-key': cfg.key },
    )
    text = (res.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('')
  }
  else {
    // OpenAI, or a local model through Ollama's OpenAI-compatible endpoint.
    const url = cfg.provider === 'ollama' ? `${cfg.ollamaUrl}/v1/chat/completions` : 'https://api.openai.com/v1/chat/completions'
    const res = await postJson(url, {
      model: cfg.model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: [{ type: 'text', text: USER }, { type: 'image_url', image_url: { url: dataUrl } }] },
      ],
    }, cfg.provider === 'openai' ? { authorization: `Bearer ${cfg.key}` } : {})
    text = res.choices?.[0]?.message?.content ?? ''
  }

  return { suggestion: parse(text), provider: cfg.provider, model: cfg.model }
}
