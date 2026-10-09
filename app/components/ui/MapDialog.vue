<script setup lang="ts">
import { PLACES, type PlaceId } from '~/utils/world'
import { useGame } from '~/stores/game'

const game = useGame()
// Walk straight to any place: handy with a TV remote or arcade stick, where tapping the island isn't possible.
const canTravel = computed(() => game.started && (game.step === 'investigate' || game.step === 'notice'))
function travel(id: PlaceId) {
  game.close()
  game.goto = id
}
</script>

<template>
  <UiDialog kicker="Hearsay Harbour" title="Island map" @close="game.close()">
    <IslandMap :you="game.pos" />
    <nav v-if="canTravel" class="travel" aria-label="Go to a place">
      <span class="soft">Go to:</span>
      <button v-for="p in PLACES" :key="p.id" type="button" class="go" @click="travel(p.id)">
        {{ p.label }}
      </button>
    </nav>
    <ul class="legend">
      <li><span class="sw you" /> You</li>
      <li><span class="sw home" /> Noticeboard: start and finish each picture here</li>
      <li><span class="sw person" /> Villagers to ask</li>
      <li><span class="sw tool" /> Tools for checking</li>
    </ul>
    <template #footer>
      <button class="big-btn quiet" @click="game.open({ kind: 'guide', page: 0 })">
        Open the welcome guide
      </button>
      <button autofocus class="big-btn" @click="game.close()">
        Back to the island
      </button>
    </template>
  </UiDialog>
</template>

<style scoped>
.travel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 12px 0 0;
}
.soft {
  color: var(--ink-soft);
  font-weight: 600;
  font-size: 0.9rem;
}
.go {
  padding: 6px 12px;
  border-radius: 999px;
  border: 2px solid var(--line);
  background: #fff;
  font-weight: 600;
  font-size: 0.9rem;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.9rem;
}
.legend li {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sw {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px var(--line);
}
.you {
  background: #3d3a4b;
}
.home {
  background: var(--honey);
}
.person {
  background: #7fbf7a;
}
.tool {
  background: #6fb7ea;
}
</style>
