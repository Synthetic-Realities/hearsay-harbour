<script setup lang="ts">
/**
 * Accessible modal built on the native <dialog>: focus trapping, Esc to close
 * and an inert background come for free from the browser.
 */
const props = defineProps<{ title: string, wide?: boolean, kicker?: string }>()
const emit = defineEmits<{ close: [] }>()
const el = ref<HTMLDialogElement>()
const titleId = useId()

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
    :class="{ wide: props.wide }"
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
      <div class="body">
        <slot />
      </div>
      <footer v-if="$slots.footer">
        <slot name="footer" />
      </footer>
    </div>
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
.body {
  padding: 4px 24px 20px;
  overflow: auto;
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
