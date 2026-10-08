<script setup lang="ts">
import { PACKS } from '~/utils/content'
import { useGame } from '~/stores/game'

/*
 * Dev Studio (only in `npm run dev`): drop new pictures into content-inbox/ with the facts
 * only you know (how it was made, where it came from). The /import-pictures agent skill
 * then drafts the villagers' lines, checks and spots, and a second pass reviews them.
 */
const game = useGame()
const file = ref<File | null>(null)
const preview = ref('')
const truth = ref('')
const level = ref(Math.max(2, ...PACKS.map(p => p.level)))
const claim = ref('')
const source = ref('')
const madeWith = ref('')
const notes = ref('')
const busy = ref(false)
const message = ref<{ kind: 'ok' | 'error', text: string } | null>(null)
const inbox = ref<{ file: string, notes: { truth: string, level: number, source: string } | null }[]>([])
const dragging = ref(false)
const title = ref('')

/*
 * AI assist (local only): your own model suggests the title, caption, notes and any visible
 * credit. It also offers a hunch about how the picture was made, but you choose. Set up in .env.
 */
const AI_KEY = 'hearsay-harbour:ai-assist'
const aiOn = ref((() => {
  try {
    return localStorage.getItem(AI_KEY) === 'on'
  }
  catch {
    return false
  }
})())
const aiStatus = ref<{ ready: boolean, provider: string, model: string, problem: string } | null>(null)
const aiBusy = ref(false)
const aiError = ref('')
const aiFilled = ref(new Set<string>())
const aiGuess = ref<{ label: string, confidence: string, why: string } | null>(null)
const aiUsed = ref<{ provider: string, model: string } | null>(null)
watch(aiOn, (on) => {
  try {
    localStorage.setItem(AI_KEY, on ? 'on' : 'off')
  }
  catch {}
  if (on && file.value && !aiFilled.value.size) void suggest()
})
onMounted(async () => {
  aiStatus.value = await $fetch('/api/assist').catch(() => null) as typeof aiStatus.value
})

/** Shrink the picture before sending it, so requests stay small and quick. */
async function shrink(f: File, max = 1568) {
  const bmp = await createImageBitmap(f)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.88)
}

const LABEL_NAMES: Record<string, string> = { camera: 'Camera-made', edited: 'Edited photo', drawn: 'Hand-drawn or illustrated', assisted: 'AI-assisted', ai: 'AI-generated', unsure: 'Not sure' }

async function suggest() {
  if (!file.value || !aiStatus.value?.ready) return
  aiBusy.value = true
  aiError.value = ''
  try {
    const res = await $fetch<{ suggestion: { title: string, caption: string, notes: string[], madeWith: string, truthGuess: { label: string, confidence: string, why: string } }, provider: string, model: string }>('/api/assist', {
      method: 'POST',
      body: { image: await shrink(file.value) },
    })
    const s = res.suggestion
    const filled = new Set<string>()
    // Only fill fields you haven't typed in yourself.
    const fill = (key: string, current: { value: string }, value: string) => {
      if (value && (!current.value || aiFilled.value.has(key))) {
        current.value = value
        filled.add(key)
      }
    }
    fill('title', title, s.title)
    fill('claim', claim, s.caption)
    fill('notes', notes, s.notes.map(n => `• ${n}`).join('\n'))
    fill('madeWith', madeWith, s.madeWith)
    aiFilled.value = filled
    aiGuess.value = s.truthGuess
    aiUsed.value = { provider: res.provider, model: res.model }
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    aiError.value = err.data?.statusMessage ?? 'The AI request failed. Check the dev server window for details.'
  }
  finally {
    aiBusy.value = false
  }
}

const TRUTHS = [
  { id: 'camera', text: 'Camera-made' },
  { id: 'edited', text: 'Edited photo' },
  { id: 'drawn', text: 'Hand-drawn or illustrated' },
  { id: 'assisted', text: 'AI-assisted' },
  { id: 'ai', text: 'AI-generated' },
  { id: 'unknown', text: 'Don\'t know yet' },
]

async function refresh() {
  inbox.value = await $fetch('/api/inbox').catch(() => []) as typeof inbox.value
}
onMounted(refresh)

function pick(f: File | null | undefined) {
  if (!f) return
  if (!f.type.startsWith('image/')) {
    message.value = { kind: 'error', text: 'That isn\'t a picture. Use a JPG, PNG, WebP or GIF.' }
    return
  }
  file.value = f
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = URL.createObjectURL(f)
  message.value = null
  aiFilled.value = new Set()
  aiGuess.value = null
  aiUsed.value = null
  if (aiOn.value && aiStatus.value?.ready) void suggest()
}
function onDrop(ev: DragEvent) {
  dragging.value = false
  pick(ev.dataTransfer?.files?.[0])
}

async function save() {
  if (!file.value || !truth.value) return
  busy.value = true
  message.value = null
  const form = new FormData()
  form.append('image', file.value)
  form.append('truth', truth.value)
  form.append('level', String(level.value))
  form.append('claim', claim.value)
  form.append('source', source.value)
  form.append('madeWith', madeWith.value)
  form.append('notes', notes.value)
  form.append('id', title.value)
  form.append('title', title.value)
  if (aiUsed.value) form.append('aiAssist', `${aiUsed.value.provider}:${aiUsed.value.model}:${[...aiFilled.value].join(',')}`)
  try {
    const res = await $fetch<{ file: string }>('/api/inbox', { method: 'POST', body: form })
    message.value = { kind: 'ok', text: `Saved ${res.file} to content-inbox.` }
    file.value = null
    preview.value = ''
    claim.value = ''
    source.value = ''
    madeWith.value = ''
    notes.value = ''
    title.value = ''
    aiFilled.value = new Set()
    aiGuess.value = null
    aiUsed.value = null
    await refresh()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    message.value = { kind: 'error', text: err.data?.statusMessage ?? 'Saving failed. Is the dev server still running?' }
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <UiDialog kicker="Dev Studio" title="Add pictures for new levels" wide @close="game.close()">
    <div class="layout">
      <form class="form" @submit.prevent="save">
        <div class="ai-bar" :class="{ on: aiOn }">
          <label class="switch" for="studio-ai">
            <input id="studio-ai" v-model="aiOn" type="checkbox" role="switch" :disabled="!aiStatus?.ready">
            <span class="knob" aria-hidden="true" />
            <strong>AI assist</strong>
          </label>
          <span v-if="aiStatus?.ready" class="soft small">{{ aiStatus.provider }} · {{ aiStatus.model }}</span>
          <span v-else class="soft small">{{ aiStatus?.problem ?? 'Checking…' }}</span>
          <button v-if="aiOn && file" type="button" class="again" :disabled="aiBusy" @click="suggest">
            {{ aiBusy ? 'Looking…' : 'Suggest again' }}
          </button>
        </div>
        <p v-if="aiOn && aiBusy" class="soft small" role="status">
          Your AI model is looking at the picture…
        </p>
        <p v-if="aiError" class="msg error" role="status">
          {{ aiError }}
        </p>
        <label
          class="drop"
          :class="{ dragging, has: !!preview }"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
        >
          <img v-if="preview" :src="preview" alt="Picture to add">
          <span v-else>Drop a picture here, or click to choose one</span>
          <input id="studio-file" type="file" accept="image/*" class="sr-only" @change="pick(($event.target as HTMLInputElement).files?.[0])">
        </label>

        <fieldset>
          <legend>How was it really made?</legend>
          <div class="truths">
            <label v-for="t in TRUTHS" :key="t.id" class="truth" :class="{ on: truth === t.id }">
              <input :id="`studio-truth-${t.id}`" v-model="truth" type="radio" name="truth" :value="t.id" class="sr-only">
              {{ t.text }}
            </label>
          </div>
          <p v-if="aiGuess" class="guess">
            <strong>AI's hunch:</strong> {{ LABEL_NAMES[aiGuess.label] ?? aiGuess.label }} ({{ aiGuess.confidence }} confidence). {{ aiGuess.why }}
            <span class="soft">Only you know how it was really made, so you choose.</span>
          </p>
        </fieldset>

        <label for="studio-title">Title <span class="soft">(a short name)</span> <span v-if="aiFilled.has('title')" class="ai-badge">AI suggested</span></label>
        <input id="studio-title" v-model="title" type="text" placeholder="e.g. Flooded high street">

        <div class="row">
          <label for="studio-level">Level</label>
          <input id="studio-level" v-model.number="level" type="number" min="1" max="9">
        </div>
        <label for="studio-claim">Caption it was shared with <span class="soft">(optional)</span> <span v-if="aiFilled.has('claim')" class="ai-badge">AI suggested</span></label>
        <input id="studio-claim" v-model="claim" type="text" placeholder="e.g. Huge flood in town this morning!">
        <label for="studio-made">Made with <span class="soft">(shown to players at the reveal)</span> <span v-if="aiFilled.has('madeWith')" class="ai-badge">Seen in the picture</span></label>
        <input id="studio-made" v-model="madeWith" type="text" placeholder="e.g. ChatGPT (OpenAI image generation); or: phone camera, Dr Sam Martin">
        <label for="studio-source">Where it really came from <span class="soft">(the import uses only this for the checks)</span></label>
        <textarea id="studio-source" v-model="source" rows="2" placeholder="e.g. Generated with an image tool for the workshop, 2026; or: my own phone photo, Bristol, 2019" />
        <label for="studio-notes">Notes for the import <span class="soft">(optional)</span> <span v-if="aiFilled.has('notes')" class="ai-badge">AI suggested</span></label>
        <textarea id="studio-notes" v-model="notes" rows="3" placeholder="e.g. Point out the warped railings on the left; this is a hard one" />

        <p v-if="message" class="msg" :class="message.kind" role="status">
          {{ message.text }}
        </p>
        <button class="big-btn" type="submit" :disabled="!file || !truth || busy">
          {{ busy ? 'Saving…' : 'Add to the inbox' }}
        </button>
      </form>

      <aside class="side">
        <h3>Waiting in the inbox ({{ inbox.length }})</h3>
        <ul v-if="inbox.length" class="list">
          <li v-for="i in inbox" :key="i.file">
            <strong>{{ i.file }}</strong>
            <span class="soft">{{ i.notes ? `${i.notes.truth} · level ${i.notes.level}` : 'no notes yet' }}</span>
          </li>
        </ul>
        <p v-else class="soft">
          Nothing yet. You can also copy pictures straight into the <code>content-inbox</code> folder.
        </p>
        <h3>Then import them</h3>
        <ol class="steps">
          <li>In an AI coding agent that can run skills, open this project and run <code>/import-pictures</code>.</li>
          <li>One AI pass drafts each picture's villager lines, checks and spots. A second, separate pass reviews the draft against the picture and your notes.</li>
          <li>New pictures arrive as <strong>drafts</strong> in a level pack. Play them, then mark them reviewed.</li>
        </ol>
      </aside>
    </div>
  </UiDialog>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 24px;
}
.form {
  display: grid;
  gap: 8px;
}
.ai-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding: 8px 12px;
  border-radius: 14px;
  border: 2px dashed var(--line);
  background: #fff;
}
.ai-bar.on {
  border-color: var(--lilac);
  background: #f7f2fd;
}
.switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.switch input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}
.knob {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 999px;
  background: var(--line);
  transition: background var(--dur);
}
.knob::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform var(--dur) var(--ease);
}
.switch input:checked + .knob {
  background: #8a6a9e;
}
.switch input:checked + .knob::after {
  transform: translateX(18px);
}
.switch input:focus-visible + .knob {
  box-shadow: var(--focus);
}
.switch input:disabled + .knob {
  opacity: 0.5;
}
.small {
  font-size: 0.85rem;
}
.again {
  margin-left: auto;
  padding: 4px 12px;
  border-radius: 999px;
  border: 2px solid var(--lilac);
  background: #fff;
  font-weight: 600;
  font-size: 0.85rem;
}
.guess {
  margin: 8px 0 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: #f7f2fd;
  font-size: 0.88rem;
  font-weight: 400;
}
.guess .soft {
  display: block;
  margin-top: 2px;
}
.ai-badge {
  display: inline-block;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--lilac);
  color: #2f1f4a;
  font-size: 0.72rem;
  font-weight: 600;
}
.drop {
  display: grid;
  place-items: center;
  min-height: 170px;
  padding: 12px;
  border: 3px dashed var(--line);
  border-radius: 18px;
  background: #fff;
  color: var(--ink-soft);
  text-align: center;
  cursor: pointer;
}
.drop.dragging {
  border-color: var(--honey-deep);
  background: #fff6dd;
}
.drop img {
  max-height: 220px;
  border-radius: 10px;
}
fieldset {
  margin: 4px 0;
  padding: 0;
  border: none;
}
legend,
label {
  font-weight: 600;
  font-size: 0.92rem;
}
.truths {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.truth {
  padding: 6px 12px;
  border-radius: 999px;
  border: 2px solid var(--line);
  background: #fff;
  cursor: pointer;
}
.truth.on {
  border-color: var(--honey-deep);
  background: #fff6dd;
}
.truth:focus-within {
  box-shadow: var(--focus);
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
}
input[type='text'],
input[type='number'],
textarea {
  width: 100%;
  padding: 8px 12px;
  border-radius: 12px;
  border: 2px solid var(--line);
  background: #fff;
  font: inherit;
  color: inherit;
}
input[type='number'] {
  width: 80px;
}
.soft {
  color: var(--ink-soft);
  font-weight: 400;
}
.msg {
  margin: 0;
  padding: 8px 12px;
  border-radius: 12px;
}
.msg.ok {
  background: #e7f5e1;
}
.msg.error {
  background: #fdf0f1;
}
h3 {
  margin: 0 0 8px;
  font-size: 1.05rem;
}
.list,
.steps {
  margin: 0 0 16px;
  padding-left: 1.2em;
  display: grid;
  gap: 6px;
  font-size: 0.92rem;
}
.list {
  list-style: none;
  padding: 0;
}
.list li {
  display: grid;
}
code {
  padding: 0 4px;
  border-radius: 6px;
  background: var(--paper-2);
}
@media (max-width: 720px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
