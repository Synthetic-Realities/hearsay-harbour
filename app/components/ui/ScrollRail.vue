<script setup lang="ts">
/*
 * A visible, draggable green scroll bar for touch screens, where browsers hide theirs.
 * It sits beside a scrolling panel and only shows when there's more to scroll.
 */
const props = defineProps<{ target: HTMLElement | null | undefined }>()

const touch = window.matchMedia('(pointer: coarse)').matches
const show = ref(false)
const top = ref(0)
const size = ref(1)
const atEnd = ref(true)

function measure() {
  const el = props.target
  if (!el) return
  const { scrollTop, scrollHeight, clientHeight } = el
  show.value = touch && scrollHeight > clientHeight + 4
  size.value = Math.max(0.12, clientHeight / scrollHeight)
  top.value = scrollHeight > clientHeight ? (scrollTop / (scrollHeight - clientHeight)) * (1 - size.value) : 0
  atEnd.value = scrollTop + clientHeight >= scrollHeight - 4
}

let ro: ResizeObserver | null = null
watch(() => props.target, (el, old) => {
  old?.removeEventListener('scroll', measure)
  ro?.disconnect()
  if (!el) return
  el.addEventListener('scroll', measure, { passive: true })
  ro = new ResizeObserver(measure)
  ro.observe(el)
  for (const child of el.children) ro.observe(child)
  measure()
}, { immediate: true })
onBeforeUnmount(() => {
  props.target?.removeEventListener('scroll', measure)
  ro?.disconnect()
})

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
  <div v-if="show" class="rail-wrap" aria-hidden="true">
    <div ref="rail" class="rail" @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp">
      <div class="thumb" :style="{ top: `${top * 100}%`, height: `${size * 100}%` }" />
    </div>
    <div v-if="!atEnd" class="more">
      ↓
    </div>
  </div>
</template>

<style scoped>
.rail-wrap {
  position: absolute;
  top: 6px;
  right: 3px;
  bottom: 6px;
  width: 18px;
  z-index: 2;
  pointer-events: none;
}
.rail {
  position: absolute;
  inset: 0 4px;
  border-radius: 999px;
  background: #e2f1dc;
  pointer-events: auto;
  touch-action: none;
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
.more {
  position: absolute;
  right: 18px;
  bottom: 2px;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--leaf);
  color: #fff;
  font-weight: 700;
  box-shadow: var(--shadow);
  animation: hint 1.4s ease-in-out infinite;
}
@keyframes hint {
  50% {
    transform: translateY(3px);
  }
}
</style>
