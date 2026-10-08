<script setup lang="ts">
import { sfx } from '~/audio/sfx'

/*
 * Wax seal: hold to warm the wax over the candle, standing in for checking content
 * credentials. Let go and it cools a little. When it's warm enough, the post office
 * stamp shows whether a seal is there.
 */
const emit = defineEmits<{ done: [] }>()
const heat = ref(0)
const holding = ref(false)
const stamped = ref(false)
let raf = 0
let last = performance.now()

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  if (!stamped.value) {
    heat.value = Math.max(0, Math.min(1, heat.value + (holding.value ? dt * 0.65 : -dt * 0.25)))
    if (heat.value >= 1) {
      stamped.value = true
      holding.value = false
      sfx.stamp()
      setTimeout(() => emit('done'), 900)
    }
  }
  raf = requestAnimationFrame(frame)
}
onMounted(() => (raf = requestAnimationFrame(frame)))
onBeforeUnmount(() => cancelAnimationFrame(raf))

function start(ev: Event) {
  ev.preventDefault()
  holding.value = true
}
function stop() {
  holding.value = false
}
function onKey(ev: KeyboardEvent) {
  if (ev.key === ' ' || ev.key === 'Enter') {
    ev.preventDefault()
    if (ev.type === 'keydown') holding.value = true
    else holding.value = false
  }
}
</script>

<template>
  <div class="seal">
    <svg viewBox="0 0 300 180" aria-hidden="true" class="scene">
      <rect x="40" y="16" width="220" height="110" rx="10" fill="#fffaf0" stroke="#f0dcc0" stroke-width="3" />
      <path d="M40 22l110 62 110-62" fill="none" stroke="#f0dcc0" stroke-width="3" />
      <g transform="translate(150 84)">
        <circle :r="18 + heat * 12" :fill="stamped ? '#e8e2d6' : '#d1495b'" :opacity="stamped ? 1 : 0.35 + heat * 0.65" />
        <circle v-if="!stamped" :r="10 + heat * 6" fill="#ff8f8f" :opacity="heat" />
        <text v-if="stamped" text-anchor="middle" y="6" font-size="15" font-weight="700" fill="#8a6a52" font-family="Fredoka, sans-serif">none</text>
      </g>
      <g transform="translate(150 150)">
        <rect x="-8" y="6" width="16" height="22" rx="3" fill="#fff3dc" stroke="#f0dcc0" stroke-width="2" />
        <line x1="0" y1="6" x2="0" y2="1" stroke="#5b3a24" stroke-width="1.5" />
        <path d="M0 2c6 -6 4 -12 0 -18c-4 6 -6 12 0 18z" fill="#ffb627" class="flame" :opacity="holding ? 1 : 0.35" />
      </g>
    </svg>
    <div class="meter" role="progressbar" aria-label="Wax warmth" :aria-valuenow="Math.round(heat * 100)" aria-valuemin="0" aria-valuemax="100">
      <div class="fill" :style="{ width: `${heat * 100}%` }" />
    </div>
    <button
      class="big-btn"
      :disabled="stamped"
      @pointerdown="start"
      @pointerup="stop"
      @pointerleave="stop"
      @pointercancel="stop"
      @keydown="onKey"
      @keyup="onKey"
      @contextmenu.prevent
    >
      {{ stamped ? 'Stamped!' : holding ? 'Warming…' : 'Hold to warm the wax' }}
    </button>
  </div>
</template>

<style scoped>
.seal {
  display: grid;
  gap: 10px;
  justify-items: start;
}
.scene {
  width: 100%;
  max-width: 340px;
}
.flame {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: flicker 0.3s ease-in-out infinite alternate;
}
@keyframes flicker {
  to {
    transform: scaleY(1.15) scaleX(0.9);
  }
}
.meter {
  width: 100%;
  max-width: 340px;
  height: 14px;
  border-radius: 999px;
  background: var(--paper-2);
  border: 2px solid var(--line);
  overflow: hidden;
}
.fill {
  height: 100%;
  background: linear-gradient(90deg, var(--honey), var(--berry));
}
.big-btn {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
</style>
