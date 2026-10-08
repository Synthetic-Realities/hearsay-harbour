/*
 * Start sound on the first tap or key press anywhere (browsers only allow audio after one),
 * and again when the game comes back to the front, since phones pause audio in the background.
 */
import { unlockAudio } from '~/audio/sfx'

export default defineNuxtPlugin(() => {
  const once = () => {
    unlockAudio()
    window.removeEventListener('pointerdown', once)
    window.removeEventListener('keydown', once)
  }
  window.addEventListener('pointerdown', once)
  window.addEventListener('keydown', once)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') window.addEventListener('pointerdown', once)
  })
})
