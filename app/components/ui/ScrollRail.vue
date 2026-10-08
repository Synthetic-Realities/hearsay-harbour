<script setup lang="ts">
/*
 * A visible green scroll bar for every pop-up window that has more to show. It works with
 * touch, a mouse, a keyboard or a TV remote: drag the thumb, tap the track, or press the
 * ▲ ▼ buttons (they can be reached with Tab or a remote's arrow keys). The browser's own
 * scroll bar is hidden while it shows, so there's only one.
 */
const props = defineProps<{ target: HTMLElement | null | undefined }>()

const show = ref(false)
const top = ref(0)
const size = ref(1)
const atStart = ref(true)
const atEnd = ref(true)

function measure() {
  const el = props.target
  if (!el) return
  const { scrollTop, scrollHeight, clientHeight } = el
  show.value = scrollHeight > clientHeight + 4
  el.classList.toggle('hh-has-rail', show.value)
  size.value = Math.max(0.12, clientHeight / scrollHeight)
  top.value = scrollHeight > clientHeight ? (scrollTop / (scrollHeight - clientHeight)) * (1 - size.value) : 0
  atStart.value = scrollTop <= 4
  atEnd.value = scrollTop + clientHeight >= scrollHeight - 4
}

let ro: ResizeObserver | null = null
let mo: MutationObserver | null = null
watch(() => props.target, (el, old) => {
  old?.removeEventListener('scroll', measure)
  old?.classList.remove('hh-has-rail')
  ro?.disconnect()
  mo?.disconnect()
  if (!el) return
  el.addEventListener('scroll', measure, { passive: true })
  ro = new ResizeObserver(measure)
  ro.observe(el)
  for (const child of el.children) ro.observe(child)
  // Content that appears later (an opened panel, a new message) can make it scrollable.
  mo = new MutationObserver(() => requestAnimationFrame(measure))
  mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'class'] })
  measure()
}, { immediate: true })
onBeforeUnmount(() => {
  props.target?.removeEventListener('scroll', measure)
  props.target?.classList.remove('hh-has-rail')
  ro?.disconnect()
  mo?.disconnect()
})

function step(dir: 1 | -1) {
  const el = props.target
  if (el) el.scrollBy({ top: dir * el.clientHeight * 0.8, behavior: 'smooth' })
}

// Drag the thumb (or tap the track) to scroll.
const rail = ref<HTMLElement>()
let dragFrom: { y: number, scroll: number } | null = null
function onDown(ev: PointerEvent) {
  const el = props.target
  if (!el || !rail.value) return
  ev.preventDefault()
  ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
  if ((ev.target as HTMLElement).classList.contains('thumb')) {
    dragFrom = { y: ev.clientY, scroll: el.scrollTop }
    return
  }
  const r = rail.value.getBoundingClientRect()
  const f = (ev.clientY - r.top) / r.height
  el.scrollTo({ top: f * el.scrollHeight - el.clientHeight / 2, behavior: 'smooth' })
}
function onMove(ev: PointerEvent) {
  const el = props.target
  if (!dragFrom || !el || !rail.value) return
  const r = rail.value.getBoundingClientRect()
  el.scrollTop = dragFrom.scroll + ((ev.clientY - dragFrom.y) / r.height) * el.scrollHeight
}
function onUp() {
  dragFrom = null
}
</script>

<template>
  <div v-if="show" class="rail-wrap">
    <button type="button" class="step" :disabled="atStart" aria-label="Scroll up" @click="step(-1)">
      ▲
    </button>
    <div ref="rail" class="rail" aria-hidden="true" @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp">
      <div class="thumb" :style="{ top: `${top * 100}%`, height: `${size * 100}%` }" />
    </div>
    <button type="button" class="step" :class="{ more: !atEnd }" :disabled="atEnd" aria-label="Scroll down" @click="step(1)">
      ▼
    </button>
  </div>
</template>

<style scoped>
.rail-wrap {
  position: absolute;
  top: 6px;
  right: 3px;
  bottom: 6px;
  width: 26px;
  z-index: 2;
  display: grid;
  grid-template-rows: auto 1fr auto;
  justify-items: center;
  gap: 4px;
}
.rail {
  position: relative;
  width: 12px;
  border-radius: 999px;
  background: #e2f1dc;
  touch-action: none;
  cursor: pointer;
}
.thumb {
  position: absolute;
  left: 0;
  right: 0;
  min-height: 28px;
  border-radius: 999px;
  background: var(--leaf);
  box-shadow: inset 0 0 0 1.5px var(--leaf-deep);
}
.step {
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--leaf);
  color: #fff;
  font-size: 0.7rem;
  line-height: 1;
  box-shadow: var(--shadow);
}
.step:disabled {
  background: #e2f1dc;
  color: #9cc59a;
  box-shadow: none;
}
.step.more {
  animation: hint 1.4s ease-in-out infinite;
}
.step:focus-visible {
  box-shadow: 0 0 0 3px var(--paper), 0 0 0 6px var(--leaf-deep) !important;
}
@keyframes hint {
  50% {
    transform: translateY(3px);
  }
}
</style>

<style>
/* While the green rail shows, hide the browser's own scroll bar so there's only one. */
.hh-has-rail {
  scrollbar-width: none;
}
.hh-has-rail::-webkit-scrollbar {
  display: none;
}
</style>
