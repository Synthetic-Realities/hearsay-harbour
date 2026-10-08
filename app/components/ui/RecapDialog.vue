<script setup lang="ts">
import { CHECKS, type CheckId, LABELS, LEAN_WORDS, pictureUrl } from '~/utils/content'
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
  if (recs.some(r => r.label === 'unsure' && r.talked.length + r.checked.length >= 3)) list.push({ name: 'Honest “unsure”', why: 'You said so when the evidence didn\'t settle it.' })
  if (recs.every(r => r.caption === 'careful')) list.push({ name: 'Careful captioner', why: 'Every share said what you checked.' })
  if (recs.some((r, i) => r.talked.includes('jim') && r.label === pics[i]!.truth && pics[i]!.truth === 'camera')) {
    list.push({ name: 'Not fooled by Jim', why: 'Professor Jim said "AI!" and you followed the evidence instead.' })
  }
  const matches = (lean: string | null, truth: string) =>
    (lean === 'camera' && (truth === 'camera' || truth === 'edited')) || (lean === 'ai' && (truth === 'ai' || truth === 'assisted'))
  if (recs.some((r, i) => r.label === pics[i]!.truth && r.firstLean && r.firstLean !== 'unsure' && !matches(r.firstLean, pics[i]!.truth))) {
    list.push({ name: 'Changed my mind', why: 'Evidence turned a wrong first impression right.' })
  }
  return list
})

const topLean = (v: Record<string, number>) => {
  const total = v.camera! + v.ai! + v.unsure!
  if (!total) return '—'
  const best = (Object.entries(v) as [keyof typeof LEAN_WORDS, number][]).sort((a, b) => b[1] - a[1])[0]!
  return `${LEAN_WORDS[best[0]]} (${best[1]}/${total})`
}
const checkNames = (ids: CheckId[]) => ids.map(c => CHECKS[c].name).join(', ')
/** Every recorded finding as CSV, for workshop notes or research. */
function findingsCsv() {
  const head = ['pack', 'picture', 'caption_it_arrived_with', 'first_impression', 'hunch_pebbles', 'villagers_asked', 'checks_used', 'shared_early', 'pinned_label', 'share_caption', 'truth', 'trust_change', 'room_first_camera', 'room_first_ai', 'room_first_unsure', 'room_final_camera', 'room_final_ai', 'room_final_unsure']
  const rows = game.records.map((r, i) => {
    const p = game.pictures[i]!
    return [game.pack.id, p.id, p.claim, r.firstLean ?? '', r.pebbles.length, r.talked.join(' '), r.checked.join(' '), r.sharedEarly, r.label ?? '', r.caption ?? '', p.truth, r.trustDelta, r.roomFirst.camera, r.roomFirst.ai, r.roomFirst.unsure, r.roomFinal.camera, r.roomFinal.ai, r.roomFinal.unsure]
  })
  const cell = (v: unknown) => `"${String(v).replaceAll('"', '""')}"`
  return [head, ...rows].map(r => r.map(cell).join(',')).join('\n')
}

function exportCsv() {
  const csv = findingsCsv()
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `hearsay-harbour-findings-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
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
            <td>{{ LABELS[p.truth].name }}</td>
            <td v-if="game.workshop" class="ev">
              {{ topLean(r.roomFirst) }} → {{ topLean(r.roomFinal) }}
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
    <div v-if="copied === 'manual'" class="manual">
      <label for="findings-csv">Copying was blocked. Select all of this and copy it yourself:</label>
      <textarea id="findings-csv" readonly :value="findingsCsv()" rows="5" @focus="($event.target as HTMLTextAreaElement).select()" />
    </div>
    <h3>Talk it over</h3>
    <ul class="prompts hand">
      <li>Which picture changed your mind the most, and what changed it?</li>
      <li>When did looking closely help, and when did checking where it came from matter more?</li>
      <li>How would you describe one of these pictures if you shared it with family?</li>
    </ul>
    <template #footer>
      <span v-if="copied === 'done'" class="soft copied" role="status">Copied. Paste into a spreadsheet.</span>
      <button class="big-btn quiet" @click="copyCsv">
        Copy findings
      </button>
      <button class="big-btn quiet" @click="exportCsv">
        <UiIcon name="download" class="dl" /> Download findings
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
.dl {
  width: 20px;
  height: 20px;
}
</style>
