<script setup lang="ts">
import { unlockAudio } from '~/audio/sfx'
import { PACKS } from '~/utils/content'
import { useGame } from '~/stores/game'

const game = useGame()
game.peekSave()
const dev = import.meta.dev
const packId = ref(game.packId)
function start(workshop: boolean) {
  unlockAudio()
  game.start(workshop, packId.value)
}
// On a short screen (or a TV) the card scrolls, with the green rail to move it.
const card = ref<HTMLElement>()
function resume() {
  unlockAudio()
  game.resume()
}
</script>

<template>
  <div class="title">
    <div class="card-wrap panel">
      <div ref="card" class="card">
        <p class="kicker">
          An SDA Vision community game
        </p>
        <h1>Hearsay<br>Harbour</h1>
        <p class="tag-line hand">
          Notice · Discuss · Check · Reflect
        </p>
        <p class="blurb">
          A cozy island where pictures wash up all day. Can you work out how each one was made before the gull gets everyone sharing?
        </p>
        <div v-if="PACKS.length > 1" class="levels" role="radiogroup" aria-label="Choose a level">
          <button
            v-for="p in PACKS"
            :key="p.id"
            role="radio"
            :aria-checked="packId === p.id"
            class="level"
            :class="{ on: packId === p.id }"
            @click="packId = p.id"
          >
            <strong>Level {{ p.level }} · {{ p.title }}</strong>
            <span>{{ p.blurb }}</span>
          </button>
        </div>
        <div class="buttons">
          <button v-if="game.hasSave" class="big-btn" autofocus @click="resume">
            Continue your day
          </button>
          <button class="big-btn" :class="{ quiet: game.hasSave }" :autofocus="!game.hasSave" @click="start(false)">
            {{ game.hasSave ? 'Start a new day' : 'Play' }}
          </button>
          <button class="big-btn quiet" @click="start(true)">
            <UiIcon name="people" class="ic" /> Run a workshop
          </button>
        </div>
        <p class="small">
          Workshop mode adds facilitator prompts and show-of-hands voting for a room.
        </p>
        <div class="links">
          <button class="link" @click="game.open({ kind: 'phone' })">
            Play on your phone
          </button>
          <button class="link" @click="game.open({ kind: 'credits' })">
            Credits
          </button>
          <button v-if="dev" class="studio" @click="game.open({ kind: 'studio' })">
            Dev Studio: add pictures
          </button>
        </div>
      </div>
      <ScrollRail :target="card" />
    </div>
  </div>
</template>

<style scoped>
.title {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: radial-gradient(ellipse at center, rgba(255, 250, 240, 0) 30%, rgba(255, 231, 194, 0.55) 100%);
}
.card-wrap {
  position: relative;
  display: flex;
  max-width: 420px;
  max-height: calc(100dvh - 32px);
  border-radius: 32px;
  animation: float 5s ease-in-out infinite;
}
.card {
  min-height: 0;
  padding: 28px 30px 30px;
  text-align: center;
  overflow: auto;
}
.card.hh-has-rail {
  padding-right: 40px;
}
@keyframes float {
  50% {
    transform: translateY(-6px);
  }
}
.kicker {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
h1 {
  margin: 6px 0 4px;
  font-size: clamp(2.6rem, 9vw, 3.6rem);
  line-height: 0.95;
  font-weight: 700;
  color: var(--sea-deep);
  text-shadow: 0 3px 0 #fff, 0 6px 0 rgba(63, 143, 176, 0.18);
}
.tag-line {
  margin: 8px 0 12px;
  font-size: 1.3rem;
  color: var(--honey-deep);
}
.blurb {
  margin: 0 0 20px;
  line-height: 1.5;
}
.levels {
  display: grid;
  gap: 6px;
  margin: 0 0 14px;
  text-align: left;
}
.level {
  display: grid;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 14px;
  border: 2px solid var(--line);
  background: #fff;
}
.level span {
  font-size: 0.82rem;
  color: var(--ink-soft);
}
.level.on {
  border-color: var(--honey-deep);
  background: #fff6dd;
}
.links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
.link {
  padding: 6px 12px;
  border: none;
  background: none;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--sea-deep);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.studio {
  padding: 6px 12px;
  border: 1.5px dashed var(--lilac);
  border-radius: 999px;
  background: none;
  font-size: 0.85rem;
  color: #4b3470;
}
.buttons {
  display: grid;
  gap: 10px;
}
.ic {
  width: 20px;
  height: 20px;
}
.small {
  margin: 12px 0 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
}
</style>
