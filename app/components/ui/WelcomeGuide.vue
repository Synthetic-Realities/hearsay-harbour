<script setup lang="ts">
import { sfx } from '~/audio/sfx'
import { CHECKS, VILLAGERS } from '~/utils/content'
import type { PlaceId } from '~/utils/world'
import { useGame } from '~/stores/game'

/*
 * The welcome guide: a big, friendly tour before the day starts, reopenable any time
 * from the HUD. Each page answers one question a newcomer has.
 */
const props = defineProps<{ page?: number }>()
const game = useGame()
const el = ref<HTMLDialogElement>()
const titleId = useId()

const PAGES = [
  { id: 'where', kicker: 'Where you are', title: 'Welcome to Hearsay Harbour', highlight: null },
  { id: 'mission', kicker: 'Your mission', title: 'Work out how each picture was made', highlight: ['board'] },
  { id: 'who', kicker: 'Who to ask', title: 'Four villagers, four ways of looking', highlight: ['wren', 'pip', 'moss', 'jim'] },
  { id: 'tools', kicker: 'How to check', title: 'Three harbour tools', highlight: ['tide', 'seal', 'crate'] },
  { id: 'explore', kicker: 'How to explore', title: 'Hop around the island', highlight: null },
] as const

const page = ref(Math.min(props.page ?? 0, PAGES.length - 1))
const cur = computed(() => PAGES[page.value]!)
const last = computed(() => page.value === PAGES.length - 1)
const highlight = computed(() => (cur.value.highlight ? [...cur.value.highlight] as PlaceId[] : undefined))
// Opened mid-game from the HUD, rather than at the start of a day.
const midGame = computed(() => game.records.some(r => r.firstLean) || game.step !== 'arriving')

onMounted(() => el.value?.showModal())

function go(n: number) {
  page.value = Math.max(0, Math.min(PAGES.length - 1, n))
  sfx.open()
}
function finish() {
  game.close()
}
function onKey(ev: KeyboardEvent) {
  if (ev.key === 'ArrowRight') go(page.value + 1)
  else if (ev.key === 'ArrowLeft') go(page.value - 1)
}
function onCancel(ev: Event) {
  ev.preventDefault()
  finish()
}
</script>

<template>
  <dialog ref="el" class="guide" :aria-labelledby="titleId" @cancel="onCancel" @keydown="onKey">
    <div class="sheet">
      <div class="art">
        <IslandMap :highlight="highlight" :you="game.pos" />
      </div>
      <div class="words">
        <p class="kicker">
          {{ cur.kicker }} · {{ page + 1 }} of {{ PAGES.length }}
        </p>
        <h2 :id="titleId">
          {{ cur.title }}
        </h2>

        <div v-if="cur.id === 'where'" class="content">
          <p class="lead">
            You're a puffin on a little island in the middle of a busy sea of pictures. You've just become
            <strong>keeper of the village noticeboard</strong>.
          </p>
          <p>
            Pictures wash up here all day: carried by gulls, bobbing in bottles, printed in the ferry's newspapers.
            Before anything goes on the board, the village wants to know how it was made.
          </p>
          <p class="hand callout">
            The map shows the whole island. You start in the middle, by the noticeboard.
          </p>
        </div>

        <div v-else-if="cur.id === 'mission'" class="content">
          <p class="lead">
            Today <strong>{{ game.pictures.length }} pictures</strong> will arrive. For each one, follow the four steps:
          </p>
          <ol class="steps">
            <li><span class="n">1</span><div><strong>Notice</strong> your first impression at the noticeboard.</div></li>
            <li><span class="n">2</span><div><strong>Discuss</strong> it with the villagers.</div></li>
            <li><span class="n">3</span><div><strong>Check</strong> it with the harbour tools.</div></li>
            <li><span class="n">4</span><div><strong>Reflect</strong> back at the board: label it and say how you'd share it.</div></li>
          </ol>
          <p class="hand callout">
            “Still unsure” is a real answer. Careful answers grow the village's trust garden, and confident wrong ones wilt it.
            Watch out for the gull: it always wants you to share <em>right now</em>.
          </p>
        </div>

        <div v-else-if="cur.id === 'who'" class="content">
          <ul class="cards">
            <li v-for="v in VILLAGERS" :key="v.id">
              <VillagerFace :who="v.id" class="face" />
              <div>
                <strong>{{ v.name }}</strong>, {{ v.role }}: {{ v.eye }}
                <span class="soft">{{ v.about }}</span>
              </div>
            </li>
          </ul>
          <p class="hand callout">
            Their opinions are hunches, not scores, and they often disagree. That tells you where to check.
          </p>
        </div>

        <div v-else-if="cur.id === 'tools'" class="content">
          <ul class="cards tools">
            <li v-for="c in CHECKS" :key="c.id">
              <span class="tool" :class="c.id"><UiIcon name="search" /></span>
              <div>
                <strong>{{ c.name }}</strong> at {{ c.place }}
                <span class="soft">{{ c.realWorld }}</span>
              </div>
            </li>
          </ul>
          <p class="hand callout">
            A tool that finds nothing is still a finding. Most real photos have no trail at all.
          </p>
        </div>

        <div v-else class="content">
          <ul class="how">
            <li><strong>Tap or click</strong> a tile to hop there. Tap a villager or building to walk over and use it.</li>
            <li>
              Or use the keys <span class="kbd">Q</span><span class="kbd">W</span><span class="kbd">E</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span>
              or the arrows, and <span class="kbd">Space</span> to talk or use.
            </li>
            <li><strong>Honey diamonds</strong> float over the places you haven't visited for the current picture.</li>
            <li><strong>Drag</strong> to look around and <strong>scroll or pinch</strong> to zoom, or use the <strong>+ − ◎</strong> buttons bottom left (keys <span class="kbd">+</span> <span class="kbd">−</span> <span class="kbd">C</span>).</li>
            <li>The <strong>step tracker</strong> at the top shows where you are in Notice, Discuss, Check, Reflect.</li>
            <li>Lost? The <strong>map</strong> and <strong>guide</strong> buttons at the top bring this back.</li>
          </ul>
          <p v-if="game.workshop" class="hand callout">
            Workshop mode is on: you'll be asked for the room's show of hands, and facilitator prompts appear on the right.
          </p>
        </div>

        <div class="nav">
          <div class="dots" role="tablist" aria-label="Guide pages">
            <button
              v-for="(p, i) in PAGES"
              :key="p.id"
              role="tab"
              class="dot"
              :class="{ on: i === page }"
              :aria-selected="i === page"
              :aria-label="p.kicker"
              @click="go(i)"
            />
          </div>
          <button v-if="!last" class="big-btn quiet skip" @click="finish">
            {{ midGame ? 'Close' : 'Skip' }}
          </button>
          <button v-if="page > 0" class="big-btn quiet" @click="go(page - 1)">
            Back
          </button>
          <button v-if="!last" autofocus class="big-btn" @click="go(page + 1)">
            Next <UiIcon name="arrow" class="arrow" />
          </button>
          <button v-else autofocus class="big-btn" @click="finish">
            {{ midGame ? 'Back to the island' : 'Start the day' }}
          </button>
        </div>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.guide {
  padding: 0;
  border: none;
  background: transparent;
  width: min(1040px, calc(100vw - 24px));
  max-width: none;
  max-height: calc(100dvh - 24px);
  color: var(--ink);
  overflow: visible;
}
.guide[open] {
  animation: pop 320ms var(--ease);
}
.guide::backdrop {
  background: rgba(70, 120, 150, 0.35);
  backdrop-filter: blur(4px);
}
@keyframes pop {
  from {
    transform: scale(0.95) translateY(12px);
  }
}
.sheet {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  background: var(--paper);
  border: var(--panel-border);
  border-radius: 32px;
  box-shadow: var(--shadow);
  overflow: hidden;
  max-height: calc(100dvh - 24px);
}
.art {
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(180deg, #e3f4fb, #bfe6f4);
}
.words {
  display: flex;
  flex-direction: column;
  padding: 28px 30px 22px;
  overflow: auto;
  min-height: min(560px, calc(100dvh - 24px));
}
.kicker {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--honey-deep);
}
h2 {
  margin: 4px 0 14px;
  font-size: clamp(1.6rem, 3.2vw, 2.2rem);
  line-height: 1.1;
  color: var(--sea-deep);
}
.content {
  flex: 1;
  line-height: 1.5;
}
.content p {
  margin: 0 0 12px;
}
.lead {
  font-size: 1.1rem;
}
.callout {
  padding: 10px 14px;
  border-radius: 16px;
  background: #fff8e3;
  font-size: 1.15rem;
}
.steps,
.cards,
.how {
  margin: 0 0 14px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}
.steps li {
  display: flex;
  gap: 12px;
  align-items: center;
}
.n {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--honey);
  font-weight: 700;
  color: #4a2c14;
}
.cards li {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 18px;
  background: #fff;
  border: 2px solid var(--line);
}
.face {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--paper-2);
}
.soft {
  display: block;
  color: var(--ink-soft);
  font-size: 0.92rem;
}
.tool {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 4px;
  border-radius: 50%;
  color: #fff;
}
.tool svg {
  width: 26px;
  height: 26px;
}
.tool.tide {
  background: #6fb7ea;
}
.tool.seal {
  background: #d1495b;
}
.tool.crate {
  background: #d9a46b;
}
.how li {
  padding-left: 1.1em;
  position: relative;
}
.how li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--honey);
}
.kbd {
  margin: 0 2px;
}
.nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding-top: 16px;
  border-top: 2px dashed var(--line);
}
.dots {
  display: flex;
  gap: 6px;
  margin-right: auto;
}
.dot {
  width: 12px;
  height: 12px;
  padding: 0;
  border-radius: 50%;
  border: none;
  background: var(--line);
  transition: transform var(--dur) var(--ease), background var(--dur);
}
.dot.on {
  background: var(--honey-deep);
  transform: scale(1.3);
}
.arrow {
  width: 20px;
  height: 20px;
}
@media (max-width: 760px) {
  .sheet {
    grid-template-columns: 1fr;
    overflow: auto;
  }
  .art {
    padding: 14px 40px;
  }
  .art :deep(svg) {
    max-height: 30vh;
  }
  .words {
    min-height: 0;
    overflow: visible;
    padding: 20px 20px 18px;
  }
  .skip {
    display: none;
  }
}
</style>
