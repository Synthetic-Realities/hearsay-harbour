<script setup lang="ts">
import { hexToWorld } from '~/utils/hex'
import { BOARD_TILE_COLOR, LIGHTHOUSE, PIER, PLACE_BY_ID, PLACES, type PlaceId, TERRAIN_COLORS, buildWorld } from '~/utils/world'

/*
 * A flat, labelled map of the island drawn from the same layout as the 3D scene,
 * so it can never disagree with what you see.
 */
const props = defineProps<{ highlight?: PlaceId[], you?: { x: number, z: number } | null, compact?: boolean }>()

const world = buildWorld()
const S = 10
const hexPts = (() => {
  const r = 0.94 * S
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`
  }).join(' ')
})()

const land = world.tiles
  .filter(t => t.terrain !== 'water')
  .map((t) => {
    const { x, z } = hexToWorld(t.hex)
    return { key: t.key, x: x * S, y: z * S, fill: t.terrain === 'pier' ? '#c49a6c' : t.key === `${PLACE_BY_ID.board.at.q},${PLACE_BY_ID.board.at.r}` ? BOARD_TILE_COLOR : TERRAIN_COLORS[t.terrain] }
  })

const KIND: Record<PlaceId, { color: string, kind: 'person' | 'tool' | 'home' }> = {
  board: { color: '#ffb627', kind: 'home' },
  wren: { color: '#c6b3e6', kind: 'person' },
  pip: { color: '#ffcf4d', kind: 'person' },
  moss: { color: '#7fbf7a', kind: 'person' },
  jim: { color: '#8a8fa3', kind: 'person' },
  seal: { color: '#d1495b', kind: 'tool' },
  tide: { color: '#6fb7ea', kind: 'tool' },
  crate: { color: '#d9a46b', kind: 'tool' },
}

const places = PLACES.map((p) => {
  const { x, z } = hexToWorld(p.at)
  return { ...p, x: x * S, y: z * S, ...KIND[p.id] }
})
// Fit the land and every place (the tide search sits out in the water).
const xs = [...land.map(l => l.x), ...places.map(p => p.x)]
const ys = [...land.map(l => l.y), ...places.map(p => p.y)]
const pad = 16
const box = { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad - 6, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 + 10 }
const lh = hexToWorld(LIGHTHOUSE)
const pier = PIER.map(h => hexToWorld(h))
const lit = (id: PlaceId) => !props.highlight || props.highlight.includes(id)
</script>

<template>
  <svg :viewBox="`${box.x} ${box.y} ${box.w} ${box.h}`" class="map" :class="{ compact }" role="img" aria-label="Map of Hearsay Harbour">
    <rect :x="box.x" :y="box.y" :width="box.w" :height="box.h" rx="14" fill="#8fd3e8" />
    <polygon v-for="t in land" :key="t.key" :points="hexPts" :transform="`translate(${t.x} ${t.y})`" :fill="t.fill" stroke="#fffaf0" stroke-width="1.2" />
    <rect v-for="(p, i) in pier" :key="i" :x="p.x * S - 6" :y="p.z * S - 8" width="12" height="16" rx="2" fill="#b88a5c" />
    <g :transform="`translate(${lh.x * S} ${lh.z * S})`">
      <rect x="-3" y="-9" width="6" height="12" rx="1.5" fill="#fffaf0" stroke="#e86a5a" stroke-width="1.2" />
      <circle cy="-10" r="2.6" fill="#e86a5a" />
    </g>
    <g v-for="p in places" :key="p.id" :transform="`translate(${p.x} ${p.y})`" :opacity="lit(p.id) ? 1 : 0.35" class="place">
      <circle r="6.2" :fill="p.color" stroke="#fff" stroke-width="1.8" />
      <circle v-if="p.kind === 'person'" r="2.4" cy="-0.6" fill="#ffd9b8" />
      <path v-else-if="p.kind === 'tool'" d="M-2.2 -2.2a2.2 2.2 0 1 1 0.01 0M1.3 1.3l2 2" stroke="#fff" stroke-width="1.3" fill="none" stroke-linecap="round" />
      <rect v-else x="-3" y="-2.2" width="6" height="4.4" rx="0.8" fill="#fff" />
      <g v-if="!compact" :transform="p.id === 'board' ? 'translate(0 -24)' : undefined">
        <rect :x="-p.label.length * 2.15 - 4" y="7.5" :width="p.label.length * 4.3 + 8" height="9" rx="4.5" fill="#fffaf0" stroke="#f0dcc0" stroke-width="0.8" />
        <text y="14.2" text-anchor="middle" font-size="6.2" font-weight="600" fill="#5b3a24" font-family="Fredoka, sans-serif">{{ p.label }}</text>
      </g>
    </g>
    <g v-if="you" :transform="`translate(${you.x * S} ${you.z * S})`" class="you">
      <circle r="4.4" fill="#3d3a4b" stroke="#fff" stroke-width="1.5" />
      <path d="M-1.4 0.5l1.4 2.2 1.4-2.2z" fill="#ff8a3d" />
    </g>
  </svg>
</template>

<style scoped>
.map {
  display: block;
  width: 100%;
  height: auto;
}
.you {
  animation: bob 1.4s ease-in-out infinite;
}
@keyframes bob {
  50% {
    opacity: 0.6;
  }
}
</style>
