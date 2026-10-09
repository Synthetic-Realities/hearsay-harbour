<script setup lang="ts">
/*
 * Big tap zones either side of a pop-up: left goes back, right continues. They fill the space
 * beside the window from top to bottom, so a smart TV's on-screen pointer (or a quick tap)
 * doesn't need to land on a small button. They only show where there's room for them.
 * The keyboard and arcade highlight skip them: they repeat buttons that are already there.
 */
const props = defineProps<{
  backLabel: string
  continueLabel?: string | null
  continueDisabled?: boolean
  continueIcon?: string
}>()
const emit = defineEmits<{ back: [], continue: [] }>()

const room = ref(false)
const zone = ref<HTMLElement>()
function measure() {
  room.value = (zone.value?.getBoundingClientRect().width ?? 0) >= 72
}
onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
  // The window pops in with an animation; measure again once it has settled.
  setTimeout(measure, 400)
})
onBeforeUnmount(() => window.removeEventListener('resize', measure))
</script>

<template>
  <button
    ref="zone"
    type="button"
    class="zone left"
    :class="{ show: room }"
    tabindex="-1"
    aria-hidden="true"
    @mousedown.prevent
    @click.stop="emit('back')"
  >
    <span class="chev">‹</span>
    <span class="label">{{ props.backLabel }}</span>
  </button>
  <button
    v-if="props.continueLabel"
    type="button"
    class="zone right"
    :class="{ show: room, off: props.continueDisabled }"
    tabindex="-1"
    aria-hidden="true"
    :disabled="props.continueDisabled"
    @mousedown.prevent
    @click.stop="emit('continue')"
  >
    <span class="chev" :class="{ small: props.continueIcon }">{{ props.continueIcon ?? '›' }}</span>
    <span class="label">{{ props.continueLabel }}</span>
  </button>
</template>

<style scoped>
/* Inside the <dialog>: from the window's edge out to the screen's edge, full height. */
.zone {
  position: absolute;
  top: calc((100% - 100dvh) / 2);
  height: 100dvh;
  width: calc((100vw - 100%) / 2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 8px;
  border: none;
  background: transparent;
  color: #fff;
  opacity: 0;
  pointer-events: none;
  transition: background var(--dur), opacity var(--dur);
}
.zone.show {
  opacity: 1;
  pointer-events: auto;
}
.zone.left {
  right: 100%;
}
.zone.right {
  left: 100%;
}
.zone:hover:not(:disabled) {
  background: rgba(255, 250, 240, 0.16);
}
.chev {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--paper);
  color: var(--ink);
  font-size: 2.6rem;
  line-height: 1;
  box-shadow: var(--shadow);
}
.chev.small {
  font-size: 2rem;
}
.right .chev {
  background: var(--honey);
  color: #4a2c14;
}
.label {
  max-width: 150px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(60, 40, 20, 0.55);
  font-weight: 700;
  font-size: 0.9rem;
  text-align: center;
  line-height: 1.25;
}
.zone.off {
  cursor: not-allowed;
}
.zone.off .chev {
  background: var(--paper-2);
  color: var(--ink-soft);
  opacity: 0.6;
}
</style>
