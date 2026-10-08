<script setup lang="ts">
import { sfx } from '~/audio/sfx'
import { LEAN_CHOICES, type Lean, pictureUrl } from '~/utils/content'
import { type Pebble, useGame } from '~/stores/game'

const game = useGame()
const pic = computed(() => game.picture)
const pebbles = ref<Pebble[]>([...game.record.pebbles])
const lean = ref<Lean | null>(game.record.firstLean)
const MAX = 3

function drop(ev: MouseEvent) {
  const el = ev.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  if (pebbles.value.length >= MAX) pebbles.value.shift()
  pebbles.value.push({ x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height })
  sfx.pebble()
}
function lift(i: number) {
  pebbles.value.splice(i, 1)
}

const OPTIONS = LEAN_CHOICES
</script>

<template>
  <UiDialog kicker="Step 1 · Notice" title="A new picture!" wide @close="game.close()">
    <div class="layout">
      <div class="pic-col">
        <div class="picture-frame">
          <div class="drop" role="presentation" @click="drop">
            <img :src="pictureUrl(pic.src)" :alt="`The picture that arrived. Its caption says: ${pic.claim}`" draggable="false">
            <button
              v-for="(p, i) in pebbles"
              :key="i"
              class="pebble"
              :style="{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }"
              :aria-label="`Remove hunch pebble ${i + 1}`"
              @click.stop="lift(i)"
            >
              {{ i + 1 }}
            </button>
          </div>
        </div>
        <p class="tip">
          Tap the picture to drop up to {{ MAX }} <strong>hunch pebbles</strong> on whatever catches your eye. Tap a pebble to lift it.
        </p>
      </div>
      <div class="side">
        <p class="arrival">
          {{ pic.arrival }}
        </p>
        <p class="claim">
          “{{ pic.claim }}”
        </p>
        <h3>What shapes your first impression of how this was made?</h3>
        <p class="soft">
          No looking anything up yet. Your gut feeling is worth writing down, even if it changes later.
        </p>
        <div class="choices" role="radiogroup" aria-label="First impression">
          <button
            v-for="o in OPTIONS"
            :key="o.id"
            role="radio"
            :aria-checked="lean === o.id"
            class="choice"
            :class="[o.id, { on: lean === o.id }]"
            @click="lean = o.id"
          >
            {{ o.text }}
          </button>
        </div>
        <RoomVote v-if="game.workshop" which="roomFirst" title="Room's first impressions (show of hands)" />
      </div>
    </div>
    <template #footer>
      <span class="soft small">{{ pebbles.length }} / {{ MAX }} pebbles</span>
      <button class="big-btn" :disabled="!lean" @click="lean && game.setFirstImpression(lean, pebbles)">
        Pin my first impression
      </button>
    </template>
  </UiDialog>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}
.drop {
  position: relative;
  width: fit-content;
  margin: 0 auto;
  cursor: crosshair;
}
.drop img {
  max-height: min(56vh, 520px);
  margin: 0 auto;
  user-select: none;
}
.pebble {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 3px solid #fff;
  background: radial-gradient(circle at 35% 30%, #fff1c2, var(--honey) 60%, var(--honey-deep));
  box-shadow: 0 3px 8px rgba(60, 30, 0, 0.45);
  font-weight: 700;
  font-size: 0.9rem;
  color: #4a2c14;
  line-height: 1;
  animation: plop 260ms var(--ease);
}
@keyframes plop {
  from {
    transform: translate(-50%, -90%) scale(0.4);
  }
}
.tip {
  margin: 10px 2px 0;
  font-size: 0.9rem;
  color: var(--ink-soft);
}
.arrival {
  margin: 0 0 8px;
  color: var(--ink-soft);
}
.claim {
  margin: 0 0 16px;
}
h3 {
  margin: 0 0 4px;
  font-size: 1.1rem;
}
.soft {
  color: var(--ink-soft);
  margin: 0 0 12px;
  font-size: 0.92rem;
}
.small {
  margin: 0 auto 0 0;
}
.choices {
  display: grid;
  gap: 8px;
}
.choice {
  min-height: 50px;
  border-radius: 16px;
  border: 2px solid var(--line);
  background: #fff;
  font-weight: 600;
  text-align: left;
  padding: 0 16px;
  transition: transform var(--dur) var(--ease), background var(--dur), border-color var(--dur);
}
.choice:hover {
  transform: translateX(3px);
}
.choice.on.camera {
  background: #eef8fc;
  border-color: var(--camera);
  color: var(--camera);
}
.choice.on.drawn {
  background: #f7f2fd;
  border-color: #8a6a9e;
  color: #6b4d80;
}
.choice.on.ai {
  background: #fdf0f1;
  border-color: var(--ai);
  color: var(--ai);
}
.choice.on.unsure {
  background: #fff8e3;
  border-color: var(--unsure);
  color: var(--unsure);
}
@media (max-width: 700px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .drop img {
    max-height: 40vh;
  }
}
</style>
