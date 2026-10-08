<script setup lang="ts">
import { setMuted, unlockAudio } from '~/audio/sfx'
import { CHECKS, LEAN_WORDS, VILLAGERS } from '~/utils/content'
import { PLACE_BY_ID, type PlaceId } from '~/utils/world'
import { useGame } from '~/stores/game'

const game = useGame()

const steps = computed(() => {
  const r = game.record
  const s = game.step
  return [
    { id: 'notice', name: 'Notice', icon: 'eye' as const, done: !!r.firstLean, now: s === 'notice' },
    { id: 'discuss', name: 'Discuss', icon: 'chat' as const, done: r.talked.length > 0, now: s === 'investigate' && !r.talked.length },
    { id: 'check', name: 'Check', icon: 'search' as const, done: r.checked.length > 0, now: s === 'investigate' && !!r.talked.length && !r.checked.length },
    { id: 'reflect', name: 'Reflect', icon: 'pin' as const, done: !!r.label, now: s === 'investigate' && !!r.talked.length && !!r.checked.length },
  ]
})

/** One plain sentence: what to do next. */
const nextText = computed(() => {
  const r = game.record
  if (game.finished) return 'Day done! Collect your reward.'
  switch (game.step) {
    case 'arriving': return 'Watch the gull: a picture is on its way.'
    case 'notice': return 'Go to the noticeboard and look at the new picture.'
    case 'done': return 'Pinned! The next picture is coming.'
  }
  const s = game.suggestion
  if (s === 'board') return 'You have plenty of evidence. Follow the honey trail back to the noticeboard to Reflect.'
  if (s) return `Next: ${goName(s)}. Follow the honey trail${r.talked.length + r.checked.length ? ', or go back to the board when you\'re ready' : ''}.`
  return 'Go back to the board to Reflect.'
})

const goName = (id: PlaceId) => {
  const p = PLACE_BY_ID[id]
  return id === 'board' ? 'the noticeboard' : `${p.verb.toLowerCase()} ${p.name}`
}

/** The action for the place you're standing at, if there's still something to do there. */
const prompt = computed(() => {
  if (!game.at || game.dialog || game.finished) return null
  const p = PLACE_BY_ID[game.at]
  if (game.at === 'board') {
    if (game.step === 'notice') return 'Look at the new picture'
    // Only offer Reflect as the main action once there's some evidence; until then, point onwards.
    if (game.step === 'investigate' && game.evidenceCount >= 2) return 'Reflect and pin it up'
    return null
  }
  if (game.step !== 'investigate') return null
  const r = game.record
  if ((r.talked as string[]).includes(game.at) || (r.checked as string[]).includes(game.at)) return null
  return `${p.verb} ${p.name}`
})

/** When there's nothing to do here, a big button that walks you to the next place. */
const next = computed(() => {
  if (prompt.value || game.dialog || game.finished) return null
  const s = game.suggestion
  if (!s || game.at === s) return null
  const label = s === 'board' ? (game.step === 'notice' ? 'Go to the noticeboard' : 'Back to the board to Reflect') : `Next: ${goName(s)}`
  return { id: s, label: label.charAt(0).toUpperCase() + label.slice(1) }
})

const hint = computed(() => {
  if (game.dialog || !game.started || game.finished) return null
  if (game.step === 'arriving') return 'A gull is bringing something…'
  if (game.step === 'done') return 'Pinned! The next picture is on its way.'
  return null
})

const NAGS = ['Share it now!', 'Everyone else has!', 'Quick, before it\'s old!', 'Just post it!', 'Likes are waiting!']
const nag = ref(0)
let nagTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  nagTimer = setInterval(() => (nag.value = (nag.value + 1) % NAGS.length), 4200)
})
onBeforeUnmount(() => clearInterval(nagTimer))

function toggleMute() {
  game.muted = !game.muted
  setMuted(game.muted)
  // Turning sound on also switches it onto the media channel, so it plays with a phone on silent.
  if (!game.muted) unlockAudio()
}
// On phones the satchel starts folded so it doesn't cover the island.
const satchelOpen = ref(window.innerWidth > 640)
</script>

<template>
  <div class="hud">
    <div class="top-left">
      <div class="panel progress">
        <p class="where">
          <strong>Picture {{ Math.min(game.index + 1, game.pictures.length) }} of {{ game.pictures.length }}</strong>
          <span v-if="game.workshop" class="ws">Workshop</span>
        </p>
        <ol class="steps" aria-label="Steps for this picture">
          <li v-for="s in steps" :key="s.id" :class="{ done: s.done, now: s.now }">
            <UiIcon :name="s.done ? 'check' : s.icon" />
            <span>{{ s.name }}</span>
            <span v-if="s.done" class="sr-only">(done)</span>
          </li>
        </ol>
        <p class="next" aria-live="polite">
          <UiIcon name="arrow" /> {{ nextText }}
        </p>
        <button class="credits" @click="game.open({ kind: 'credits' })">
          Credits
        </button>
      </div>

      <section v-if="game.step === 'investigate' && game.evidenceCount" class="panel satchel" aria-label="Your satchel of evidence">
        <button class="satchel-head" :aria-expanded="satchelOpen" @click="satchelOpen = !satchelOpen">
          <UiIcon name="satchel" />
          <span>Satchel · {{ game.evidenceCount }}</span>
        </button>
        <ul v-if="satchelOpen">
          <li v-for="v in game.record.talked" :key="v">
            <strong>{{ VILLAGERS[v].name }}</strong>
            <span class="tag" :class="game.picture.takes[v].lean">{{ LEAN_WORDS[game.picture.takes[v].lean] }}</span>
          </li>
          <li v-for="c in game.record.checked" :key="c">
            <strong>{{ CHECKS[c].name }}</strong>
            <span class="finding">{{ game.picture.checks[c].headline }}</span>
          </li>
        </ul>
      </section>
    </div>

    <div class="top-right">
      <div class="panel trust" :title="`Village trust: ${game.trust}`">
        <UiIcon name="flower" />
        <span><strong>{{ game.trust }}</strong> <span class="label">trust</span></span>
      </div>
      <button class="chip-btn" aria-label="Home: back to the opening screen" title="Home (your day is saved)" @click="game.goHome()">
        <UiIcon name="home" />
      </button>
      <button class="chip-btn" aria-label="Island map" title="Island map" @click="game.open({ kind: 'map' })">
        <UiIcon name="map" />
      </button>
      <button class="chip-btn" aria-label="Welcome guide" title="Welcome guide" @click="game.open({ kind: 'guide', page: 0 })">
        <UiIcon name="book" />
      </button>
      <button class="chip-btn hide-sm" aria-label="How to play" title="How to play" @click="game.open({ kind: 'help' })">
        <UiIcon name="help" />
      </button>
      <button class="chip-btn" :aria-label="game.muted ? 'Turn sound on' : 'Turn sound off'" @click="toggleMute">
        <UiIcon :name="game.muted ? 'mute' : 'sound'" />
      </button>
    </div>

    <div class="bottom">
      <Transition name="rise">
        <button v-if="prompt" class="big-btn action" @click="game.use(game.at!)">
          {{ prompt }} <span class="kbd">Space</span>
        </button>
        <button v-else-if="next" class="big-btn action next-btn" @click="game.goto = next.id">
          {{ next.label }} <UiIcon name="arrow" class="arr" />
        </button>
        <div v-else-if="game.finished && !game.dialog" class="end-btns">
          <button class="big-btn action" @click="game.open({ kind: 'reward' })">
            See your reward
          </button>
          <button class="big-btn action recap-btn" @click="game.open({ kind: 'recap' })">
            Open the recap
          </button>
        </div>
        <p v-else-if="hint" class="panel hint hand">
          {{ hint }}
        </p>
      </Transition>
    </div>

    <FacilitatorPanel v-if="game.workshop" />

    <div class="view-ctl" role="group" aria-label="View">
      <button class="chip-btn" aria-label="Zoom in" title="Zoom in (+)" @click="game.zoomBy(0.8)">
        <UiIcon name="plus" />
      </button>
      <button class="chip-btn" aria-label="Zoom out" title="Zoom out (−)" @click="game.zoomBy(1.25)">
        <UiIcon name="minus" />
      </button>
      <button class="chip-btn" aria-label="Back to the puffin" title="Back to the puffin (C)" @click="game.recentre++">
        <UiIcon name="target" />
      </button>
    </div>

    <Transition name="rise">
      <button v-if="game.step === 'investigate' && !game.dialog" class="gull-btn" @click="game.open({ kind: 'share' })">
        <span class="bubble hand">{{ NAGS[nag] }}</span>
        <span class="chip-btn"><UiIcon name="gull" /> Share now</span>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.hud {
  position: fixed;
  inset: 0;
  pointer-events: none;
  padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
}
.hud button,
.hud .panel {
  pointer-events: auto;
}
.top-left {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: min(330px, calc(100vw - 24px));
}
.progress {
  padding: 10px 14px 12px;
}
.where {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  font-size: 0.9rem;
  color: var(--ink-soft);
}
.ws {
  padding: 0 8px;
  border-radius: 999px;
  background: var(--lilac);
  color: #4b3470;
  font-size: 0.75rem;
  font-weight: 600;
}
.next {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 8px 0 0;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1.3;
}
.credits {
  margin-top: 6px;
  padding: 0;
  border: none;
  background: none;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--sea-deep);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.next svg {
  flex: none;
  width: 16px;
  height: 16px;
  margin-top: 1px;
  color: var(--honey-deep);
}
.steps {
  display: flex;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.steps li {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px 4px 7px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
  background: var(--paper-2);
  color: var(--ink-soft);
  border: 1.5px solid var(--line);
}
.steps li svg {
  width: 15px;
  height: 15px;
}
.steps li.done {
  background: #e7f5e1;
  border-color: #b9dfae;
  color: var(--leaf-deep);
}
.steps li.now {
  background: var(--honey);
  border-color: var(--honey-deep);
  color: #4a2c14;
  animation: nudge 1.6s ease-in-out infinite;
}
@keyframes nudge {
  50% {
    transform: translateY(-2px);
  }
}
.satchel {
  padding: 4px 6px 8px;
}
.satchel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 0 8px;
  border: none;
  background: none;
  font-weight: 700;
}
.satchel-head svg {
  width: 20px;
  height: 20px;
}
.satchel ul {
  margin: 0;
  padding: 0 10px;
  list-style: none;
  display: grid;
  gap: 6px;
  font-size: 0.88rem;
}
.satchel li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 8px;
}
.finding {
  color: var(--ink-soft);
}
.top-right {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
}
.trust {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 48px;
  padding: 0 14px;
  border-radius: 999px;
  color: var(--leaf-deep);
}
.trust svg {
  width: 22px;
  height: 22px;
}
.trust strong {
  font-size: 1.2rem;
}
.trust .label {
  font-size: 0.85rem;
}
.view-ctl {
  position: absolute;
  left: 12px;
  bottom: max(20px, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.view-ctl button {
  pointer-events: auto;
  padding: 0;
}
.bottom {
  position: absolute;
  left: 50%;
  bottom: max(20px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  width: max-content;
  max-width: calc(100vw - 24px);
}
.end-btns {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}
.end-btns button {
  pointer-events: auto;
}
.recap-btn {
  background: var(--lilac);
  box-shadow: 0 4px 0 #9a83c4, var(--shadow);
  color: #2f1f4a;
}
.next-btn {
  background: #fff6dd;
  box-shadow: 0 4px 0 var(--honey), var(--shadow);
  animation: beckon 1.8s ease-in-out infinite;
}
.next-btn .arr {
  width: 20px;
  height: 20px;
}
@keyframes beckon {
  50% {
    transform: translateY(-3px);
  }
}
@media (pointer: coarse) {
  .action .kbd {
    display: none;
  }
}
.action .kbd {
  background: rgba(255, 255, 255, 0.5);
  border-color: rgba(120, 70, 0, 0.25);
}
.hint {
  margin: 0;
  padding: 10px 18px;
  border-radius: 999px;
  text-align: center;
}
.gull-btn {
  position: absolute;
  right: 14px;
  bottom: 86px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
}
.gull-btn .bubble {
  padding: 6px 12px;
  border-radius: 14px 14px 4px 14px;
  background: #fff;
  box-shadow: var(--shadow);
  animation: wobble 2.4s ease-in-out infinite;
}
@keyframes wobble {
  0%,
  100% {
    transform: rotate(-2deg);
  }
  50% {
    transform: rotate(2deg) translateY(-2px);
  }
}
.rise-enter-active,
.rise-leave-active {
  transition: opacity var(--dur), transform var(--dur) var(--ease);
}
.rise-enter-from,
.rise-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
@media (max-width: 640px) {
  .top-left {
    top: 70px;
  }
  .gull-btn {
    bottom: 96px;
  }
  .steps li span:not(.sr-only) {
    display: none;
  }
  .steps li.now span:not(.sr-only) {
    display: inline;
  }
  .trust .label {
    display: none;
  }
  .hide-sm {
    display: none;
  }
  .top-right {
    gap: 6px;
  }
}
</style>
