<script setup lang="ts">
import { sfx } from '~/audio/sfx'
import { CHECKS, type CheckId, LEAN_WORDS, pictureUrl } from '~/utils/content'
import { useGame } from '~/stores/game'

const props = defineProps<{ id: CheckId }>()
const game = useGame()
const info = computed(() => CHECKS[props.id])
const finding = computed(() => game.picture.checks[props.id])
// Already checked this picture? Skip straight to what you found.
const done = ref(game.record.checked.includes(props.id))

function finish() {
  done.value = true
  game.checked(props.id)
  sfx.chime()
}

const STRENGTH = {
  strong: { text: 'Strong evidence', dots: 3 },
  some: { text: 'Some evidence', dots: 2 },
  none: { text: 'Doesn\'t settle it: you decide', dots: 0 },
}
</script>

<template>
  <UiDialog kicker="Step 3 · Check" :title="info.name" @close="game.close()">
    <p class="real">
      <strong>In real life:</strong> {{ info.realWorld }}.
    </p>
    <div class="row">
      <img class="thumb" :src="pictureUrl(game.picture.src)" alt="" draggable="false">
      <div class="game">
        <TideGame v-if="id === 'tide' && !done" @done="finish" />
        <SealGame v-else-if="id === 'seal' && !done" @done="finish" />
        <CrateGame v-else-if="id === 'crate' && !done" @done="finish" />
        <div v-else class="finding" role="status">
          <p class="headline">
            {{ finding.headline }}
          </p>
          <p class="body">
            {{ finding.body }}
          </p>
          <div class="meta">
            <span class="strength" :class="finding.strength">
              <span v-for="n in 3" :key="n" class="dot" :class="{ on: n <= STRENGTH[finding.strength].dots }" />
              {{ STRENGTH[finding.strength].text }}
            </span>
            <span v-if="finding.points" class="tag" :class="finding.points">{{ LEAN_WORDS[finding.points] }}</span>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <button class="big-btn" data-continue :class="{ quiet: !done }" @click="game.close()">
        {{ done ? 'Into the satchel' : 'Maybe later' }}
      </button>
    </template>
  </UiDialog>
</template>

<style scoped>
.real {
  margin: 0 0 14px;
  padding: 8px 12px;
  border-radius: 12px;
  background: #eef8fc;
  font-size: 0.92rem;
}
.row {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 16px;
  align-items: start;
}
.thumb {
  width: 96px;
  border-radius: 10px;
  border: 4px solid #fff;
  box-shadow: var(--shadow);
  transform: rotate(-3deg);
}
.finding {
  animation: unfold 380ms var(--ease);
}
@keyframes unfold {
  from {
    transform: translateY(10px) scale(0.97);
    opacity: 0;
  }
}
.headline {
  margin: 0 0 6px;
  font-size: 1.25rem;
  font-weight: 700;
}
.body {
  margin: 0 0 12px;
  line-height: 1.45;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.strength {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ink-soft);
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--line);
}
.dot.on {
  background: var(--leaf);
}
@media (max-width: 520px) {
  .row {
    grid-template-columns: 1fr;
  }
  .thumb {
    width: 80px;
  }
}
</style>
