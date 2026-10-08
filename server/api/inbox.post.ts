import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const LABELS = ['camera', 'edited', 'drawn', 'assisted', 'ai', 'unknown']

/* Dev Studio only: save an uploaded picture and its notes into content-inbox/. */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const dir = useRuntimeConfig().inboxDir as string
  const parts = await readMultipartFormData(event)
  const image = parts?.find(p => p.name === 'image' && p.filename)
  if (!image) throw createError({ statusCode: 400, statusMessage: 'Add a picture to upload.' })
  const ext = extname(image.filename!).toLowerCase()
  if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
    throw createError({ statusCode: 400, statusMessage: 'Pictures must be JPG, PNG, WebP or GIF.' })
  }
  const field = (name: string) => parts!.find(p => p.name === name)?.data.toString('utf8').trim() ?? ''
  const truth = field('truth')
  if (!LABELS.includes(truth)) throw createError({ statusCode: 400, statusMessage: 'Choose how the picture was made.' })

  const slug = (field('id') || image.filename!.replace(/\.[^.]+$/, ''))
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || `picture-${Date.now()}`
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, `${slug}${ext}`), image.data)
  const notes = {
    id: slug,
    truth,
    level: Number(field('level')) || 2,
    claim: field('claim'),
    source: field('source'),
    madeWith: field('madeWith'),
    title: field('title'),
    // Which fields an AI model suggested (provider:model:fields), so the import treats them as drafts.
    aiAssist: field('aiAssist'),
    notes: field('notes'),
    addedAt: new Date().toISOString(),
  }
  await writeFile(join(dir, `${slug}.json`), `${JSON.stringify(notes, null, 2)}\n`)
  return { ok: true, file: `${slug}${ext}`, notes }
})
