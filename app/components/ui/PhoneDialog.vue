<script setup lang="ts">
import { renderSVG } from 'uqr'
import { useGame } from '~/stores/game'

/*
 * Play on a phone or tablet: scan the code, then add the game to the home screen so it
 * opens full screen like an app and works offline. No app store needed.
 */
const game = useGame()
const PUBLIC_URL = 'https://synthetic-realities.github.io/hearsay-harbour/'
const qr = renderSVG(PUBLIC_URL, { border: 1, whiteColor: '#fffaf0', blackColor: '#3d3a4b' })
const onPhone = window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 900
const installed = window.matchMedia('(display-mode: standalone)').matches

// Android/Chrome offers a direct install prompt; iPhone uses Safari's Share menu instead.
const installEvent = ref<(Event & { prompt: () => Promise<void> }) | null>(null)
const onPrompt = (e: Event) => {
  e.preventDefault()
  installEvent.value = e as Event & { prompt: () => Promise<void> }
}
onMounted(() => window.addEventListener('beforeinstallprompt', onPrompt))
onBeforeUnmount(() => window.removeEventListener('beforeinstallprompt', onPrompt))
async function install() {
  await installEvent.value?.prompt()
  installEvent.value = null
}

const copied = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(PUBLIC_URL)
    copied.value = true
  }
  catch {
    copied.value = false
  }
}
</script>

<template>
  <UiDialog kicker="Phones and tablets" :title="installed ? 'You\'re playing the app version' : 'Play on your phone'" @close="game.close()">
    <div class="layout" :class="{ phone: onPhone }">
      <div v-if="!onPhone" class="qr-col">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="qr" role="img" :aria-label="`QR code for ${PUBLIC_URL}`" v-html="qr" />
        <p class="soft">
          Scan with your phone's camera
        </p>
      </div>
      <div class="words">
        <p v-if="!onPhone">
          Hearsay Harbour works on phones and tablets: tap to hop, pinch to zoom, drag to look around.
        </p>
        <a class="big-btn open" :href="PUBLIC_URL" target="_blank" rel="noopener">
          Open the phone version <UiIcon name="arrow" class="arr" />
        </a>
        <p class="url">
          <code>{{ PUBLIC_URL }}</code>
          <button class="copy" @click="copy">
            {{ copied ? 'Copied' : 'Copy link' }}
          </button>
        </p>
        <h3>Keep it on your home screen</h3>
        <p class="soft">
          It then opens full screen like an app, and works offline once you've played it.
        </p>
        <button v-if="installEvent" class="big-btn" @click="install">
          Install Hearsay Harbour
        </button>
        <ul class="how">
          <li><strong>iPhone or iPad:</strong> open the link in Safari, tap the Share button, then <em>Add to Home Screen</em>.</li>
          <li><strong>Android:</strong> open the link in Chrome, tap the three-dot menu, then <em>Install app</em> or <em>Add to Home screen</em>.</li>
        </ul>
      </div>
    </div>
    <template #footer>
      <button autofocus class="big-btn" @click="game.close()">
        Done
      </button>
    </template>
  </UiDialog>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}
.layout.phone {
  grid-template-columns: 1fr;
}
.qr-col {
  display: grid;
  gap: 6px;
  justify-items: center;
}
.qr {
  width: 190px;
  padding: 8px;
  border-radius: 18px;
  background: #fffaf0;
  border: 2px solid var(--line);
}
.qr :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}
p {
  margin: 0 0 10px;
  line-height: 1.5;
}
.soft {
  color: var(--ink-soft);
  font-size: 0.9rem;
}
.open {
  margin: 0 0 12px;
  text-decoration: none;
}
.arr {
  width: 20px;
  height: 20px;
}
.url {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
code {
  padding: 4px 8px;
  border-radius: 8px;
  background: var(--paper-2);
  font-size: 0.85rem;
  overflow-wrap: anywhere;
}
.copy {
  padding: 4px 12px;
  border-radius: 999px;
  border: 2px solid var(--line);
  background: #fff;
  font-weight: 600;
  font-size: 0.85rem;
}
h3 {
  margin: 12px 0 4px;
  font-size: 1.05rem;
}
.how {
  margin: 10px 0 0;
  padding-left: 1.2em;
  display: grid;
  gap: 6px;
  font-size: 0.92rem;
  line-height: 1.45;
}
@media (max-width: 600px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
