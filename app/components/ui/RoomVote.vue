<script setup lang="ts">
import { LABELS, LABEL_ORDER, LEAN_CHOICES } from '~/utils/content'
import { useGame } from '~/stores/game'
import { isTvBrowser } from '~/utils/device'

/*
 * Workshop mode: the facilitator tallies the room's show of hands. The first vote uses the
 * first-impression choices; the final vote uses the same "How was it made?" labels as the board.
 *
 * On a smart TV (or in arcade mode) the small − + counters become big tiles: each OK press or
 * tap on a tile adds one hand, and Undo takes back the last one.
 */
const props = defineProps<{ which: 'roomFirst' | 'roomFinal', title: string }>()
const game = useGame()
const votes = computed(() => game.record[props.which])
const options = computed(() => props.which === 'roomFirst'
  ? LEAN_CHOICES.map(c => ({ id: c.id as string, text: c.short }))
  : LABEL_ORDER.map(l => ({ id: l as string, text: LABELS[l].name })))

const tv = isTvBrowser()
const tiles = computed(() => game.arcade || tv)
// "Play together" on a TV: a friendlier heading than the workshop's.
const heading = computed(() => (tv ? (props.which === 'roomFirst' ? 'Hands up! First impressions' : 'Hands up! How was it made?') : props.title))
const total = computed(() => options.value.reduce((n, o) => n + (votes.value[o.id] ?? 0), 0))
/* The hands added on this picture, newest last, so Undo can take back the last one. */
const key = computed(() => `${game.packId}:${game.index}:${props.which}`)
const added = computed(() => (HISTORY.get(key.value) ?? []).filter(id => (votes.value[id] ?? 0) > 0))
function add(id: string) {
  // A fresh count (a new day reuses the same picture numbers) starts a fresh history.
  const before = total.value ? HISTORY.get(key.value) ?? [] : []
  game.vote(props.which, id, 1)
  HISTORY.set(key.value, [...before, id])
}
function undo() {
  const list = [...added.value]
  const id = list.pop()
  if (!id) return
  game.vote(props.which, id, -1)
  HISTORY.set(key.value, list)
}
/* Holding OK down would count the same hand over and over. */
function once(ev: KeyboardEvent) {
  if (ev.repeat) ev.preventDefault()
}
</script>

<script lang="ts">
/* Kept for the session, so reopening the window still lets Undo take back a hand. */
const HISTORY = reactive(new Map<string, string[]>())
</script>

<template>
  <fieldset v-if="tiles" class="room tv">
    <legend><UiIcon name="people" /> {{ heading }}</legend>
    <p class="how">
      Press a tile once for each hand that goes up.
    </p>
    <div class="tiles" :data-n="options.length">
      <button
        v-for="o in options"
        :key="o.id"
        type="button"
        class="tile"
        :class="o.id"
        :aria-label="`${o.text}: ${votes[o.id] ?? 0} ${votes[o.id] === 1 ? 'hand' : 'hands'}. Press to add one.`"
        @keydown.enter="once"
        @click="add(o.id)"
      >
        <span class="name">{{ o.text }}</span>
        <output>{{ votes[o.id] ?? 0 }}</output>
      </button>
    </div>
    <p class="total" aria-live="polite">
      {{ total }} {{ total === 1 ? 'hand' : 'hands' }} counted
    </p>
    <button type="button" class="undo" :disabled="!added.length" @keydown.enter="once" @click="undo">
      ↶ Undo the last hand
    </button>
  </fieldset>
  <fieldset v-else class="room">
    <legend><UiIcon name="people" /> {{ title }}</legend>
    <div class="row">
      <div v-for="o in options" :key="o.id" class="counter" :class="o.id">
        <span class="name">{{ o.text }}</span>
        <button :aria-label="`One fewer for ${o.text}`" @click="game.vote(which, o.id, -1)">
          −
        </button>
        <output :aria-label="`${o.text} votes`">{{ votes[o.id] ?? 0 }}</output>
        <button :aria-label="`One more for ${o.text}`" @click="game.vote(which, o.id, 1)">
          +
        </button>
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.room {
  margin: 14px 0 0;
  padding: 10px 12px 12px;
  border: 2px dashed var(--lilac);
  border-radius: 16px;
  background: #f7f2fd;
}
legend {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px;
  font-weight: 600;
  font-size: 0.9rem;
  color: #4b3470;
}
legend svg {
  width: 18px;
  height: 18px;
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.counter {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px 4px 10px;
  border-radius: 999px;
  background: #fff;
  border: 2px solid var(--line);
}
.name {
  font-weight: 600;
  font-size: 0.85rem;
  margin-right: 2px;
}
.camera .name,
.edited .name {
  color: var(--camera);
}
.drawn .name {
  color: #7a5a92;
}
.ai .name,
.assisted .name {
  color: var(--ai);
}
.unsure .name {
  color: var(--unsure);
}
.counter button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--paper-2);
  font-weight: 700;
  font-size: 1.1rem;
  line-height: 1;
}
output {
  min-width: 1.6em;
  text-align: center;
  font-weight: 700;
}

/* TV tiles: big enough to aim at with a remote from the sofa. */
.how {
  margin: 0 0 8px;
  font-size: 0.9rem;
  color: var(--ink-soft);
}
.tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
/* An odd one out takes the whole row, so the arrows always have a tile straight below. */
.tile:last-child:nth-child(odd) {
  grid-column: 1 / -1;
}
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 92px;
  padding: 8px 6px;
  border-radius: 18px;
  border: 3px solid var(--line);
  background: #fff;
  line-height: 1.15;
}
.tile .name {
  margin: 0;
  font-size: 0.95rem;
  text-align: center;
}
.tile output {
  font-size: 2.1rem;
  line-height: 1;
}
.tile:active {
  transform: scale(0.96);
}
.total {
  margin: 10px 0 8px;
  text-align: center;
  font-weight: 700;
  font-size: 1.05rem;
  color: #4b3470;
}
.undo {
  width: 100%;
  min-height: 56px;
  padding: 0 22px;
  border-radius: 999px;
  border: 2px solid var(--lilac);
  background: #fff;
  font-weight: 700;
  font-size: 1.05rem;
  color: #4b3470;
}
.undo:disabled {
  opacity: 0.45;
}
</style>
