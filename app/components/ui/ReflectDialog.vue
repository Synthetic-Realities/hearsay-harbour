<script setup lang="ts">
import { CHECKS, LABELS, LABEL_ORDER, LEAN_WORDS, type Label, VILLAGERS, pictureUrl } from '~/utils/content'
import { type Caption, useGame } from '~/stores/game'

const game = useGame()
const pic = computed(() => game.picture)
const rec = computed(() => game.record)
const label = ref<Label | null>(null)
const caption = ref<Caption | null>(null)

const ORDER: Label[] = LABEL_ORDER

// Once it's decided how it was made, glide down to the second question (handy on TVs and phones).
const part2 = ref<HTMLElement>()
watch(() => (game.workshop ? null : label.value), (l) => {
  if (l) nextTick(() => part2.value?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
})

/*
 * Workshop mode: the room's final show of hands decides how it was made. The label with the
 * most hands is pinned; a tie pins "Still unsure", because the room is genuinely split.
 */
const roomCounts = computed(() => ORDER.map(l => ({ id: l, n: game.record.roomFinal[l] ?? 0 })))
const roomTop = computed(() => Math.max(...roomCounts.value.map(c => c.n)))
const roomTied = computed(() => roomTop.value > 0 && roomCounts.value.filter(c => c.n === roomTop.value).length > 1)
const roomLead = computed<Label | null>(() => {
  if (roomTop.value <= 0) return null
  return roomTied.value ? 'unsure' : roomCounts.value.find(c => c.n === roomTop.value)!.id
})
const pinned = computed(() => (game.workshop ? roomLead.value : label.value))

const checkedNames = computed(() => {
  const bits = [
    ...rec.value.checked.map(c => CHECKS[c].name.toLowerCase()),
    ...(rec.value.talked.length ? [`asked ${rec.value.talked.map(v => VILLAGERS[v].name).join(' & ')}`] : []),
  ]
  return bits.length ? bits.join(', ') : 'nothing yet'
})

const captions = computed(() => {
  const l = pinned.value
  const name = l ? LABELS[l].name : '…'
  const careful = l === 'unsure'
    ? `Not sure how this was made yet. Here's what I found: ${checkedNames.value}. Treat with care.`
    : `${name}, I think. What I checked: ${checkedNames.value}.`
  return [
    { id: 'over' as const, text: `100% ${name.toUpperCase()}!!! Share before they delete it!!` },
    { id: 'careful' as const, text: careful },
    { id: 'shrug' as const, text: 'lol who cares, it\'s just a picture' },
  ]
})
</script>

<template>
  <UiDialog kicker="Step 4 · Reflect" title="What will you pin up?" wide @close="game.close()">
    <div class="layout">
      <aside class="notes">
        <img class="thumb" :src="pictureUrl(pic.src)" alt="" draggable="false">
        <p class="claim">
          “{{ pic.claim }}”
        </p>
        <h3>Your findings</h3>
        <ul>
          <li>
            First impression:
            <span class="tag" :class="rec.firstLean ?? 'unsure'">{{ LEAN_WORDS[rec.firstLean ?? 'unsure'] }}</span>
          </li>
          <li v-for="v in rec.talked" :key="v">
            {{ VILLAGERS[v].name }}:
            <span class="tag" :class="pic.takes[v].lean">{{ LEAN_WORDS[pic.takes[v].lean] }}</span>
          </li>
          <li v-for="c in rec.checked" :key="c">
            {{ CHECKS[c].name }}: <em>{{ pic.checks[c].headline }}</em>
          </li>
        </ul>
        <div v-if="game.evidenceCount < 2" class="light">
          <p>Your satchel is light. There's no rush. The checks are still there.</p>
          <button class="big-btn quiet" @click="game.close()">
            Keep looking
          </button>
        </div>
      </aside>
      <div class="decide">
        <h3>How was it made?</h3>
        <RoomVote v-if="game.workshop" which="roomFinal" title="Room's final vote (show of hands)" class="room-main" />
        <p v-if="game.workshop" class="room-note">
          {{ !roomLead ? 'Count the hands for each choice. The room\'s top choice is pinned.' : roomTied ? 'It\'s a tie, so the room\'s answer is pinned as "Still unsure".' : 'The room\'s top choice is pinned.' }}
        </p>
        <div class="labels" :class="{ room: game.workshop }" role="radiogroup" aria-label="How was it made?" :aria-disabled="game.workshop">
          <button
            v-for="l in ORDER"
            :key="l"
            role="radio"
            :aria-checked="pinned === l"
            class="opt"
            :class="[l, { on: pinned === l }]"
            :disabled="game.workshop"
            @click="label = l"
          >
            <strong>{{ LABELS[l].name }}</strong>
            <span>{{ LABELS[l].blurb }}</span>
          </button>
        </div>
        <h3 ref="part2">How would you describe it when you share it?</h3>
        <div class="captions" role="radiogroup" aria-label="Caption">
          <button
            v-for="c in captions"
            :key="c.id"
            role="radio"
            :aria-checked="caption === c.id"
            class="opt cap hand"
            :class="{ on: caption === c.id }"
            :disabled="!pinned"
            @click="caption = c.id"
          >
            {{ c.text }}
          </button>
        </div>
      </div>
    </div>
    <template #footer>
      <button class="big-btn" data-continue :disabled="!pinned || !caption" @click="pinned && caption && game.pin(pinned, caption)">
        {{ game.workshop ? 'Pin the room\'s answer' : 'Pin it to the board' }}
      </button>
    </template>
  </UiDialog>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 22px;
}
.thumb {
  display: block;
  max-width: 100%;
  max-height: 180px;
  margin: 0 auto 10px;
  border-radius: 10px;
  border: 5px solid #fff;
  box-shadow: var(--shadow);
}
.claim {
  margin: 0 0 12px;
  font-size: 1rem;
}
h3 {
  margin: 4px 0 8px;
  font-size: 1.05rem;
}
ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
  font-size: 0.92rem;
}
.light {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 14px;
  background: #fff8e3;
}
.light p {
  margin: 0 0 8px;
  font-size: 0.92rem;
}
.labels,
.captions {
  display: grid;
  gap: 7px;
  margin-bottom: 16px;
}
.opt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 9px 14px;
  border-radius: 14px;
  border: 2px solid var(--line);
  background: #fff;
  text-align: left;
  transition: transform var(--dur) var(--ease), border-color var(--dur), background var(--dur);
}
.opt span {
  font-size: 0.85rem;
  color: var(--ink-soft);
}
.opt:hover:not(:disabled) {
  transform: translateX(3px);
}
.opt:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.room-main {
  margin: 0 0 6px;
}
.room-note {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
/* In workshop mode the room decides: the single labels only show what gets pinned. */
.labels.room .opt:disabled {
  cursor: default;
}
.labels.room .opt.on:disabled {
  opacity: 1;
}
.labels.room .opt:not(.on):disabled {
  opacity: 0.45;
}
.opt.on {
  border-color: var(--honey-deep);
  background: #fff6dd;
}
.opt.on.camera,
.opt.on.edited {
  border-color: var(--camera);
  background: #eef8fc;
}
.opt.on.drawn {
  border-color: #8a6a9e;
  background: #f7f2fd;
}
.opt.on.ai,
.opt.on.assisted {
  border-color: var(--ai);
  background: #fdf0f1;
}
.opt.on.unsure {
  border-color: var(--unsure);
  background: #fff8e3;
}
.cap {
  font-size: 1.1rem;
}
@media (max-width: 720px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
