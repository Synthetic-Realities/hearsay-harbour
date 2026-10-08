/*
 * Make the published game installable ("Add to Home Screen") and playable offline.
 * Skipped in development, and wherever service workers aren't allowed.
 */
export default defineNuxtPlugin(() => {
  if (import.meta.dev || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {})
  })
})
