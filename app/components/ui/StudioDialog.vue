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
  try {
    const res = await $fetch<{ file: string }>('/api/inbox', { method: 'POST', body: form })
    message.value = { kind: 'ok', text: `Saved ${res.file} to content-inbox.` }
    file.value = null
    preview.value = ''
    claim.value = ''
    source.value = ''
    madeWith.value = ''
    notes.value = ''
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
        </fieldset>

        <div class="row">
          <label for="studio-level">Level</label>
          <input id="studio-level" v-model.number="level" type="number" min="1" max="9">
        </div>
        <label for="studio-claim">Caption it was shared with <span class="soft">(optional)</span></label>
        <input id="studio-claim" v-model="claim" type="text" placeholder="e.g. Huge flood in town this morning!">
        <label for="studio-made">Made with <span class="soft">(shown to players at the reveal)</span></label>
        <input id="studio-made" v-model="madeWith" type="text" placeholder="e.g. ChatGPT (OpenAI image generation); or: phone camera, Dr Sam Martin">
        <label for="studio-source">Where it really came from <span class="soft">(the import uses only this for the checks)</span></label>
        <textarea id="studio-source" v-model="source" rows="2" placeholder="e.g. Generated with an image tool for the workshop, 2026; or: my own phone photo, Bristol, 2019" />
        <label for="studio-notes">Notes for the import <span class="soft">(optional)</span></label>
        <textarea id="studio-notes" v-model="notes" rows="2" placeholder="e.g. Point out the warped railings on the left; this is a hard one" />

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
