<script setup lang="ts">
import { sfx } from '~/audio/sfx'
import { LABELS, LEAN_WORDS, pictureUrl, leanMatches, voteList } from '~/utils/content'
import { useGame } from '~/stores/game'

const game = useGame()
const pic = computed(() => game.picture)
const rec = computed(() => game.record)
const exact = computed(() => rec.value.label === pic.value.truth)
const close = computed(() => !!rec.value.label && pic.value.close.includes(rec.value.label))
const delta = computed(() => rec.value.trustDelta)
const last = computed(() => game.index >= game.pictures.length - 1)
const showCues = ref(true)
const roomRows = computed(() => [
  { name: 'First', v: voteList(rec.value.roomFirst, true) },
  { name: 'Final', v: voteList(rec.value.roomFinal, false) },
])

const firstMatches = computed(() => {
  return leanMatches(rec.value.firstLean, pic.value.truth)
})

const headline = computed(() => {
  if (rec.value.sharedEarly) return exact.value ? 'Lucky guess!' : 'The gull got you!'
  if (exact.value) return 'Spot on!'
  if (close.value) return 'Very close!'
  if (rec.value.label === 'unsure') return 'An honest answer'
  return 'Not this time'
})

onMounted(() => {
  if (delta.value >= 3) sfx.good()
  else if (delta.value >= 0) sfx.meh()
  else sfx.bad()
  game.say(`${headline.value} It was ${LABELS[pic.value.truth].name}. Trust ${delta.value >= 0 ? 'grew by' : 'fell by'} ${Math.abs(delta.value)}.`)
})
</script>

<template>
  <UiDialog kicker="The reveal" :title="headline" wide @close="game.next()">
    <div class="layout">
      <div>
        <div class="picture-frame">
          <div class="pic">
            <img :src="pictureUrl(pic.src)" alt="" draggable="false">
            <template v-if="showCues">
              <span
                v-for="(c, i) in pic.cues"
                :key="`c${i}`"
                class="cue"
                :style="{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }"
                aria-hidden="true"
              >{{ i + 1 }}</span>
              <span
                v-for="(p, i) in rec.pebbles"
                :key="`p${i}`"
                class="mine"
                :style="{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }"
                aria-hidden="true"
              />
            </template>
          </div>
        </div>
        <p v-if="pic.madeWith" class="credential">
          <span class="seal-dot" aria-hidden="true" />
          <span><strong>Made with:</strong> {{ pic.madeWith }}</span>
        </p>
        <label class="toggle">
          <input v-model="showCues" type="checkbox"> Show spots (yours are honey pebbles)
        </label>
        <ol class="cues">
          <li v-for="(c, i) in pic.cues" :key="i">
            {{ c.note }}
          </li>
        </ol>
      </div>
      <div class="side">
        <div class="answer">
          <div>
            <p class="small">
              It was
            </p>
            <p class="big">
              {{ LABELS[pic.truth].name }}
            </p>
          </div>
          <div>
            <p class="small">
              You pinned
            </p>
            <p class="big" :class="{ good: exact, okay: close }">
              {{ rec.label ? LABELS[rec.label].name : '—' }}
            </p>
          </div>
        </div>
        <p class="verdict">
          {{ pic.verdict }}
        </p>
        <p class="lesson hand">
          {{ pic.lesson }}
        </p>
        <p v-if="rec.sharedEarly" class="note">
          You shared before checking anything. Even when a rushed guess is right, the village can't tell a lucky guess from a careful one.
        </p>
        <p v-else-if="rec.firstLean" class="note">
          Your first impression <span class="tag" :class="rec.firstLean">{{ LEAN_WORDS[rec.firstLean] }}</span>
          {{ firstMatches ? 'pointed the right way.' : 'didn\'t match how it was made, and that\'s exactly why we check.' }}
        </p>
        <div v-if="game.workshop" class="room">
          <p class="small">
            The room
          </p>
          <div v-for="row in roomRows" :key="row.name" class="room-row">
            <span class="rname">{{ row.name }}</span>
            <span class="bar"><span v-for="c in row.v" :key="c.id" :style="{ flex: c.n, background: c.color }" /></span>
            <span class="nums">{{ row.v.filter(c => c.n).map(c => `${c.n} ${c.name}`).join(' · ') || 'no votes' }}</span>
          </div>
        </div>
        <div class="trust" :class="{ down: delta < 0 }">
          <UiIcon name="flower" />
          <strong>{{ delta >= 0 ? '+' : '' }}{{ delta }}</strong>
          <span>{{ delta >= 0 ? 'The trust garden grows' : 'Some flowers wilt' }}</span>
        </div>
      </div>
    </div>
    <template #footer>
      <button autofocus class="big-btn" data-continue @click="game.next()">
        {{ last ? 'See how the day went' : 'Next picture' }}
        <UiIcon name="arrow" class="arrow" />
      </button>
    </template>
  </UiDialog>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 22px;
}
.pic {
  position: relative;
  width: fit-content;
  margin: 0 auto;
}
.pic img {
  max-height: min(48vh, 440px);
  margin: 0 auto;
}
.cue,
.mine {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
}
.cue {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  background: var(--sea-deep);
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
  border: 3px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 40, 60, 0.4);
}
.mine {
  width: 22px;
  height: 22px;
  background: radial-gradient(circle at 35% 30%, #fff1c2, var(--honey) 60%, var(--honey-deep));
  border: 2px solid #fff;
  opacity: 0.9;
}
.credential {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: #eef8fc;
  border: 1.5px solid #b9dcea;
  font-size: 0.9rem;
}
.seal-dot {
  flex: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--berry);
  box-shadow: 0 0 0 3px #f8c9cf;
}
.toggle {
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 8px 2px;
  font-size: 0.88rem;
  color: var(--ink-soft);
}
.cues {
  margin: 0;
  padding-left: 1.4em;
  display: grid;
  gap: 4px;
  font-size: 0.92rem;
}
.cues li::marker {
  color: var(--sea-deep);
  font-weight: 700;
}
.answer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}
.answer > div {
  padding: 10px 14px;
  border-radius: 16px;
  background: var(--paper-2);
}
.small {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.big {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}
.big.good {
  color: var(--leaf-deep);
}
.big.okay {
  color: var(--unsure);
}
.draft {
  margin: 0 0 10px;
  padding: 6px 12px;
  border-radius: 12px;
  background: #f7f2fd;
  font-size: 0.85rem;
}
.verdict {
  margin: 0 0 10px;
  line-height: 1.45;
}
.lesson {
  margin: 0 0 12px;
  padding: 10px 14px;
  border-radius: 14px;
  background: #e7f5e1;
  font-size: 1.2rem;
}
.note {
  margin: 0 0 12px;
  font-size: 0.92rem;
  color: var(--ink-soft);
}
.room {
  margin: 0 0 12px;
  padding: 10px 14px;
  border-radius: 16px;
  background: #f7f2fd;
}
.room-row {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 2px 8px;
  align-items: center;
  margin-top: 4px;
}
.rname {
  font-weight: 600;
  font-size: 0.85rem;
}
.bar {
  display: flex;
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--line);
}
.b-cam {
  background: var(--camera);
}
.b-ai {
  background: var(--ai);
}
.b-uns {
  background: #f4c94f;
}
.nums {
  grid-column: 2;
  font-size: 0.78rem;
  color: var(--ink-soft);
}
.trust {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 16px;
  background: #e7f5e1;
  color: var(--leaf-deep);
  font-weight: 600;
}
.trust.down {
  background: #fdf0f1;
  color: var(--ai);
}
.trust svg {
  width: 24px;
  height: 24px;
}
.trust strong {
  font-size: 1.3rem;
}
.arrow {
  width: 20px;
  height: 20px;
}
@media (max-width: 720px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
