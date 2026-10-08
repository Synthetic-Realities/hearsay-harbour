<script setup lang="ts">
import { CHECKS, type CheckId, LABELS, LABEL_ORDER, LEAN_CHOICES, type Picture, VILLAGERS, VILLAGER_IDS, pictureUrl } from '~/utils/content'

/*
 * Dev Studio: edit everything about one picture (what each villager says, the checks, the
 * spots to notice, the caption, credential, verdict and lesson). Click the picture to move
 * the selected spot. Saving checks the entry is complete before writing it.
 */
const props = defineProps<{ packId: string, picture: Picture }>()
const emit = defineEmits<{ saved: [], cancel: [] }>()

const p = reactive(JSON.parse(JSON.stringify(props.picture)) as Picture)
p.madeWith ??= ''
p.source ??= ''
p.title ??= ''
for (const c of ['tide', 'seal', 'crate'] as CheckId[]) (p.checks[c] as { points?: string }).points ??= 'none'

const spot = ref(0)
const saving = ref(false)
const error = ref('')

function place(ev: MouseEvent) {
  const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  const cue = p.cues[spot.value]
  if (!cue) return
  cue.x = Math.round(((ev.clientX - r.left) / r.width) * 100) / 100
  cue.y = Math.round(((ev.clientY - r.top) / r.height) * 100) / 100
}
function addSpot() {
  if (p.cues.length >= 5) return
  p.cues.push({ x: 0.5, y: 0.5, note: '' })
  spot.value = p.cues.length - 1
}
function removeSpot(i: number) {
  if (p.cues.length <= 2) return
  p.cues.splice(i, 1)
  spot.value = Math.min(spot.value, p.cues.length - 1)
}
function toggleClose(l: string) {
  const i = p.close.indexOf(l as never)
  if (i >= 0) p.close.splice(i, 1)
  else p.close.push(l as never)
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/packs/update', { method: 'POST', body: { packId: props.packId, picture: p } })
    emit('saved')
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err.data?.statusMessage ?? 'Saving failed. Is the dev server still running?'
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="editor" aria-label="Edit picture">
    <header class="ed-head">
      <h3>Edit “{{ p.title || p.id }}”</h3>
      <div class="ed-actions">
        <button type="button" class="again" @click="emit('cancel')">
          Cancel
        </button>
        <button type="button" class="big-btn" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save changes' }}
        </button>
      </div>
    </header>
    <p v-if="error" class="msg error" role="alert">
      {{ error }}
    </p>

    <div class="ed-grid">
      <div class="ed-pic">
        <div class="pic-wrap" role="presentation" @click="place">
          <img :src="pictureUrl(p.src)" alt="">
          <button
            v-for="(c, i) in p.cues"
            :key="i"
            type="button"
            class="cue"
            :class="{ on: spot === i }"
            :style="{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }"
            :aria-label="`Select spot ${i + 1}`"
            @click.stop="spot = i"
          >
            {{ i + 1 }}
          </button>
        </div>
        <p class="soft small">
          Select a spot, then click the picture to move it there.
        </p>
        <h4>Spots to notice</h4>
        <div v-for="(c, i) in p.cues" :key="i" class="cue-row" :class="{ on: spot === i }">
          <button type="button" class="num" @click="spot = i">
            {{ i + 1 }}
          </button>
          <input v-model="c.note" type="text" :aria-label="`Spot ${i + 1} note`" @focus="spot = i">
          <button type="button" class="again" :disabled="p.cues.length <= 2" :aria-label="`Remove spot ${i + 1}`" @click="removeSpot(i)">
            ✕
          </button>
        </div>
        <button v-if="p.cues.length < 5" type="button" class="again" @click="addSpot">
          Add a spot
        </button>
      </div>

      <div class="ed-fields">
        <label>Title <input v-model="p.title" type="text"></label>
        <label>Caption it was shared with <input v-model="p.claim" type="text"></label>
        <label>How it arrives <input v-model="p.arrival" type="text"></label>
        <label>How it was really made
          <select v-model="p.truth">
            <option v-for="l in LABEL_ORDER" :key="l" :value="l">{{ LABELS[l].name }}</option>
          </select>
        </label>
        <fieldset>
          <legend>Close enough for partial credit</legend>
          <label v-for="l in LABEL_ORDER.filter(l => l !== p.truth)" :key="l" class="check">
            <input type="checkbox" :checked="(p.close as string[]).includes(l)" @change="toggleClose(l)"> {{ LABELS[l].name }}
          </label>
        </fieldset>
        <label>Made with <span class="soft">(shown at the reveal)</span> <input v-model="p.madeWith" type="text"></label>
        <label>Where it came from <span class="soft">(for facilitators and the credits)</span> <textarea v-model="p.source" rows="2" /></label>
      </div>
    </div>

    <h4>What the villagers say</h4>
    <div class="villagers">
      <div v-for="id in VILLAGER_IDS" :key="id" class="vill">
        <VillagerFace :who="id" class="face" />
        <div class="vill-fields">
          <strong>{{ VILLAGERS[id].name }}</strong>
          <select v-model="p.takes[id].lean" :aria-label="`${VILLAGERS[id].name}'s lean`" :disabled="id === 'jim'">
            <option v-for="c in LEAN_CHOICES" :key="c.id" :value="c.id">{{ c.short }}</option>
          </select>
          <textarea v-model="p.takes[id].text" rows="3" :aria-label="`What ${VILLAGERS[id].name} says`" />
        </div>
      </div>
    </div>

    <h4>What the checks find</h4>
    <div class="checks">
      <div v-for="c in (['tide', 'seal', 'crate'] as CheckId[])" :key="c" class="chk">
        <strong>{{ CHECKS[c].name }}</strong>
        <input v-model="p.checks[c].headline" type="text" :aria-label="`${CHECKS[c].name} headline`" placeholder="Headline">
        <textarea v-model="p.checks[c].body" rows="3" :aria-label="`${CHECKS[c].name} finding`" />
        <div class="row">
          <select v-model="p.checks[c].strength" :aria-label="`${CHECKS[c].name} strength`">
            <option value="strong">Strong evidence</option>
            <option value="some">Some evidence</option>
            <option value="none">Doesn't settle it</option>
          </select>
          <select v-model="(p.checks[c] as { points?: string }).points" :aria-label="`${CHECKS[c].name} points towards`">
            <option value="none">Points nowhere</option>
            <option v-for="l in LEAN_CHOICES" :key="l.id" :value="l.id">Points to: {{ l.short }}</option>
          </select>
        </div>
      </div>
    </div>

    <label class="wide">The verdict <textarea v-model="p.verdict" rows="2" /></label>
    <label class="wide">The lesson <input v-model="p.lesson" type="text"></label>

    <div class="ed-foot">
      <button type="button" class="again" @click="emit('cancel')">
        Cancel
      </button>
      <button type="button" class="big-btn" :disabled="saving" @click="save">
        {{ saving ? 'Saving…' : 'Save changes' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.editor {
  display: grid;
  gap: 12px;
}
.ed-head,
.ed-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ed-foot {
  justify-content: flex-end;
}
.ed-head h3 {
  margin: 0;
}
.ed-actions {
  display: flex;
  gap: 8px;
}
.ed-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
}
.pic-wrap {
  position: relative;
  width: fit-content;
  max-width: 100%;
  cursor: crosshair;
  line-height: 0;
}
.pic-wrap img {
  max-width: 100%;
  max-height: 340px;
  border-radius: 10px;
}
.cue {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid #fff;
  background: var(--sea-deep);
  color: #fff;
  font-weight: 700;
  font-size: 0.8rem;
  line-height: 1;
}
.cue.on {
  background: var(--honey-deep);
  transform: translate(-50%, -50%) scale(1.2);
}
.cue-row {
  display: grid;
  grid-template-columns: 30px 1fr auto;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
}
.num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: var(--sea-deep);
  color: #fff;
  font-weight: 700;
}
.cue-row.on .num {
  background: var(--honey-deep);
}
.ed-fields {
  display: grid;
  gap: 8px;
  align-content: start;
}
label {
  display: grid;
  gap: 4px;
  font-weight: 600;
  font-size: 0.9rem;
}
label.check {
  display: inline-flex;
  gap: 6px;
  margin-right: 12px;
  font-weight: 400;
}
fieldset {
  margin: 0;
  padding: 0;
  border: none;
  font-size: 0.9rem;
}
legend {
  font-weight: 600;
  margin-bottom: 4px;
}
input[type='text'],
textarea,
select {
  width: 100%;
  padding: 7px 10px;
  border-radius: 10px;
  border: 2px solid var(--line);
  background: #fff;
  font: inherit;
  font-weight: 400;
  color: inherit;
}
h4 {
  margin: 6px 0 0;
}
.villagers,
.checks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.checks {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.vill {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 10px;
  padding: 10px;
  border-radius: 14px;
  border: 2px solid var(--line);
  background: #fff;
}
.face {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--paper-2);
}
.vill-fields,
.chk {
  display: grid;
  gap: 6px;
}
.chk {
  padding: 10px;
  border-radius: 14px;
  border: 2px solid var(--line);
  background: #fff;
}
.row {
  display: flex;
  gap: 6px;
}
.wide {
  width: 100%;
}
.soft {
  color: var(--ink-soft);
  font-weight: 400;
}
.small {
  font-size: 0.85rem;
}
.again {
  padding: 4px 12px;
  border-radius: 999px;
  border: 2px solid var(--lilac);
  background: #fff;
  font-weight: 600;
  font-size: 0.85rem;
}
.msg.error {
  margin: 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: #fdf0f1;
}
@media (max-width: 760px) {
  .ed-grid,
  .villagers,
  .checks {
    grid-template-columns: 1fr;
  }
}
</style>
