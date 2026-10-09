<script setup lang="ts">
import { sfx } from '~/audio/sfx'
import { LEAN_WORDS, VILLAGERS, VILLAGER_IDS, type VillagerId, pictureUrl } from '~/utils/content'
import { useGame } from '~/stores/game'

const props = defineProps<{ who: VillagerId }>()
const game = useGame()
const v = computed(() => VILLAGERS[props.who])
const take = computed(() => game.picture.takes[props.who])
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Type the line out, with a little chatter, like a cosy game.
const shown = ref(reduced ? take.value.text.length : 0)
const done = computed(() => shown.value >= take.value.text.length)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  game.talked(props.who)
  if (reduced) return
  timer = setInterval(() => {
    shown.value = Math.min(take.value.text.length, shown.value + 2)
    if (shown.value % 18 === 0) sfx.talk()
    if (done.value) clearInterval(timer)
  }, 22)
})
onBeforeUnmount(() => clearInterval(timer))

function skip() {
  shown.value = take.value.text.length
}

const others = computed(() => VILLAGER_IDS.filter(id => id !== props.who && game.record.talked.includes(id)))
const disagrees = computed(() => others.value.filter(id => !VILLAGERS[id].unreliable && game.picture.takes[id]?.lean !== take.value.lean))
const disagreeNames = computed(() => disagrees.value.map(id => VILLAGERS[id].name).join(' and '))
</script>

<template>
  <UiDialog kicker="Step 2 · Discuss" :title="v.name" @close="game.close()">
    <div class="talk">
      <!-- The picture being discussed sits beside the speaker, so it's clear what they're talking about. -->
      <div class="side">
        <VillagerFace class="face" :who="who" />
        <img class="thumb" :src="pictureUrl(game.picture.src)" :alt="`The picture being discussed. Its caption says: ${game.picture.claim}`" draggable="false">
      </div>
      <div class="said">
        <p class="who">
          {{ v.role }} · <span class="soft">{{ v.eye }}</span>
        </p>
        <p class="line hand" aria-live="off" @click="skip">
          {{ take.text.slice(0, shown) }}<span v-if="!done" class="caret">▍</span>
        </p>
        <p class="sr-only">
          {{ take.text }}
        </p>
        <Transition name="fade">
          <div v-if="done" class="lean">
            <span class="tag" :class="take.lean">{{ v.name }} {{ LEAN_WORDS[take.lean] }}</span>
            <span class="soft small">{{ v.unreliable ? 'He says this about every picture.' : 'A hunch, not a score.' }}</span>
          </div>
        </Transition>
        <p v-if="done && v.unreliable" class="unreliable">
          <strong>Is that evidence?</strong> {{ v.unreliable }}
        </p>
        <p v-else-if="done && disagrees.length" class="disagree">
          That's not what {{ disagreeNames }} said. Disagreement is useful: it shows where to check.
        </p>
      </div>
    </div>
    <template #footer>
      <button autofocus class="big-btn" data-continue @click="game.close()">
        Thanks, {{ v.name }}
      </button>
    </template>
  </UiDialog>
</template>

<style scoped>
.talk {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 18px;
  align-items: start;
}
.side {
  display: grid;
  justify-items: center;
  gap: 12px;
}
.thumb {
  width: 100px;
  border-radius: 10px;
  border: 4px solid #fff;
  box-shadow: var(--shadow);
  transform: rotate(-3deg);
}
.face {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: var(--paper-2);
  border: 3px solid var(--line);
}
.who {
  margin: 0 0 6px;
  font-weight: 600;
}
.soft {
  color: var(--ink-soft);
  font-weight: 500;
}
.small {
  font-size: 0.85rem;
}
.line {
  margin: 0;
  min-height: 5.5em;
  padding: 12px 16px;
  background: #fff;
  border-radius: 4px 18px 18px 18px;
  border: 2px solid var(--line);
  font-size: 1.25rem;
  line-height: 1.35;
  cursor: pointer;
}
.caret {
  animation: blink 0.8s steps(2) infinite;
  color: var(--honey-deep);
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
.lean {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}
.disagree {
  margin: 10px 0 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: #fff8e3;
  font-size: 0.92rem;
}
.unreliable {
  margin: 10px 0 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: #eef0f6;
  font-size: 0.92rem;
}
.fade-enter-active {
  transition: opacity 300ms;
}
.fade-enter-from {
  opacity: 0;
}
@media (max-width: 520px) {
  .talk {
    grid-template-columns: 1fr;
    justify-items: center;
  }
  .side {
    grid-auto-flow: column;
    align-items: center;
    gap: 18px;
  }
  .face {
    width: 90px;
    height: 90px;
  }
  .thumb {
    width: 84px;
  }
}
</style>
