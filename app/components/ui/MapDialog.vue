<script setup lang="ts">
import { useGame } from '~/stores/game'

const game = useGame()
</script>

<template>
  <UiDialog kicker="Hearsay Harbour" title="Island map" @close="game.close()">
    <IslandMap :you="game.pos" />
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
