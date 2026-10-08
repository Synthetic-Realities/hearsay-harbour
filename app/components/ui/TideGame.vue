<script setup lang="ts">
import { sfx } from '~/audio/sfx'

/*
 * Tide search: a little fishing game standing in for reverse image search.
 * A float sweeps along the line; reel when it's over the ripple. Three catches pull
 * up the older copies. Misses cost nothing but a moment: it's a cozy game.
 */
const emit = defineEmits<{ done: [] }>()
const NEED = 3
const caught = ref(0)
const pos = ref(0)
const zone = ref(0.6)
const ZONE_W = 0.22
const msg = ref('Reel in when the float is over the ripple.')
const shake = ref(false)
let raf = 0
let t = Math.random() * 3
let last = performance.now()
const speed = () => 0.9 + caught.value * 0.25

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  t += dt * speed()
  pos.value = 0.5 + Math.sin(t) * 0.44
  raf = requestAnimationFrame(frame)
}
onMounted(() => (raf = requestAnimationFrame(frame)))
onBeforeUnmount(() => cancelAnimationFrame(raf))

function moveZone() {
  let z = zone.value
  while (Math.abs(z - zone.value) < 0.2) z = 0.1 + Math.random() * 0.8
  zone.value = z
}

function reel() {
  if (caught.value >= NEED) return
  if (Math.abs(pos.value - zone.value) < ZONE_W / 2) {
    caught.value++
    sfx.splash()
    msg.value = caught.value < NEED ? ['A bite! Keep going.', 'Something older is coming up…'][caught.value - 1]! : 'Got it!'
    if (caught.value >= NEED) setTimeout(() => emit('done'), 700)
    else moveZone()
  }
  else {
    sfx.reel()
    shake.value = true
    setTimeout(() => (shake.value = false), 300)
    msg.value = 'The line slackens. Try again, no rush.'
  }
}
</script>

<template>
  <div class="tide">
    <svg class="sea" viewBox="0 0 300 120" aria-hidden="true">
      <rect width="300" height="120" rx="16" fill="#8fd3e8" />
      <path d="M0 40q25-8 50 0t50 0 50 0 50 0 50 0 50 0" stroke="#bfe6f4" stroke-width="4" fill="none" />
      <path d="M0 80q25-8 50 0t50 0 50 0 50 0 50 0 50 0" stroke="#bfe6f4" stroke-width="3" fill="none" opacity="0.7" />
      <g :transform="`translate(${zone * 300} 64)`">
        <ellipse rx="34" ry="9" fill="none" stroke="#fffaf0" stroke-width="3" opacity="0.9" class="ripple" />
        <ellipse rx="20" ry="5" fill="none" stroke="#fffaf0" stroke-width="2.5" opacity="0.7" />
      </g>
      <g :transform="`translate(${pos * 300} 60)`">
        <g :class="{ shake }">
          <line x1="0" y1="-60" x2="0" y2="-10" stroke="#5b3a24" stroke-width="1.5" />
          <circle r="10" fill="#fff" />
          <path d="M-10 0a10 10 0 0 1 20 0z" fill="#d1495b" />
        </g>
      </g>
      <g v-for="n in caught" :key="n" :transform="`translate(${20 + (n - 1) * 30} 104)`">
        <rect x="-11" y="-8" width="22" height="16" rx="3" fill="#fffaf0" stroke="#c99a6b" stroke-width="1.5" />
      </g>
    </svg>
    <p class="msg hand" role="status">
      {{ msg }}
    </p>
    <button class="big-btn" :disabled="caught >= NEED" @click="reel">
      Reel in! ({{ caught }}/{{ NEED }})
    </button>
  </div>
</template>

<style scoped>
.tide {
  display: grid;
  gap: 8px;
  justify-items: start;
}
.sea {
  width: 100%;
  max-width: 360px;
  border-radius: 16px;
}
.ripple {
  animation: ripple 1.4s ease-in-out infinite;
  transform-origin: center;
  transform-box: fill-box;
}
@keyframes ripple {
  50% {
    transform: scale(1.12);
    opacity: 0.6;
  }
}
.shake {
  animation: shake 0.3s;
}
@keyframes shake {
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}
.msg {
  margin: 0;
  min-height: 1.6em;
}
</style>
