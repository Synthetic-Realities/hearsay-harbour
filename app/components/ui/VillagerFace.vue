<script setup lang="ts">
import { VILLAGERS, type VillagerId } from '~/utils/content'

/* Portraits of the three villagers, drawn to match their island models. */
const props = defineProps<{ who: VillagerId }>()
const v = computed(() => VILLAGERS[props.who])
</script>

<template>
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="98" r="44" :fill="v.coat" />
    <!-- Pip's pigtail puffs sit behind the head -->
    <template v-if="who === 'pip'">
      <circle cx="21" cy="32" r="13" :fill="v.hair" />
      <circle cx="79" cy="32" r="13" :fill="v.hair" />
      <circle cx="28" cy="38" r="4" :fill="v.accent" />
      <circle cx="72" cy="38" r="4" :fill="v.accent" />
    </template>
    <circle cx="50" cy="50" r="27" :fill="v.skin" />
    <template v-if="who === 'pip'">
      <path d="M23 46a27 27 0 0 1 54 0c-4-9-14-15-27-15s-23 6-27 15z" :fill="v.hair" />
    </template>
    <template v-else-if="who === 'moss'">
      <path d="M23 47c0-16 12-27 27-27s27 11 27 27c-5-6-9-9-13-9 1 3 0 5-2 6-2-5-7-8-13-8-4 4-10 6-17 5 0 2-1 4-2 5-2-3-4-3-7 1z" :fill="v.hair" />
      <g fill="#c8743f">
        <circle cx="35" cy="58" r="1.4" />
        <circle cx="39" cy="61" r="1.4" />
        <circle cx="33" cy="62" r="1.2" />
        <circle cx="65" cy="58" r="1.4" />
        <circle cx="61" cy="61" r="1.4" />
        <circle cx="67" cy="62" r="1.2" />
      </g>
    </template>
    <template v-else-if="who === 'jim'">
      <!-- Jim: grey hair pulled back into a ponytail, salt-and-pepper beard, rectangular glasses, a frown, tattooed arms folded -->
      <path d="M24 46c-1-16 11-27 26-27s27 11 26 27c-4-8-9-13-15-15-4 2-8 3-11 3s-7-1-11-3c-6 2-11 7-15 15z" :fill="v.hair" />
      <path d="M36 26c4 2 9 3 14 3M52 25c4 1 8 3 11 6" stroke="#bdb8b0" stroke-width="1.4" fill="none" stroke-linecap="round" />
      <path d="M74 44c6 2 9 8 8 16-1 6-4 10-7 12 1-6 1-12-1-17z" :fill="v.hair" />
      <rect x="73" y="43" width="5" height="5" rx="1.5" fill="#3d3a4b" transform="rotate(20 75 45)" />
      <path d="M26 54c2 18 12 28 24 28s22-10 24-28c-4 6-9 8-14 8-3-3-6-4-10-4s-7 1-10 4c-5 0-10-2-14-8z" :fill="v.hair" />
      <g fill="#4a4744">
        <circle cx="38" cy="70" r="1.3" />
        <circle cx="47" cy="75" r="1.2" />
        <circle cx="56" cy="71" r="1.3" />
        <circle cx="62" cy="66" r="1.1" />
        <circle cx="43" cy="66" r="1.1" />
      </g>
      <rect x="33" y="46" width="14" height="10" rx="2" fill="none" stroke="#2b2230" stroke-width="2" />
      <rect x="53" y="46" width="14" height="10" rx="2" fill="none" stroke="#2b2230" stroke-width="2" />
      <path d="M47 51h6" stroke="#2b2230" stroke-width="2" />
      <path d="M33 41l12 3M67 41l-12 3" stroke="#4a4744" stroke-width="3" stroke-linecap="round" />
      <path d="M44 66q6-3 12 0" stroke="#5b3a24" stroke-width="2.2" fill="none" stroke-linecap="round" />
      <rect x="18" y="86" width="64" height="12" rx="6" :fill="v.skin" />
      <g :fill="v.accent">
        <path d="M28 88l3 4 3-4-3-1z" />
        <circle cx="45" cy="92" r="2.5" />
        <path d="M60 88h8v2h-8zM62 93h6v2h-6z" />
        <path d="M74 89l2 4 2-4z" />
      </g>
    </template>
    <template v-else>
      <!-- Wren: white beard and a turban with its folds meeting at the front -->
      <path d="M26 54c2 18 12 28 24 28s22-10 24-28c-4 6-9 8-14 8-3-3-6-4-10-4s-7 1-10 4c-5 0-10-2-14-8z" :fill="v.hair" />
      <path d="M40 63c3-2 6-3 10-3s7 1 10 3c-3 1-7 1-10 0-3 1-7 1-10 0z" :fill="v.hair" stroke="#d9d3c8" stroke-width="0.6" />
      <path d="M22 44c0-16 12-28 28-28s28 12 28 28c-6-4-14-6-20-5l-8 6-8-6c-6-1-14 1-20 5z" :fill="v.accent" />
      <path d="M50 45l-8-6c-6-1-14 1-20 5" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.6" />
      <path d="M50 45l8-6c6-1 14 1 20 5" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.6" />
      <circle cx="40" cy="51" r="6" fill="none" stroke="#5b3a24" stroke-width="1.6" />
      <circle cx="60" cy="51" r="6" fill="none" stroke="#5b3a24" stroke-width="1.6" />
      <path d="M46 51h8" stroke="#5b3a24" stroke-width="1.6" />
    </template>
    <circle cx="40" cy="51" r="3.2" fill="#2b2230" />
    <circle cx="60" cy="51" r="3.2" fill="#2b2230" />
    <template v-if="who === 'pip' || who === 'moss'">
      <ellipse cx="33" cy="60" rx="5" ry="3" fill="#ff9fb5" opacity="0.8" />
      <ellipse cx="67" cy="60" rx="5" ry="3" fill="#ff9fb5" opacity="0.8" />
      <path d="M44 63q6 5 12 0" stroke="#5b3a24" stroke-width="2.5" fill="none" stroke-linecap="round" />
    </template>
  </svg>
</template>
