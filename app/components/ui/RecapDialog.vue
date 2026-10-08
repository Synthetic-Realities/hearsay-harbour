<script setup lang="ts">
import { CHECKS, type CheckId, LABELS, LEAN_WORDS, pictureUrl, leanMatches, voteList } from '~/utils/content'
import { useGame } from '~/stores/game'

const game = useGame()
const rows = computed(() => game.records.map((r, i) => ({ r, p: game.pictures[i]! })))

const badges = computed(() => {
  const recs = game.records
  const pics = game.pictures
  const list: { name: string, why: string }[] = []
  if (recs.every(r => !r.sharedEarly)) list.push({ name: 'Patient puffin', why: 'You never let the gull rush you.' })
  if (recs.filter(r => r.checked.includes('tide')).length >= 4) list.push({ name: 'Trail follower', why: 'You searched for where pictures came from.' })
  if (recs.some(r => r.talked.length === 3)) list.push({ name: 'Good neighbour', why: 'You heard every villager out on a picture.' })
  if (recs.some(r => r.label === 'unsure' && r.talked.length + r.checked.length >= 3)) list.push({ name: 'Honest “unsure”', why: 'The evidence didn\'t settle it, so you decided to say so.' })
  if (recs.every(r => r.caption === 'careful')) list.push({ name: 'Careful captioner', why: 'Every share said what you checked.' })
  if (recs.some((r, i) => r.talked.includes('jim') && r.label === pics[i]!.truth && pics[i]!.truth === 'camera')) {
    list.push({ name: 'Not fooled by Jim', why: 'Professor Jim said "AI!" and you followed the evidence instead.' })
  }
  if (recs.some((r, i) => r.label === pics[i]!.truth && r.firstLean && r.firstLean !== 'unsure' && !leanMatches(r.firstLean, pics[i]!.truth))) {
    list.push({ name: 'Changed my mind', why: 'Evidence turned a wrong first impression right.' })
  }
  return list
})

/** The room's most popular choice, e.g. "AI-generated (5/8)". */
const topChoice = (v: Partial<Record<string, number>>, first: boolean) => {
  const list = voteList(v, first)
  const total = list.reduce((n, c) => n + c.n, 0)
  if (!total) return '—'
  const best = [...list].sort((a, b) => b.n - a.n)[0]!
  return `${best.name} (${best.n}/${total})`
}
const checkNames = (ids: CheckId[]) => ids.map(c => CHECKS[c].name).join(', ')
/** Every recorded finding as CSV, for workshop notes or research. */
function findingsCsv() {
  const head = ['pack', 'picture', 'caption_it_arrived_with', 'first_impression', 'hunch_pebbles', 'villagers_asked', 'checks_used', 'shared_early', 'pinned_label', 'share_caption', 'truth', 'trust_change', 'room_first_votes', 'room_final_votes']
  const rows = game.records.map((r, i) => {
    const p = game.pictures[i]!
    return [game.pack.id, p.id, p.claim, r.firstLean ?? '', r.pebbles.length, r.talked.join(' '), r.checked.join(' '), r.sharedEarly, r.label ?? '', r.caption ?? '', p.truth, r.trustDelta, voteList(r.roomFirst, true).map(c => `${c.name} ${c.n}`).join('; '), voteList(r.roomFinal, false).map(c => `${c.name} ${c.n}`).join('; ')]
  })
  const cell = (v: unknown) => `"${String(v).replaceAll('"', '""')}"`
  return [head, ...rows].map(r => r.map(cell).join(',')).join('\n')
}

const sheet = ref<HTMLElement>()
const saving = ref(false)
const preview = ref('')
const today = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
const fileBase = `hearsay-harbour-findings-${new Date().toISOString().slice(0, 10)}`

function download(href: string, name: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
}

/** Save the findings (without the buttons) as a PNG or a one-page PDF. */
async function saveImage(kind: 'png' | 'pdf') {
  if (!sheet.value) return
  saving.value = true
  try {
    const { toPng } = await import('html-to-image')
    const png = await toPng(sheet.value, { pixelRatio: 2, backgroundColor: '#fffaf0', cacheBust: true })
    // Inside an embedded viewer downloads are blocked, so show the picture to save by hand.
    const embedded = window.self !== window.top
    if (kind === 'png') {
      if (embedded) preview.value = png
      else download(png, `${fileBase}.png`)
      return
    }
    const { jsPDF } = await import('jspdf')
    const img = new Image()
    img.src = png
    await img.decode()
    const w = 210
    const h = (img.height / img.width) * w
    const pdf = new jsPDF({ unit: 'mm', format: [w, h], orientation: h > w ? 'portrait' : 'landscape' })
    pdf.addImage(png, 'PNG', 0, 0, w, h)
    if (embedded) preview.value = png
    else pdf.save(`${fileBase}.pdf`)
  }
  finally {
    saving.value = false
  }
}


// Some places (like a shared link) block downloads, so copying is always offered too.
const copied = ref<'idle' | 'done' | 'manual'>('idle')
async function copyCsv() {
  try {
    await navigator.clipboard.writeText(findingsCsv())
    copied.value = 'done'
  }
  catch {
    copied.value = 'manual'
  }
}

const correct = computed(() => game.records.filter((r, i) => r.label === game.pictures[i]!.truth).length)
</script>

<template>
  <UiDialog kicker="Dusk at the harbour" title="Revisit the recorded findings" wide @close="game.close()">
    <div ref="sheet" class="sheet-export">
      <p class="stamp">
        Hearsay Harbour · Recorded findings · {{ game.pack.title }} · {{ today }}{{ game.workshop ? ' · Workshop' : '' }}
      </p>
    <p class="lead">
      You pinned <strong>{{ correct }}</strong> of {{ game.pictures.length }} exactly right, and the trust garden has
      <strong>{{ game.trust }}</strong> bloom{{ game.trust === 1 ? '' : 's' }}.
    </p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">
              Picture
            </th>
            <th scope="col">
              First impression
            </th>
            <th scope="col">
              Evidence
            </th>
            <th scope="col">
              You pinned
            </th>
            <th scope="col">
              It was
            </th>
            <th v-if="game.workshop" scope="col">
              Room: first → final
            </th>
            <th scope="col">
              Trust
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ r, p } in rows" :key="r.id">
            <td><img :src="pictureUrl(p.src)" alt="" class="thumb"><span class="sr-only">{{ p.claim }}</span></td>
            <td><span class="tag" :class="r.firstLean ?? 'unsure'">{{ LEAN_WORDS[r.firstLean ?? 'unsure'] }}</span></td>
            <td class="ev">
              {{ r.talked.length }} chat{{ r.talked.length === 1 ? '' : 's' }}<span v-if="r.checked.length">, {{ checkNames(r.checked) }}</span>
              <span v-if="r.sharedEarly" class="rushed">rushed by the gull</span>
            </td>
            <td :class="{ good: r.label === p.truth }">
              {{ r.label ? LABELS[r.label].name : '—' }}
            </td>
            <td>
              {{ LABELS[p.truth].name }}
              <span v-if="p.madeWith" class="made">{{ p.madeWith }}</span>
            </td>
            <td v-if="game.workshop" class="ev">
              {{ topChoice(r.roomFirst, true) }} → {{ topChoice(r.roomFinal, false) }}
            </td>
            <td :class="r.trustDelta >= 0 ? 'up' : 'down'">
              {{ r.trustDelta >= 0 ? '+' : '' }}{{ r.trustDelta }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <h3>Keepsakes</h3>
    <ul v-if="badges.length" class="badges">
      <li v-for="b in badges" :key="b.name">
        <UiIcon name="flower" /><strong>{{ b.name }}</strong><span>{{ b.why }}</span>
      </li>
    </ul>
    <p v-else class="soft">
      No keepsakes this time. Try asking everyone, following the trail, or ignoring the gull.
    </p>
    <h3>Talk it over</h3>
    <ul class="prompts hand">
      <li>Which picture changed your mind the most, and what changed it?</li>
      <li>When did looking closely help, and when did checking where it came from matter more?</li>
      <li>How would you describe one of these pictures if you shared it with family?</li>
    </ul>
    </div>
    <div v-if="copied === 'manual'" class="manual">
      <label for="findings-csv">Copying was blocked. Select all of this and copy it yourself:</label>
      <textarea id="findings-csv" readonly :value="findingsCsv()" rows="5" @focus="($event.target as HTMLTextAreaElement).select()" />
    </div>
    <div v-if="preview" class="preview">
      <p>Your browser blocked the download here. Right-click (or press and hold) the image to save it.</p>
      <img :src="preview" alt="The findings, as an image">
    </div>
    <template #footer>
      <span v-if="copied === 'done'" class="soft copied" role="status">Copied. Paste into a spreadsheet.</span>
      <button class="big-btn quiet" @click="copyCsv">
        Copy data (CSV)
      </button>
      <button class="big-btn quiet" :disabled="saving" @click="saveImage('png')">
        <UiIcon name="download" class="dl" /> Save as image
      </button>
      <button class="big-btn quiet" :disabled="saving" @click="saveImage('pdf')">
        <UiIcon name="download" class="dl" /> Save as PDF
      </button>
      <button autofocus class="big-btn" @click="game.start(game.workshop)">
        Play the day again
      </button>
    </template>
  </UiDialog>
</template>

<style scoped>
.lead {
  margin: 0 0 12px;
}
.table-wrap {
  overflow-x: auto;
  border-radius: 14px;
  border: 2px solid var(--line);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
th,
td {
  padding: 8px 10px;
  text-align: left;
  vertical-align: middle;
  border-bottom: 1.5px solid var(--line);
}
th {
  background: var(--paper-2);
  font-weight: 600;
  white-space: nowrap;
}
tr:last-child td {
  border-bottom: none;
}
.thumb {
  width: 54px;
  height: 54px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}
.ev {
  color: var(--ink-soft);
}
.made {
  display: block;
  font-size: 0.78rem;
  color: var(--ink-soft);
}
.rushed {
  display: block;
  color: var(--ai);
  font-weight: 600;
}
.good {
  color: var(--leaf-deep);
  font-weight: 700;
}
.up {
  color: var(--leaf-deep);
  font-weight: 700;
}
.down {
  color: var(--ai);
  font-weight: 700;
}
h3 {
  margin: 18px 0 8px;
}
.badges {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}
.badges li {
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: 0 6px;
  padding: 10px 12px;
  border-radius: 14px;
  background: #e7f5e1;
}
.badges svg {
  grid-row: span 2;
  width: 24px;
  height: 24px;
  color: var(--leaf-deep);
}
.badges span {
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.prompts {
  margin: 0;
  padding-left: 1.2em;
  display: grid;
  gap: 4px;
  font-size: 1.1rem;
}
.soft {
  color: var(--ink-soft);
}
.copied {
  margin-right: auto;
  font-size: 0.9rem;
}
.manual {
  display: grid;
  gap: 6px;
  margin-top: 14px;
  font-size: 0.9rem;
}
.manual textarea {
  width: 100%;
  font: 0.8rem ui-monospace, monospace;
  border-radius: 10px;
  border: 2px solid var(--line);
  padding: 8px;
}
.sheet-export {
  padding: 4px 2px 8px;
  background: var(--paper);
}
.stamp {
  margin: 0 0 8px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}
.preview {
  margin-top: 14px;
  padding: 10px;
  border-radius: 14px;
  background: var(--paper-2);
  font-size: 0.9rem;
}
.preview img {
  display: block;
  max-width: 100%;
  margin-top: 8px;
  border-radius: 8px;
}
.dl {
  width: 20px;
  height: 20px;
}
</style>
