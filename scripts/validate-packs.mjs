// Checks every picture pack in app/packs against the game's schema.
// Run: npm run validate   (exits non-zero if anything is wrong)
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const packsDir = join(root, 'app/packs')
const picsDir = join(root, 'public/pictures')
const LABELS = ['camera', 'edited', 'drawn', 'assisted', 'ai', 'unsure']
const LEANS = ['camera', 'drawn', 'ai', 'unsure']
const VILLAGERS = ['wren', 'pip', 'moss', 'jim']
const CHECKS = ['tide', 'seal', 'crate']
const STRENGTHS = ['strong', 'some', 'none']

const problems = []
const seen = new Set()
const need = (cond, where, msg) => { if (!cond) problems.push(`${where}: ${msg}`) }
const text = v => typeof v === 'string' && v.trim().length > 0

for (const f of readdirSync(packsDir).filter(f => f.endsWith('.json'))) {
  let pack
  try { pack = JSON.parse(readFileSync(join(packsDir, f), 'utf8')) }
  catch (e) { problems.push(`${f}: not valid JSON (${e.message})`); continue }
  need(text(pack.id), f, 'pack needs an id')
  need(Number.isInteger(pack.level) && pack.level >= 1, f, 'level must be a whole number from 1')
  need(text(pack.title) && text(pack.blurb), f, 'pack needs a title and blurb')
  need(Array.isArray(pack.pictures), f, 'pictures must be a list')
  for (const [i, p] of (pack.pictures ?? []).entries()) {
    const at = `${f} › ${p?.id ?? `picture ${i + 1}`}`
    need(text(p.id) && !seen.has(p.id), at, 'needs a unique id')
    seen.add(p.id)
    need(text(p.src) && existsSync(join(picsDir, p.src)), at, `image public/pictures/${p.src} is missing`)
    if (p.madeWith !== undefined) need(text(p.madeWith), at, 'madeWith is empty')
    if (p.title !== undefined) need(text(p.title), at, 'title is empty')
    for (const k of ['arrival', 'claim', 'verdict', 'lesson']) need(text(p[k]), at, `${k} is empty`)
    need(LABELS.includes(p.truth), at, `truth must be one of ${LABELS.join(', ')}`)
    need(Array.isArray(p.close) && p.close.every(l => LABELS.includes(l) && l !== p.truth), at, 'close must list other labels')
    for (const v of VILLAGERS) {
      need(LEANS.includes(p.takes?.[v]?.lean) && text(p.takes?.[v]?.text), at, `${v}'s take needs a lean and text`)
    }
    for (const c of CHECKS) {
      const fnd = p.checks?.[c]
      need(fnd && text(fnd.headline) && text(fnd.body) && STRENGTHS.includes(fnd.strength), at, `${c} check needs headline, body and strength`)
      if (fnd?.points) need(LEANS.includes(fnd.points), at, `${c} points must be a lean`)
    }
    need(Array.isArray(p.cues) && p.cues.length >= 2 && p.cues.length <= 5, at, 'needs 2 to 5 cues')
    for (const q of p.cues ?? []) need(q.x >= 0 && q.x <= 1 && q.y >= 0 && q.y <= 1 && text(q.note), at, `cue "${q.note}" needs x and y between 0 and 1`)
    if (p.visible !== undefined) need(typeof p.visible === 'boolean', at, 'visible must be true or false')
  }
}

if (problems.length) {
  console.error(`✗ ${problems.length} problem(s):\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(`✓ All packs valid (${seen.size} pictures).`)
