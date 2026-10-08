<script setup lang="ts">
import { sfx } from '~/audio/sfx'

/*
 * Label crate: prise off the planks to see the labels packed inside, standing in
 * for reading a file's details (metadata).
 */
const emit = defineEmits<{ done: [] }>()
const planks = ref([true, true, true])
const left = computed(() => planks.value.filter(Boolean).length)

function prise(i: number) {
  if (!planks.value[i]) return
  planks.value[i] = false
  sfx.creak()
  if (!left.value) setTimeout(() => emit('done'), 600)
}
</script>

<template>
  <div class="crate">
    <div class="box">
      <div class="inside" aria-hidden="true">
        <span class="label">camera: ?</span>
        <span class="label">date: ?</span>
        <span class="label">size ✓</span>
      </div>
      <button
        v-for="(on, i) in planks"
        :key="i"
        class="plank"
        :class="{ off: !on }"
        :style="{ top: `${12 + i * 30}%`, '--tilt': `${(i - 1) * 4}deg` }"
        :disabled="!on"
        :aria-label="`Prise off plank ${i + 1}`"
        @click="prise(i)"
      />
    </div>
    <p class="hand msg" role="status">
      {{ left ? `Tap the planks to prise them off (${left} left).` : 'Open! Let\'s read the labels…' }}
    </p>
  </div>
</template>

<style scoped>
.crate {
  display: grid;
  gap: 8px;
  justify-items: start;
}
.box {
  position: relative;
  width: min(100%, 300px);
  aspect-ratio: 5 / 3;
  border-radius: 12px;
  background: #b88a5c;
  border: 6px solid #a47650;
  overflow: hidden;
}
.inside {
  position: absolute;
  inset: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-content: center;
  justify-content: center;
  background: #8a5f3c;
  border-radius: 6px;
}
.label {
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--paper);
  font-family: var(--font-hand);
  transform: rotate(-3deg);
}
.label:nth-child(2) {
  transform: rotate(4deg);
}
.plank {
  position: absolute;
  left: -4%;
  width: 108%;
  height: 26%;
  border: none;
  border-radius: 6px;
  background: repeating-linear-gradient(90deg, #d9a46b 0 40px, #cf9a61 40px 80px);
  box-shadow: inset 0 -4px 0 rgba(120, 70, 30, 0.35);
  transform: rotate(var(--tilt));
  transition: transform 420ms var(--ease), opacity 420ms;
}
.plank:hover:not(:disabled) {
  transform: rotate(var(--tilt)) translateY(-3px);
}
.plank.off {
  transform: translate(60%, -80%) rotate(30deg);
  opacity: 0;
  pointer-events: none;
}
.msg {
  margin: 0;
}
</style>
