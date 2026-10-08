/*
 * Dev Studio (local only): manage the picture inbox and the picture packs on disk.
 * Nothing is ever erased: deleted, removed and replaced pictures are moved into folders
 * under content-inbox/ so they can be put back.
 */
import { execFile } from 'node:child_process'
import { copyFile, mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

export function studioPaths() {
  const inbox = useRuntimeConfig().inboxDir as string
  const root = resolve(inbox, '..')
  return { inbox, root, packs: join(root, 'app/packs'), pictures: join(root, 'public/pictures') }
}

/** Only plain file names from the inbox: never a path. */
export function safeName(name: unknown) {
  const n = typeof name === 'string' ? basename(name) : ''
  if (!n || n.startsWith('.') || n !== name) throw createError({ statusCode: 400, statusMessage: 'That file name isn\'t allowed.' })
  return n
}

const IMAGE = /\.(jpe?g|png|webp|gif)$/i
const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
const exists = (p: string) => stat(p).then(() => true, () => false)

export async function readSidecar(inbox: string, file: string) {
  const base = file.replace(/\.[^.]+$/, '')
  return readFile(join(inbox, `${base}.json`), 'utf8').then(JSON.parse).catch(() => null) as Promise<Record<string, any> | null>
}

/** Move an inbox picture (and its notes) into a subfolder of the inbox. */
export async function shelve(file: string, folder: 'deleted' | 'imported') {
  const { inbox } = studioPaths()
  const dest = join(inbox, folder)
  await mkdir(dest, { recursive: true })
  const base = file.replace(/\.[^.]+$/, '')
  const target = await exists(join(dest, file)) ? `${base}-${stamp()}` : base
  await rename(join(inbox, file), join(dest, `${target}${extname(file)}`))
  if (await exists(join(inbox, `${base}.json`))) await rename(join(inbox, `${base}.json`), join(dest, `${target}.json`))
}

/* ------------------------------------------------------------------ */
/* Picture packs on disk                                              */
/* ------------------------------------------------------------------ */

export interface PackFile { file: string, data: { id: string, level: number, title: string, blurb: string, pictures: Record<string, any>[] } }

export async function readPacks(): Promise<PackFile[]> {
  const { packs } = studioPaths()
  const files = (await readdir(packs)).filter(f => f.endsWith('.json')).sort()
  return Promise.all(files.map(async f => ({ file: f, data: JSON.parse(await readFile(join(packs, f), 'utf8')) })))
}

export async function writePack(p: PackFile) {
  const { packs } = studioPaths()
  await writeFile(join(packs, p.file), `${JSON.stringify(p.data, null, 2)}\n`)
}

/** Keep a copy of a picture (entry and image) before it leaves the game. */
async function archive(folder: 'removed' | 'replaced', pack: PackFile, pic: Record<string, any>) {
  const { inbox, pictures } = studioPaths()
  const dir = join(inbox, folder, `${stamp()}-${pic.id}`)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'entry.json'), `${JSON.stringify({ pack: pack.data.id, level: pack.data.level, picture: pic }, null, 2)}\n`)
  const img = join(pictures, pic.src)
  if (await exists(img)) await copyFile(img, join(dir, pic.src))
  return dir
}

/** Is any other entry still using this image file? */
async function imageInUse(src: string, except?: string) {
  return (await readPacks()).some(p => p.data.pictures.some(x => x.src === src && x.id !== except))
}

export async function removePicture(packId: string, pictureId: string) {
  const packs = await readPacks()
  const pack = packs.find(p => p.data.id === packId)
  const pic = pack?.data.pictures.find(x => x.id === pictureId)
  if (!pack || !pic) throw createError({ statusCode: 404, statusMessage: 'That picture isn\'t in the game.' })
  const kept = await archive('removed', pack, pic)
  pack.data.pictures = pack.data.pictures.filter(x => x.id !== pictureId)
  await writePack(pack)
  if (!(await imageInUse(pic.src, pic.id))) await rename(join(studioPaths().pictures, pic.src), join(kept, `${pic.src}`)).catch(() => {})
  return { keptIn: kept.slice(studioPaths().root.length + 1) }
}

export async function setVisible(packId: string, pictureId: string, visible: boolean) {
  const pack = (await readPacks()).find(p => p.data.id === packId)
  const pic = pack?.data.pictures.find(x => x.id === pictureId)
  if (!pack || !pic) throw createError({ statusCode: 404, statusMessage: 'That picture isn\'t in the game.' })
  pic.visible = visible
  await writePack(pack)
}

/** Save an edited picture (the Studio's Edit screen). The picture's id and file stay the same. */
export async function updatePicture(packId: string, edited: Record<string, any>) {
  const pack = (await readPacks()).find(p => p.data.id === packId)
  const i = pack?.data.pictures.findIndex(x => x.id === edited?.id) ?? -1
  if (!pack || i < 0) throw createError({ statusCode: 404, statusMessage: 'That picture isn\'t in the game.' })
  const old = pack.data.pictures[i]!
  const next: Record<string, any> = { ...old, ...edited, id: old.id, src: old.src }
  for (const k of ['madeWith', 'source', 'title']) if (typeof next[k] === 'string' && !next[k].trim()) delete next[k]
  for (const c of CHECKS) if (next.checks?.[c] && !LEANS.includes(next.checks[c].points)) delete next.checks[c].points
  next.close = (next.close ?? []).filter((l: string) => l !== next.truth)
  const problems = problemsWith(next)
  if (problems.length) throw createError({ statusCode: 422, statusMessage: `Not saved: ${problems.join('; ')}.` })
  pack.data.pictures[i] = next
  await writePack(pack)
  return next
}

/* ------------------------------------------------------------------ */
/* Checking an entry (the same rules as npm run validate)             */
/* ------------------------------------------------------------------ */

const LABELS = ['camera', 'edited', 'drawn', 'assisted', 'ai', 'unsure']
const LEANS = ['camera', 'drawn', 'ai', 'unsure']
const VILLAGERS = ['wren', 'pip', 'moss', 'jim']
const CHECKS = ['tide', 'seal', 'crate']
const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0

export function problemsWith(p: Record<string, any>) {
  const out: string[] = []
  const need = (ok: unknown, msg: string) => { if (!ok) out.push(msg) }
  for (const k of ['arrival', 'claim', 'verdict', 'lesson']) need(text(p[k]), `${k} is empty`)
  need(LABELS.includes(p.truth), 'truth is not a known label')
  need(Array.isArray(p.close) && p.close.every((l: string) => LABELS.includes(l) && l !== p.truth), 'close must list other labels')
  for (const v of VILLAGERS) need(LEANS.includes(p.takes?.[v]?.lean) && text(p.takes?.[v]?.text), `${v}'s take needs a lean and text`)
  for (const c of CHECKS) {
    const f = p.checks?.[c]
    need(f && text(f.headline) && text(f.body) && ['strong', 'some', 'none'].includes(f.strength), `${c} check needs headline, body and strength`)
  }
  need(Array.isArray(p.cues) && p.cues.length >= 2 && p.cues.length <= 5, 'needs 2 to 5 cues')
  for (const q of p.cues ?? []) need(q.x >= 0 && q.x <= 1 && q.y >= 0 && q.y <= 1 && text(q.note), 'each cue needs x and y between 0 and 1 and a note')
  return out
}

/* ------------------------------------------------------------------ */
/* Importing: one pass drafts, a second, independent pass reviews     */
/* ------------------------------------------------------------------ */

const PICTURE_SCHEMA = (() => {
  const str = { type: 'string' }
  const take = { type: 'object', additionalProperties: false, required: ['lean', 'text'], properties: { lean: { type: 'string', enum: LEANS }, text: str } }
  const check = { type: 'object', additionalProperties: false, required: ['headline', 'body', 'strength', 'points'], properties: { headline: str, body: str, strength: { type: 'string', enum: ['strong', 'some', 'none'] }, points: { type: 'string', enum: [...LEANS, 'none'] } } }
  return {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'arrival', 'claim', 'close', 'takes', 'checks', 'cues', 'verdict', 'lesson'],
    properties: {
      title: str,
      arrival: str,
      claim: str,
      close: { type: 'array', items: { type: 'string', enum: LABELS } },
      takes: { type: 'object', additionalProperties: false, required: VILLAGERS, properties: Object.fromEntries(VILLAGERS.map(v => [v, take])) },
      checks: { type: 'object', additionalProperties: false, required: CHECKS, properties: Object.fromEntries(CHECKS.map(c => [c, check])) },
      cues: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['x', 'y', 'note'], properties: { x: { type: 'number' }, y: { type: 'number' }, note: str } } },
      verdict: str,
      lesson: str,
    },
  }
})()

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['approved', 'fixes', 'corrected'],
  properties: { approved: { type: 'boolean' }, fixes: { type: 'array', items: { type: 'string' } }, corrected: PICTURE_SCHEMA },
}

const RULES = `Hearsay Harbour is a cozy island game for ages 10 and up about working out how a picture was made before sharing it (Notice, Discuss, Check, Reflect). Write warmly and plainly.

Ground rules:
- How the picture was made ("truth") is given by the facilitator. Never contradict it and never decide it from the pixels.
- Never invent where the picture came from. The checks may only state facts from the facilitator's "source", "madeWith" and second-opinion notes, or from the file itself. Without a known source, write an honest generic finding (e.g. "Nothing comes back") with strength "none" or "some".
- A reported watermark match may appear in the wax seal finding as what the facilitator's check found, with its stated coverage. A "no match" never proves a picture is real.
- Never repeat or endorse a harmful false claim (for example anti-vaccine content). Don't identify private people.

The villagers (first person, one or two short sentences each, each with a lean that is a hunch, not a certainty):
- wren: a Sikh elder and retired photographer; reads light, focus and lenses.
- pip: a sharp-eyed seven-year-old girl with a magnifying glass; spots text and small details.
- moss: a young fisher boy; asks who shared it and why.
- jim: Grumpy Professor Jim, a conspiracy theorist who says EVERY picture is AI (lean always "ai"); funny rather than mean.
Apart from Jim, at least one villager should lean differently from the others; on harder levels at least one should be wrong.

Fields: title (2 to 5 words); arrival (a cozy one-liner about how it reaches the harbour); claim (the caption it was shared with); close (labels near enough to the truth for partial credit, never the truth itself; labels are camera, edited, drawn, assisted, ai, unsure); checks.tide (reverse image search), checks.seal (content credentials), checks.crate (file details), each with headline, body, strength (strong, some or none) and points (the lean it supports, or "none"); cues (3 or 4 spots, x and y from 0 to 1 measured from the top-left, placed exactly on the feature the note describes; include one that looks convincing but proves nothing); verdict (two sentences on how it was made); lesson (the one idea to carry forward).`

/** Turn an inbox picture into a draft entry and put it in the right level. */
export async function importPicture(file: string) {
  const { inbox, pictures } = studioPaths()
  const side = await readSidecar(inbox, file)
  if (!side) throw createError({ statusCode: 400, statusMessage: 'This picture has no notes. Add it again through the Studio.' })
  if (!LABELS.includes(side.truth) || side.truth === 'unsure') {
    throw createError({ statusCode: 400, statusMessage: 'Choose how this picture was really made before importing it. "Don\'t know yet" pictures stay in the inbox.' })
  }

  // Send the model a smaller copy (on a Mac), so requests stay quick and within size limits.
  let buf = await readFile(join(inbox, file))
  let mime = /\.png$/i.test(file) ? 'image/png' : /\.webp$/i.test(file) ? 'image/webp' : /\.gif$/i.test(file) ? 'image/gif' : 'image/jpeg'
  if (process.platform === 'darwin') {
    const tmp = join(inbox, `.import-${Date.now()}.jpg`)
    try {
      await run('sips', ['-s', 'format', 'jpeg', '-Z', '1568', join(inbox, file), '--out', tmp])
      buf = await readFile(tmp)
      mime = 'image/jpeg'
    }
    catch {}
    finally {
      await import('node:fs/promises').then(fs => fs.rm(tmp, { force: true }))
    }
  }
  const dataUrl = `data:${mime};base64,${buf.toString('base64')}`

  const packs = await readPacks()
  const target = side.target ?? { mode: 'new' }
  const existing = target.mode === 'new'
    ? packs.find(p => p.data.level === Number(side.level))
    : packs.find(p => p.data.id === target.packId)
  const example = (existing ?? packs[0])?.data.pictures[0]
  const facts = JSON.stringify({
    truth: side.truth,
    madeWith: side.madeWith || undefined,
    source: side.source || undefined,
    captionItWasSharedWith: side.claim || undefined,
    facilitatorNotes: side.notes || undefined,
    secondOpinions: (side.secondOpinions?.gemini || side.secondOpinions?.openai) ? side.secondOpinions : undefined,
    level: Number(side.level) || 2,
    harder: (Number(side.level) || 2) > 1,
  }, null, 2)

  // Pass 1: draft.
  const draft = jsonFrom((await askModel({
    system: `${RULES}\n\nAn example entry in the house style:\n${JSON.stringify(example ?? {}, null, 2)}`,
    user: `The facilitator's facts about this picture:\n${facts}\n\nWrite the game entry for this picture as JSON.`,
    dataUrl,
    schema: PICTURE_SCHEMA,
  })).text)

  // Pass 2: an independent review that hasn't seen the drafter's reasoning.
  const review = jsonFrom((await askModel({
    system: `You are an independent reviewer for this game. ${RULES}\n\nCheck the draft against the picture and the facilitator's facts: look at the picture yourself and correct any cue whose x, y is not on the feature its note describes; remove any fact the facilitator's facts and the file don't support; keep the villagers in character; keep the reading level suitable for ages 10 and up. Reply with JSON: approved (true or false), fixes (a short list of what you changed), corrected (the full corrected entry).`,
    user: `The facilitator's facts:\n${facts}\n\nThe draft entry:\n${JSON.stringify(draft, null, 2)}`,
    dataUrl,
    schema: REVIEW_SCHEMA,
  })).text)
  const entry = (review?.corrected && typeof review.corrected === 'object') ? review.corrected : draft

  // The facilitator's facts always win.
  const slug = String(side.id || entry.title || file).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'picture'
  const taken = new Set(packs.flatMap(p => p.data.pictures.map(x => x.id)))
  let id = slug
  for (let n = 2; taken.has(id) && id !== target.replaces; n++) id = `${slug}-${n}`
  const ext = extname(file).toLowerCase()
  const picture: Record<string, any> = {
    id,
    title: side.title || entry.title,
    src: `${id}${ext === '.jpeg' ? '.jpg' : ext}`,
    arrival: entry.arrival,
    claim: side.claim || entry.claim,
    truth: side.truth,
    ...(side.madeWith ? { madeWith: side.madeWith } : {}),
    close: (entry.close ?? []).filter((l: string) => l !== side.truth && LABELS.includes(l)),
    takes: { ...entry.takes, jim: { ...entry.takes?.jim, lean: 'ai' } },
    checks: Object.fromEntries(CHECKS.map((c) => {
      const f = entry.checks?.[c] ?? {}
      const { points, ...rest } = f
      return [c, LEANS.includes(points) ? { ...rest, points } : rest]
    })),
    cues: (entry.cues ?? []).slice(0, 4).map((q: { x: number, y: number, note: string }) => ({ x: Math.min(1, Math.max(0, Number(q.x))), y: Math.min(1, Math.max(0, Number(q.y))), note: q.note })),
    verdict: entry.verdict,
    lesson: entry.lesson,
    ...(side.source ? { source: side.source } : {}),
    // New pictures wait in a holding phase until you make them visible.
    visible: false,
  }
  const problems = problemsWith(picture)
  if (problems.length) throw createError({ statusCode: 422, statusMessage: `The draft wasn't complete (${problems.slice(0, 3).join('; ')}). Try importing again.` })

  // Copy the picture into the game, shrinking big ones on a Mac.
  const dest = join(pictures, picture.src)
  await copyFile(join(inbox, file), dest)
  if (process.platform === 'darwin') await run('sips', ['-Z', '1400', dest]).catch(() => {})

  // Put it in the right level.
  let where = ''
  if (target.mode === 'replace' && existing) {
    const i = existing.data.pictures.findIndex(x => x.id === target.replaces)
    if (i < 0) throw createError({ statusCode: 404, statusMessage: 'The picture you chose to replace is no longer in that level.' })
    const old = existing.data.pictures[i]!
    await archive('replaced', existing, old)
    existing.data.pictures[i] = picture
    await writePack(existing)
    if (old.src !== picture.src && !(await imageInUse(old.src))) await rename(join(pictures, old.src), join(inbox, 'replaced', `${stamp()}-${old.src}`)).catch(() => {})
    where = `replaced "${old.title ?? old.id}" in Level ${existing.data.level}`
  }
  else if (existing) {
    existing.data.pictures.push(picture)
    await writePack(existing)
    where = `added to Level ${existing.data.level} · ${existing.data.title}`
  }
  else {
    const level = Number(side.level) || 2
    const title = target.levelTitle || `Level ${level}`
    const pack: PackFile = {
      file: `level-${level}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pictures'}.json`,
      data: { id: `level-${level}`, level, title, blurb: target.levelBlurb || 'New pictures to work out.', pictures: [picture] },
    }
    await writePack(pack)
    where = `started Level ${level} · ${title}`
  }

  await shelve(file, 'imported')
  return { id: picture.id, title: picture.title, where, fixes: Array.isArray(review?.fixes) ? review.fixes.slice(0, 6) : [] }
}

export async function listInbox() {
  const { inbox } = studioPaths()
  const files = (await readdir(inbox).catch(() => [] as string[])).filter(f => IMAGE.test(f) && !f.startsWith('.'))
  return Promise.all(files.map(async file => ({ file, notes: await readSidecar(inbox, file) })))
}
