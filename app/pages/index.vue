<script setup lang="ts">
import { setMuted } from '~/audio/sfx'
import { pictureUrl } from '~/utils/content'
import { useGame } from '~/stores/game'

const game = useGame()
const dev = import.meta.dev

// Save the day as it goes, so a refresh (or a projector hiccup) doesn't lose it.
watch(() => [game.index, game.step, game.trust, game.records, game.muted, game.workshop], () => game.save(), { deep: true })
watch(() => game.muted, m => setMuted(m), { immediate: true })
const dialog = computed(() => game.dialog)

// Preload the pictures so dialogs open instantly.
onMounted(() => {
  for (const p of game.pictures) new Image().src = pictureUrl(p.src)
})

// The sky warms from morning to dusk as the day's pictures go by.
const sky = computed(() => {
  const t = Math.min(1, game.index / game.pictures.length)
  const mix = (a: number[], b: number[]) => `rgb(${a.map((v, i) => Math.round(v + (b[i]! - v) * t)).join(',')})`
  return `linear-gradient(180deg, ${mix([255, 231, 194], [255, 196, 160])} 0%, ${mix([207, 232, 255], [214, 196, 236])} 100%)`
})
</script>

<template>
  <main class="game" :style="{ background: sky }">
    <h1 class="sr-only">
      Hearsay Harbour
    </h1>
    <GameCanvas />
    <WorldTags />
    <TitleScreen v-if="!game.started" />
    <GameHud v-else />

    <WelcomeGuide v-if="dialog?.kind === 'guide'" :key="`guide-${dialog.page}`" :page="dialog.page" />
    <NoticeDialog v-else-if="dialog?.kind === 'notice'" />
    <TalkDialog v-else-if="dialog?.kind === 'talk'" :key="dialog.who" :who="dialog.who" />
    <CheckDialog v-else-if="dialog?.kind === 'check'" :key="dialog.id" :id="dialog.id" />
    <ReflectDialog v-else-if="dialog?.kind === 'reflect'" />
    <RevealDialog v-else-if="dialog?.kind === 'reveal'" />
    <ShareDialog v-else-if="dialog?.kind === 'share'" />
    <RecapDialog v-else-if="dialog?.kind === 'recap'" />
    <HelpDialog v-else-if="dialog?.kind === 'help'" />
    <MapDialog v-else-if="dialog?.kind === 'map'" />
    <CreditsDialog v-else-if="dialog?.kind === 'credits'" />
    <RewardDialog v-else-if="dialog?.kind === 'reward'" />
    <StudioDialog v-else-if="dev && dialog?.kind === 'studio'" />

    <div class="sr-only" aria-live="polite">
      {{ game.announcement }}
    </div>
  </main>
</template>

<style scoped>
.game {
  position: fixed;
  inset: 0;
  transition: background 2s;
}
</style>
