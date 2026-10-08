// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  // Server-only: where the dev Studio drops uploaded pictures (see content-inbox/README.md).
  runtimeConfig: {
    inboxDir: fileURLToPath(new URL('./content-inbox', import.meta.url)),
  },
  compatibilityDate: '2026-09-01',
  devtools: { enabled: false },
  modules: ['@tresjs/nuxt', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  // Components are named by file name only (ui/TalkDialog.vue → <TalkDialog>).
  components: [{ path: '~/components', pathPrefix: false }],
  app: {
    buildAssetsDir: '/assets/',
    head: {
      title: 'Hearsay Harbour',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no' },
        { name: 'description', content: 'A cosy island game about noticing, discussing, checking and reflecting before you share a picture.' },
        { name: 'theme-color', content: '#8fd3e8' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Hearsay' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: 'icon.svg' },
        { rel: 'manifest', href: 'manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: 'icons/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Patrick+Hand&display=swap', crossorigin: 'anonymous' },
      ],
    },
  },
  // The game is client-only (WebGL), and a single page. Hash routing plus a relative
  // base (`NUXT_APP_BASE_URL=./`, see `npm run generate`) lets the built site run from any folder.
  ssr: false,
  router: { options: { hashMode: true } },
  // No build-manifest fetch: the game is a single static page.
  experimental: { appManifest: false, entryImportMap: false },
  nitro: { preset: 'static' },
  typescript: { strict: true },
})
