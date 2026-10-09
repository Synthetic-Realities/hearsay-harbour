<script setup lang="ts">
import { sfx } from '~/audio/sfx'
import { useGame } from '~/stores/game'
import { isTvBrowser } from '~/utils/device'

/*
 * The end-of-day reward: a medal, a keeper's rank and three stars, one for each habit the
 * game teaches (getting it right, gathering evidence, not rushing). The village throws a
 * little festival on the island behind it.
 */
const game = useGame()
// Smart TVs call workshop mode "Play together".
const tv = isTvBrowser()
const pics = computed(() => game.pictures)
const recs = computed(() => game.records)

const correct = computed(() => recs.value.filter((r, i) => r.label === pics.value[i]!.truth).length)
const avgEvidence = computed(() => recs.value.reduce((n, r) => n + r.talked.length + r.checked.length, 0) / recs.value.length)
const rushed = computed(() => recs.value.filter(r => r.sharedEarly).length)

const stars = computed(() => [
  { name: 'Sharp eye', earned: correct.value >= Math.ceil(pics.value.length * 2 / 3), detail: `${correct.value} of ${pics.value.length} pinned exactly right` },
  { name: 'Thorough', earned: avgEvidence.value >= 3, detail: `${avgEvidence.value.toFixed(1)} pieces of evidence per picture` },
  { name: 'Patient', earned: rushed.value === 0, detail: rushed.value ? `Rushed by the gull ${rushed.value} time${rushed.value === 1 ? '' : 's'}` : 'Never rushed by the gull' },
])
const count = computed(() => stars.value.filter(s => s.earned).length)
const RANKS = [
  { title: 'Keeper in Training', medal: '#c8a27a', ribbon: '#9ad0f5', line: 'Every keeper starts somewhere. Play again and gather a bit more evidence each time.' },
  { title: 'Apprentice Keeper', medal: '#d9a46b', ribbon: '#7fbf7a', line: 'A good start. You\'re learning to look before you share.' },
  { title: 'Harbour Detective', medal: '#cfd6e2', ribbon: '#6fb7ea', line: 'Careful, curious and hard to fool. The village trusts your board.' },
  { title: 'Master Keeper of Hearsay Harbour', medal: '#ffcf4d', ribbon: '#d1495b', line: 'Notice, Discuss, Check, Reflect: you did all four, every time. The whole village is celebrating.' },
]
// In workshop mode the whole room earns the rank together.
const PLURAL = ['Keepers in Training', 'Apprentice Keepers', 'Harbour Detectives', 'Master Keepers of Hearsay Harbour']
const rank = computed(() => {
  const r = RANKS[count.value]!
  return game.workshop ? { ...r, title: PLURAL[count.value]! } : r
})

const name = computed({ get: () => game.keeperName, set: v => game.setKeeperName(v) })
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const CONFETTI = ['#ffb627', '#d1495b', '#6fb7ea', '#7fbf7a', '#c6b3e6', '#ffffff']
const bits = reduced ? [] : Array.from({ length: 70 }, (_, i) => ({
  left: Math.random() * 100,
  delay: Math.random() * 1.2,
  dur: 2.4 + Math.random() * 1.8,
  color: CONFETTI[i % CONFETTI.length],
  rot: Math.random() * 360,
  w: 6 + Math.random() * 6,
}))

onMounted(() => {
  sfx.good()
  setTimeout(() => sfx.chime(), 500)
  game.say(`Day complete. You earned ${count.value} of 3 stars: ${rank.value.title}.`)
})
</script>

<template>
  <UiDialog kicker="Dusk at the harbour · Day complete" :title="rank.title" wide @close="game.open({ kind: 'recap' })">
    <div class="confetti" aria-hidden="true">
      <span
        v-for="(b, i) in bits"
        :key="i"
        :style="{ left: `${b.left}%`, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, background: b.color, transform: `rotate(${b.rot}deg)`, width: `${b.w}px` }"
      />
    </div>
    <div class="layout">
      <div class="medal-col">
        <svg class="medal" viewBox="0 0 160 200" role="img" :aria-label="`${rank.title} medal`">
          <path d="M50 0h24l14 70H64z" :fill="rank.ribbon" />
          <path d="M110 0H86L72 70h24z" :fill="rank.ribbon" opacity="0.8" />
          <circle cx="80" cy="128" r="62" :fill="rank.medal" stroke="#fff" stroke-width="6" />
          <circle cx="80" cy="128" r="48" fill="none" stroke="#fff" stroke-width="2" opacity="0.6" />
          <!-- The puffin -->
          <ellipse cx="80" cy="138" rx="22" ry="25" fill="#3d3a4b" />
          <ellipse cx="80" cy="142" rx="15" ry="18" fill="#fffaf0" />
          <circle cx="80" cy="110" r="16" fill="#3d3a4b" />
          <circle cx="80" cy="112" r="11" fill="#fffaf0" />
          <circle cx="75" cy="109" r="2.2" fill="#2b2230" />
          <circle cx="85" cy="109" r="2.2" fill="#2b2230" />
          <path d="M74 115l6 8 6-8z" fill="#ff8a3d" />
          <g v-for="(s, i) in stars" :key="s.name" :transform="`translate(${52 + i * 28} 176)`">
            <path d="M0-9l2.6 5.6 6.1.7-4.5 4.1 1.2 6L0 4.4-5.4 7.4l1.2-6-4.5-4.1 6.1-.7z" :fill="s.earned ? '#ffb627' : '#e8e2d6'" stroke="#fff" stroke-width="1.5" />
          </g>
        </svg>
        <label class="name" for="reward-name">{{ game.workshop ? (tv ? 'Family or group name' : 'Group or class name') : 'Keeper\'s name' }}</label>
        <input id="reward-name" v-model="name" type="text" maxlength="40" :placeholder="game.workshop ? 'Type your group\'s name' : 'Type your name'">
      </div>
      <div class="words">
        <p class="cert hand">
          This is to certify that <strong>{{ name || (game.workshop ? 'our keepers' : 'our new keeper') }}</strong> looked carefully at
          {{ pics.length }} pictures in Hearsay Harbour and earned the rank of <strong>{{ rank.title }}</strong>.
        </p>
        <p class="line">
          {{ rank.line }}
        </p>
        <ul class="stars">
          <li v-for="s in stars" :key="s.name" :class="{ earned: s.earned }">
            <span class="star" aria-hidden="true">★</span>
            <div>
              <strong>{{ s.name }}</strong>
              <span>{{ s.detail }}</span>
            </div>
            <span class="sr-only">{{ s.earned ? 'earned' : 'not earned yet' }}</span>
          </li>
        </ul>
        <p class="garden">
          <UiIcon name="flower" /> The trust garden finished the day with <strong>{{ game.trust }}</strong> blooms.
        </p>
      </div>
    </div>
    <template #footer>
      <button class="big-btn quiet" @click="game.start(game.workshop)">
        Play the day again
      </button>
      <button autofocus class="big-btn" data-continue @click="game.open({ kind: 'recap' })">
        See all your findings <UiIcon name="arrow" class="arr" />
      </button>
    </template>
  </UiDialog>
</template>

<style scoped>
.confetti {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.confetti span {
  position: absolute;
  top: -20px;
  height: 12px;
  border-radius: 3px;
  animation: fall linear forwards;
}
@keyframes fall {
  to {
    top: 110%;
    transform: rotate(720deg) translateX(40px);
  }
}
.layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.medal-col {
  display: grid;
  gap: 6px;
  justify-items: center;
}
.medal {
  width: 190px;
  animation: swing 3s ease-in-out infinite;
  transform-origin: 50% 0;
}
@keyframes swing {
  50% {
    transform: rotate(4deg);
  }
}
.name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ink-soft);
}
input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 12px;
  border: 2px solid var(--line);
  background: #fff;
  font: inherit;
  text-align: center;
}
.cert {
  margin: 0 0 10px;
  padding: 12px 16px;
  border-radius: 16px;
  background: #fff8e3;
  border: 2px dashed var(--honey);
  font-size: 1.2rem;
  line-height: 1.35;
}
.line {
  margin: 0 0 12px;
}
.stars {
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}
.stars li {
  display: grid;
  grid-template-columns: 34px 1fr;
  align-items: center;
  padding: 8px 12px;
  border-radius: 14px;
  background: var(--paper-2);
  color: var(--ink-soft);
}
.stars li.earned {
  background: #e7f5e1;
  color: var(--ink);
}
.stars li div {
  display: grid;
}
.stars li span:not(.star) {
  font-size: 0.85rem;
}
.star {
  font-size: 1.6rem;
  line-height: 1;
  color: #d9d2c4;
}
.earned .star {
  color: var(--honey);
}
.garden {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--leaf-deep);
}
.garden svg {
  width: 20px;
  height: 20px;
}
.arr {
  width: 20px;
  height: 20px;
}
@media (max-width: 680px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
