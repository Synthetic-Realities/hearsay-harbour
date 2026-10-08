<script setup lang="ts">
export type IconName = 'close' | 'help' | 'sound' | 'mute' | 'eye' | 'chat' | 'search' | 'pin' | 'flower' | 'satchel' | 'check' | 'gull' | 'arrow' | 'map' | 'book' | 'people' | 'download' | 'plus' | 'minus' | 'target'
defineProps<{ name: IconName }>()
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <template v-if="name === 'close'">
      <path d="M6 6l12 12M18 6 6 18" />
    </template>
    <template v-else-if="name === 'help'">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6v.6M12 17.2v.1" />
    </template>
    <template v-else-if="name === 'sound'">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </template>
    <template v-else-if="name === 'mute'">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </template>
    <template v-else-if="name === 'eye'">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </template>
    <template v-else-if="name === 'chat'">
      <path d="M4 5.5h16v10H10l-4.5 3.5v-3.5H4z" />
      <path d="M8 10.5h.1M12 10.5h.1M16 10.5h.1" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </template>
    <template v-else-if="name === 'pin'">
      <circle cx="12" cy="8" r="4.5" />
      <path d="M12 12.5V21" />
    </template>
    <template v-else-if="name === 'flower'">
      <circle cx="12" cy="9" r="2.2" />
      <path d="M12 6.8c0-2.5 3-2.5 3 0 2.5 0 2.5 3 0 3 0 2.5-3 2.5-3 0 0 2.5-3 2.5-3 0-2.5 0-2.5-3 0-3 0-2.5 3-2.5 3 0z" />
      <path d="M12 12v9M12 17c-2-2-4-1.5-4.5-1.5M12 17c2-2 4-1.5 4.5-1.5" />
    </template>
    <template v-else-if="name === 'satchel'">
      <path d="M5 9h14v10a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19z" />
      <path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2M5 13h14" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </template>
    <template v-else-if="name === 'gull'">
      <path d="M2.5 10c3-2 5.5-1.5 7.5 1.5 1.3-2 3.5-3.5 6-3.5 2 0 4 1 5.5 2.5" />
      <path d="M10 11.5c1 2.5 3 4 6 4" />
    </template>
    <template v-else-if="name === 'map'">
      <path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5L3.5 20z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </template>
    <template v-else-if="name === 'book'">
      <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" />
      <path d="M12 6.5v13" />
    </template>
    <template v-else-if="name === 'people'">
      <circle cx="9" cy="8.5" r="3" />
      <circle cx="16.5" cy="9.5" r="2.4" />
      <path d="M3.5 19c.5-3.5 3-5.5 5.5-5.5s5 2 5.5 5.5M14.5 14c2.5-.5 5 1 5.8 4.5" />
    </template>
    <template v-else-if="name === 'download'">
      <path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'minus'">
      <path d="M5 12h14" />
    </template>
    <template v-else-if="name === 'target'">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5" />
    </template>
    <template v-else-if="name === 'arrow'">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </template>
  </svg>
</template>
