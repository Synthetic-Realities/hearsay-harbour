<script setup lang="ts">
import { PACKS, pictureUrl } from '~/utils/content'
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
/*
 * Where the picture goes: a brand-new level, an existing level, or in place of a picture that's
 * already in a level. The import makes the change (and keeps a copy of anything it replaces).
 */
const mode = ref<'new' | 'add' | 'replace'>('new')
const level = ref(Math.max(...PACKS.map(p => p.level)) + 1)
const levelTitle = ref('')
const levelBlurb = ref('')
const packId = ref(PACKS[0]?.id ?? '')
const replaces = ref('')
const pack = computed(() => PACKS.find(p => p.id === packId.value))
const replacedPic = computed(() => pack.value?.pictures.find(p => p.id === replaces.value))
watch(packId, () => (replaces.value = ''))

/*
 * Second opinions (as in SDA Vision): when you don't know how a picture was made, ask Gemini
 * (which can check Google's SynthID watermark) or OpenAI's image verifier, then paste the reply.
 * They're evidence for you to weigh, not a verdict.
 */
const geminiReply = ref('')
const openaiReply = ref('')
const soToast = ref('')
const soPrompt = computed(() =>
  'I am checking whether a media file may be AI-generated or AI-edited for research. '
  + 'Please give your honest assessment of how synthetic it looks and why, naming the key tells, '
  + 'and note any content-provenance or watermark signal you can see. '
  + 'Keep it brief: one short paragraph, no more than about 80 words. End with a one-line assessment '
  + '(for example: likely synthetic / partly edited / likely authentic) and your confidence. '
  + 'Treat this as one evidence signal for a human to weigh, not a final verdict. '
  + `(File: ${file.value?.name ?? 'the attached image'})`)
async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(soPrompt.value)
    return true
  }
  catch {
    return false
  }
}
async function askGemini() {
  const ok = await copyPrompt()
  window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer')
  soToast.value = ok
    ? 'Prompt copied. Paste it into a fresh Gemini chat and attach your picture.'
    : 'Copying was blocked: copy the prompt below into Gemini, then attach your picture.'
}
function askOpenAI() {
  window.open('https://openai.com/research/verify/', '_blank', 'noopener,noreferrer')
  soToast.value = 'OpenAI Verify opened. Attach your picture there, review the check\'s coverage and details, then record the result below.'
}
async function copyOnly() {
  soToast.value = (await copyPrompt()) ? 'Prompt copied.' : 'Copying was blocked: select the prompt below and copy it.'
}
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
const aiStatus = ref<{ ready: boolean, provider: string, model: string, problem: string, auto?: boolean } | null>(null)
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
  const targetLevel = mode.value === 'new' ? level.value : (pack.value?.level ?? level.value)
  form.append('level', String(targetLevel))
  form.append('mode', mode.value)
  if (mode.value === 'new') {
    form.append('levelTitle', levelTitle.value)
    form.append('levelBlurb', levelBlurb.value)
  }
  else {
    form.append('packId', packId.value)
  }
  if (mode.value === 'replace') form.append('replaces', replaces.value)
  form.append('secondOpinionGemini', geminiReply.value)
  form.append('secondOpinionOpenAI', openaiReply.value)
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
    geminiReply.value = ''
    openaiReply.value = ''
    soToast.value = ''
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
          <span v-if="aiStatus?.ready" class="soft small">{{ aiStatus.provider }} · {{ aiStatus.model }}{{ aiStatus.auto ? ' (chosen for you)' : '' }}</span>
          <span v-else class="soft small">{{ aiStatus?.problem ?? 'Checking…' }}</span>
          <a class="setup-link" href="https://github.com/IntoTheDigital/hearsay-harbour#setting-up-ai-assist-step-by-step" target="_blank" rel="noopener">
            {{ aiStatus?.ready ? 'Setup guide' : 'How do I set this up?' }} <span aria-hidden="true">↗</span><span class="sr-only">(opens in a new tab)</span>
          </a>
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
          <details class="so" :open="truth === 'unknown'">
            <summary>Not sure how it was made? Get a second opinion</summary>
            <div class="so-grid">
              <button type="button" class="so-btn" :disabled="!file" @click="askGemini">
                <strong>Ask Gemini (SynthID) for a second opinion</strong>
                <span>Opens Gemini with a copied checking prompt. Attach your picture there, review the checker's stated coverage and record its reply.</span>
              </button>
              <button type="button" class="so-btn" :disabled="!file" @click="askOpenAI">
                <strong>Verify with OpenAI (images only)</strong>
                <span>OpenAI's external image check. Attach your picture on that page, review its stated coverage and result details, and record the response below.</span>
              </button>
            </div>
            <p v-if="soToast" class="soft small" role="status">
              {{ soToast }}
            </p>
            <div class="so-prompt">
              <label for="studio-so-prompt">Gemini checking prompt</label>
              <button type="button" class="again" @click="copyOnly">
                Copy prompt
              </button>
            </div>
            <textarea id="studio-so-prompt" readonly rows="3" :value="soPrompt" />
            <p class="soft small">
              You choose what to upload on the external site; its account settings and terms apply. Keep the stated check result and its coverage with the reply: a watermark checker only recognises its own company's marks, a general visual opinion covers appearance, and a no-match result leaves the origin open. Use a fresh chat for each picture.
            </p>
            <label for="studio-so-gemini">Gemini's reply</label>
            <textarea id="studio-so-gemini" v-model="geminiReply" rows="2" placeholder="Paste Gemini's reply, including what its check covered" />
            <label for="studio-so-openai">OpenAI Verify's result</label>
            <textarea id="studio-so-openai" v-model="openaiReply" rows="2" placeholder="Paste or describe the result and what it covered" />
          </details>
          <p v-if="aiGuess" class="guess">
            <strong>AI's hunch:</strong> {{ LABEL_NAMES[aiGuess.label] ?? aiGuess.label }} ({{ aiGuess.confidence }} confidence). {{ aiGuess.why }}
            <span class="soft">Only you know how it was really made, so you choose.</span>
          </p>
        </fieldset>

        <label for="studio-title">Title <span class="soft">(a short name)</span> <span v-if="aiFilled.has('title')" class="ai-badge">AI suggested</span></label>
        <input id="studio-title" v-model="title" type="text" placeholder="e.g. Flooded high street">

        <fieldset class="dest">
          <legend>Where should it go?</legend>
          <div class="truths">
            <label class="truth" :class="{ on: mode === 'new' }"><input v-model="mode" type="radio" name="mode" value="new" class="sr-only">A new level</label>
            <label class="truth" :class="{ on: mode === 'add' }"><input v-model="mode" type="radio" name="mode" value="add" class="sr-only">Add to an existing level</label>
            <label class="truth" :class="{ on: mode === 'replace' }"><input v-model="mode" type="radio" name="mode" value="replace" class="sr-only">Replace a picture</label>
          </div>
          <div v-if="mode === 'new'" class="dest-fields">
            <div class="row">
              <label for="studio-level">Level number</label>
              <input id="studio-level" v-model.number="level" type="number" min="1" max="20">
            </div>
            <label for="studio-level-title">Level name <span class="soft">(for a level that doesn't exist yet)</span></label>
            <input id="studio-level-title" v-model="levelTitle" type="text" placeholder="e.g. Harder harbour">
            <label for="studio-level-blurb">One-line description <span class="soft">(shown when choosing a level)</span></label>
            <input id="studio-level-blurb" v-model="levelBlurb" type="text" placeholder="e.g. Subtler pictures, convincing captions and villagers who disagree.">
          </div>
          <div v-else class="dest-fields">
            <label for="studio-pack">Level</label>
            <select id="studio-pack" v-model="packId">
              <option v-for="p in PACKS" :key="p.id" :value="p.id">
                Level {{ p.level }} · {{ p.title }} ({{ p.pictures.length }} pictures)
              </option>
            </select>
            <template v-if="mode === 'replace' && pack">
              <label for="studio-replaces">Picture to replace</label>
              <select id="studio-replaces" v-model="replaces">
                <option value="" disabled>
                  Choose a picture…
                </option>
                <option v-for="p in pack.pictures" :key="p.id" :value="p.id">
                  {{ p.title ?? p.id }}
                </option>
              </select>
              <div v-if="replacedPic" class="replacing">
                <img :src="pictureUrl(replacedPic.src)" alt="">
                <span>The new picture takes this one's place in the level. The import keeps a copy of the old picture and its text in <code>content-inbox/replaced/</code>, so nothing is lost.</span>
              </div>
            </template>
          </div>
        </fieldset>
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
        <button class="big-btn" type="submit" :disabled="!file || !truth || busy || (mode === 'replace' && !replaces)">
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
.dest-fields {
  display: grid;
  gap: 6px;
  margin-top: 8px;
}
select {
  width: 100%;
  padding: 8px 12px;
  border-radius: 12px;
  border: 2px solid var(--line);
  background: #fff;
  font: inherit;
  color: inherit;
}
.replacing {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border-radius: 12px;
  background: #fff8e3;
  font-size: 0.85rem;
  font-weight: 400;
}
.replacing img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
}
.so {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 14px;
  border: 2px solid #b9dcea;
  background: #f4fafc;
  font-weight: 400;
}
.so summary {
  cursor: pointer;
  font-weight: 700;
  color: var(--ai);
}
.so-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 10px 0 6px;
}
.so-btn {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 2px solid #b9dcea;
  background: #eaf6f9;
  text-align: left;
}
.so-btn span {
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.so-btn:disabled {
  opacity: 0.5;
}
.so-prompt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.so textarea,
.so label {
  margin-top: 4px;
}
.so label {
  display: block;
}
@media (max-width: 720px) {
  .so-grid {
    grid-template-columns: 1fr;
  }
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
.setup-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--sea-deep);
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
