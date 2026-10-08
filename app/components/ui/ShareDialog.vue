<script setup lang="ts">
import { sfx } from '~/audio/sfx'
import { LEAN_WORDS } from '~/utils/content'
import { useGame } from '~/stores/game'

const game = useGame()
onMounted(() => sfx.gull())
</script>

<template>
  <UiDialog kicker="The Share gull" title="Share it right now?" @close="game.close()">
    <p class="squawk hand">
      “Squawk! Everyone's already sharing it! Post it with your first impression. Who needs checking?”
    </p>
    <p>
      Your first impression was <span class="tag" :class="game.record.firstLean ?? 'unsure'">{{ LEAN_WORDS[game.record.firstLean ?? 'unsure'] }}</span>.
      You have <strong>{{ game.evidenceCount }}</strong> piece{{ game.evidenceCount === 1 ? '' : 's' }} of evidence in your satchel.
    </p>
    <p class="soft">
      Sharing now pins your first impression with a loud caption. If it's wrong, the village loses a lot of trust.
    </p>
    <template #footer>
      <button class="big-btn quiet" @click="game.shareNow()">
        Share it anyway
      </button>
      <button autofocus class="big-btn" @click="game.close()">
        Shoo, gull. I'll check first.
      </button>
    </template>
  </UiDialog>
</template>

<style scoped>
.squawk {
  margin: 0 0 12px;
  padding: 10px 14px;
  border-radius: 14px;
  background: #fff;
  border: 2px solid var(--line);
  font-size: 1.2rem;
}
p {
  line-height: 1.5;
}
.soft {
  color: var(--ink-soft);
  margin-bottom: 0;
}
</style>
