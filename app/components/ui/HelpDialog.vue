<script setup lang="ts">
import { CHECKS, VILLAGERS } from '~/utils/content'
import { useGame } from '~/stores/game'

const game = useGame()
</script>

<template>
  <UiDialog title="How to play" @close="game.close()">
    <h3>The four steps</h3>
    <p>
      <strong>Notice</strong> your first impression, <strong>Discuss</strong> with the villagers,
      <strong>Check</strong> with the harbour tools, then <strong>Reflect</strong> at the noticeboard.
      The honey diamonds show where you haven't been yet.
    </p>
    <h3>Villagers</h3>
    <ul>
      <li v-for="v in VILLAGERS" :key="v.id">
        <strong>{{ v.name }}</strong>, {{ v.role }}: {{ v.eye }}.
      </li>
    </ul>
    <h3>Checks</h3>
    <ul>
      <li v-for="c in CHECKS" :key="c.id">
        <strong>{{ c.name }}</strong> at {{ c.place }}. {{ c.realWorld }}.
      </li>
    </ul>
    <h3>Trust</h3>
    <p>
      Right answers grow the trust garden by the board. Close answers grow it a little. “Still unsure” after a proper look
      is honest and earns a bloom. Confident wrong answers wilt flowers, and rushing to share makes it worse.
    </p>
    <h3>Controls</h3>
    <p>
      Tap or click a tile to hop there. Tap a building or villager to walk over and use it.
      Keys: <span class="kbd">Q</span> <span class="kbd">W</span> <span class="kbd">E</span> <span class="kbd">A</span> <span class="kbd">S</span> <span class="kbd">D</span>
      or arrows to move, <span class="kbd">Space</span> or <span class="kbd">Enter</span> to use.
    </p>
  </UiDialog>
</template>

<style scoped>
h3 {
  margin: 14px 0 6px;
  font-size: 1.05rem;
}
h3:first-child {
  margin-top: 0;
}
p,
li {
  line-height: 1.5;
}
p {
  margin: 0;
}
ul {
  margin: 0;
  padding-left: 1.2em;
}
</style>
