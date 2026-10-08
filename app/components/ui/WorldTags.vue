<script setup lang="ts">
import { isVillager } from '~/utils/content'
import { PLACES } from '~/utils/world'
import { useGame } from '~/stores/game'

/* Name tags over each villager and tool. The scene moves them every frame (see GameScene). */
const game = useGame()
const visited = computed(() => [...game.record.talked, ...game.record.checked] as string[])
const kind = (id: string) => (isVillager(id) ? 'person' : id === 'board' ? 'board' : 'tool')
</script>

<template>
  <div class="tags" :class="{ hidden: !game.started || !!game.dialog }" aria-hidden="true">
    <div
      v-for="p in PLACES"
      :id="`tag-${p.id}`"
      :key="p.id"
      class="tag-pill"
      :class="[kind(p.id), { done: game.step === 'investigate' && visited.includes(p.id) }]"
      @click="game.goto = p.id"
    >
      {{ p.label }}
      <span v-if="game.step === 'investigate' && visited.includes(p.id)" class="tick">✓</span>
    </div>
  </div>
</template>

<style scoped>
.tags {
  position: fixed;
  inset: 0;
  pointer-events: none;
  transition: opacity 300ms;
}
.tags.hidden {
  opacity: 0;
}
.tags.hidden .tag-pill {
  pointer-events: none;
}
.tag-pill {
  position: absolute;
  left: 0;
  top: 0;
  padding: 2px 10px 3px;
  border-radius: 999px;
  background: rgba(255, 250, 240, 0.92);
  border: 2px solid var(--line);
  box-shadow: 0 3px 8px -3px rgba(120, 80, 40, 0.35);
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: auto;
  cursor: pointer;
  will-change: transform;
  transition: opacity 200ms;
}
.tag-pill.person {
  border-color: #b9dfae;
}
.tag-pill.tool {
  border-color: #b9dcea;
}
.tag-pill.board {
  background: var(--honey);
  border-color: var(--honey-deep);
  color: #4a2c14;
}
.tag-pill.done {
  opacity: 0.7;
}
.tick {
  color: var(--leaf-deep);
}
</style>
