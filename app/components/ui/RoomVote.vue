<script setup lang="ts">
import { LABELS, LABEL_ORDER, LEAN_CHOICES } from '~/utils/content'
import { useGame } from '~/stores/game'

/*
 * Workshop mode: the facilitator tallies the room's show of hands. The first vote uses the
 * first-impression choices; the final vote uses the same "How was it made?" labels as the board.
 */
const props = defineProps<{ which: 'roomFirst' | 'roomFinal', title: string }>()
const game = useGame()
const votes = computed(() => game.record[props.which])
const options = computed(() => props.which === 'roomFirst'
  ? LEAN_CHOICES.map(c => ({ id: c.id as string, text: c.short }))
  : LABEL_ORDER.map(l => ({ id: l as string, text: LABELS[l].name })))
</script>

<template>
  <fieldset class="room">
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
</style>
