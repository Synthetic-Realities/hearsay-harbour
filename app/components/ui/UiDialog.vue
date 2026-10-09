<script setup lang="ts">
import { useGame } from '~/stores/game'

/**
 * Accessible modal built on the native <dialog>: focus trapping, Esc to close
 * and an inert background come for free from the browser.
 */
const props = defineProps<{ title: string, wide?: boolean, kicker?: string }>()
const emit = defineEmits<{ close: [] }>()
const el = ref<HTMLDialogElement>()
const titleId = useId()
const body = ref<HTMLElement>()
const game = useGame()

/*
 * The side zones: left closes, right presses the window's own "continue" button (the footer
 * button marked data-continue), keeping its label and whether it's ready yet.
 */
const footer = ref<HTMLElement>()
const cont = ref<{ label: string, disabled: boolean } | null>(null)
function readContinue() {
  const b = footer.value?.querySelector<HTMLButtonElement>('[data-continue]')
  cont.value = b ? { label: b.textContent?.trim() ?? 'Continue', disabled: b.disabled } : null
}
let mo: MutationObserver | undefined
onMounted(() => {
  readContinue()
  if (footer.value) {
    mo = new MutationObserver(readContinue)
    mo.observe(footer.value, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'data-continue'] })
  }
})
onBeforeUnmount(() => mo?.disconnect())
// Not ready to continue yet, but more to see below (Reflect's second question): the right zone scrolls.
const moreBelow = ref(false)
function readScroll() {
  const b = body.value
  moreBelow.value = !!b && b.scrollTop + b.clientHeight < b.scrollHeight - 8
}
onMounted(() => {
  body.value?.addEventListener('scroll', readScroll, { passive: true })
  readScroll()
  setTimeout(readScroll, 400)
})
const scrollMode = computed(() => !!cont.value?.disabled && moreBelow.value)
function onContinue() {
  if (scrollMode.value) {
    body.value?.scrollBy({ top: body.value.clientHeight * 0.7, behavior: 'smooth' })
    return
  }
  footer.value?.querySelector<HTMLButtonElement>('[data-continue]:not(:disabled)')?.click()
}

onMounted(() => el.value?.showModal())

function onBackdrop(ev: MouseEvent) {
  if (ev.target === el.value) emit('close')
}
function onCancel(ev: Event) {
  ev.preventDefault()
  emit('close')
}
</script>

<template>
  <dialog
    ref="el"
    class="dialog"
    :class="{ wide: props.wide, tv: game.arcade }"
    :aria-labelledby="titleId"
    @cancel="onCancel"
    @click="onBackdrop"
  >
    <div class="sheet">
      <header>
        <div>
          <p v-if="kicker" class="kicker">
            {{ kicker }}
          </p>
          <h2 :id="titleId">
            {{ title }}
          </h2>
        </div>
        <button class="close" aria-label="Close" @click="emit('close')">
          <UiIcon name="close" />
        </button>
      </header>
      <div class="body-wrap">
        <div ref="body" class="body">
          <slot />
        </div>
        <ScrollRail :target="body" />
      </div>
      <footer v-if="$slots.footer" ref="footer">
        <slot name="footer" />
      </footer>
    </div>
    <SideZones
      :back-label="cont ? 'Back' : 'Close'"
      :continue-label="scrollMode ? 'More below' : cont?.label"
      :continue-disabled="cont?.disabled && !scrollMode"
      :continue-icon="scrollMode ? '↓' : undefined"
      @back="emit('close')"
      @continue="onContinue"
    />
  </dialog>
</template>

<style scoped>
.dialog {
  padding: 0;
  border: none;
  background: transparent;
  max-width: min(600px, calc(100vw - 24px));
  width: 100%;
  max-height: calc(100dvh - 32px);
  color: var(--ink);
  overflow: visible;
}
.dialog.wide {
  max-width: min(900px, calc(100vw - 24px));
}
/* TV and arcade mode: leave room either side for the big back and continue zones. */
.dialog.tv {
  max-width: min(600px, calc(100vw - 200px));
}
.dialog.wide.tv {
  max-width: min(900px, calc(100vw - 200px));
}
.dialog[open] {
  animation: pop var(--dur) var(--ease);
}
.dialog::backdrop {
  background: rgba(90, 60, 30, 0.28);
  backdrop-filter: blur(3px);
}
.sheet {
  background: var(--paper);
  border: var(--panel-border);
  border-radius: 28px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 32px);
  overflow: hidden;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 8px 24px;
}
.kicker {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
h2 {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 700;
}
.close {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--paper-2);
  display: grid;
  place-items: center;
}
.close svg {
  width: 22px;
  height: 22px;
}
.body-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}
.body {
  flex: 1;
  min-width: 0;
  padding: 4px 24px 20px;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}
/* When there's more to scroll, the green rail (see ScrollRail) shows; make room for it. */
.body.hh-has-rail {
  padding-right: 36px;
}
footer {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
  padding: 14px 24px 20px;
  border-top: 2px dashed var(--line);
}
@keyframes pop {
  from {
    transform: scale(0.96) translateY(8px);
  }
}
</style>
