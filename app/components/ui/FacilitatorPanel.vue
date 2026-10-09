<script setup lang="ts">
import { useGame } from '~/stores/game'
import { isTvBrowser } from '~/utils/device'

/*
 * Workshop mode: prompts for the facilitator, following the SDA Vision workshop activities.
 * On a smart TV ("Play together") they're short "Talk about it" questions for a family.
 */
const game = useGame()
const tv = isTvBrowser()
const open = ref(window.innerWidth > 900)

const card = computed(() => (tv ? familyCard() : facilitatorCard()))

function familyCard() {
  const r = game.record
  if (game.finished) {
    return { step: 'All done', prompt: 'Which picture surprised you most?', tip: 'The recap shows how everyone voted.' }
  }
  if (game.step === 'arriving' || game.step === 'notice') {
    return { step: 'Notice', prompt: 'What do you spot first? Camera, AI or can\'t tell?', tip: 'No looking anything up yet. Hands up for each choice.' }
  }
  if (game.step === 'done') {
    return { step: 'Reflect', prompt: 'Did anyone change their mind? What changed it?', tip: 'Changing your mind is a good thing.' }
  }
  if (!r.checked.length) {
    return { step: 'Discuss', prompt: 'Who should we ask about this picture, and why?', tip: 'Take turns choosing who to visit.' }
  }
  return { step: 'Check', prompt: 'What did we find out? Does it change your guess?', tip: 'Finding nothing is still a clue.' }
}

function facilitatorCard() {
  const r = game.record
  if (game.finished) {
    return { step: 'Wrap up', prompt: 'Which picture changed the room\'s mind the most, and what changed it?', tip: 'The recap compares the room\'s first and final votes. You can save it as an image or PDF for your notes.' }
  }
  if (game.step === 'arriving' || game.step === 'notice') {
    return { step: 'Activity 1 · Notice', prompt: 'What shapes your first impression of how this was made?', tip: 'Before anyone looks anything up, take a show of hands (camera, AI or can\'t tell) and enter it in the Notice window.' }
  }
  if (game.step === 'done') {
    return { step: 'Activity 4 · Reflect', prompt: 'What have you learned about this picture? How would you describe it when sharing it?', tip: 'Compare the room\'s first vote with the answer. Changing your mind is a good outcome.' }
  }
  if (!r.checked.length) {
    return { step: 'Activity 2 · Discuss', prompt: 'Which names, dates or references could help you trace where this came from?', tip: 'Let the room pick which villager to ask. Disagreement is useful: ask people to say why.' }
  }
  return { step: 'Activity 3 · Check', prompt: 'What did the check find, and how strongly does it point one way?', tip: 'Remember a check that finds nothing is still a finding. When ready, take a final show of hands at the board.' }
}
</script>

<template>
  <aside class="fac panel" :class="{ closed: !open, tv }" :aria-label="tv ? 'Talk about it' : 'Facilitator prompts'">
    <button class="head" :aria-expanded="open" @click="open = !open">
      <UiIcon name="people" />
      <span>{{ tv ? 'Talk about it' : 'Facilitator' }}</span>
    </button>
    <div v-if="open" class="body">
      <p class="step">
        {{ card.step }}
      </p>
      <p class="prompt hand">
        “{{ card.prompt }}”
      </p>
      <p class="tip">
        {{ card.tip }}
      </p>
      <button v-if="game.finished" class="recap" @click="game.open({ kind: 'recap' })">
        Open the recap
      </button>
    </div>
  </aside>
</template>

<style scoped>
.fac {
  position: absolute;
  right: 12px;
  top: 72px;
  width: min(280px, calc(100vw - 24px));
  padding: 4px 6px 8px;
  pointer-events: auto;
  border-color: var(--lilac);
}
.fac.closed {
  width: auto;
}
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 8px;
  border: none;
  background: none;
  font-weight: 700;
  color: #4b3470;
}
.head svg {
  width: 20px;
  height: 20px;
}
.body {
  padding: 0 10px;
}
.step {
  margin: 0 0 4px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.prompt {
  margin: 0 0 8px;
  font-size: 1.2rem;
  line-height: 1.3;
}
.recap {
  margin-top: 10px;
  width: 100%;
  min-height: 40px;
  border: none;
  border-radius: 999px;
  background: var(--lilac);
  color: #2f1f4a;
  font-weight: 700;
}
.tip {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
  line-height: 1.4;
}
/* On a TV the question is read from the sofa. */
.tv .prompt {
  font-size: 1.4rem;
}
.tv .tip {
  font-size: 0.95rem;
}
@media (max-width: 640px) {
  .fac {
    top: auto;
    /* Just above the gull, which sits just above the bottom buttons (see GameHud's --bottom-h). */
    bottom: calc(max(30px, env(safe-area-inset-bottom)) + var(--bottom-h, 64px) + 70px);
  }
}
</style>
