/*
 * Arcade and TV remote mode: the whole game works with a joystick (or arrow keys / a remote's
 * D-pad) plus an OK button and a Back button.
 *
 * - Arrows move a large highlight between the buttons on screen, choosing the nearest one in
 *   that direction. At the top or bottom of a window with more to read, they scroll it.
 * - OK (Enter, a gamepad's A / button 0) presses the highlighted button.
 * - Back (Escape, Backspace, a gamepad's B / button 1, or a TV remote's Back) closes a window.
 * - Start (a gamepad's button 9) presses the main button at the bottom of the island.
 * - A TV remote's ⏩ continues and ⏪ goes back (the big side zones), and ⏯ presses the highlight.
 * - Elements marked data-arcade-keys (the picture you drop hunch pebbles on) take the arrows
 *   themselves, and send an "arcade-leave" event when you push past their edge.
 *
 * Switch it on from the title screen, by adding ?arcade to the address (for a cabinet), or just
 * by plugging in a gamepad. TV browsers start with it on.
 */
import { useGame } from '~/stores/game'
import { isTvBrowser } from '~/utils/device'

type Dir = 'up' | 'down' | 'left' | 'right'
const ARROWS: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
const FOCUSABLE = 'button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'

export default defineNuxtPlugin(() => {
  const game = useGame()
  if (/[?&#]arcade\b/.test(location.href)) game.setArcade(true)
  // TV browsers (Fire TV's Silk on AFT… devices, Samsung, LG, Android TV…) start in this mode, unless it was switched off here.
  let chosen = false
  try {
    chosen = localStorage.getItem('hearsay-harbour:arcade') !== null
  }
  catch {}
  if (!chosen && isTvBrowser()) game.setArcade(true)
  watch(() => game.arcade, on => document.documentElement.classList.toggle('arcade', on), { immediate: true })

  /** Where the highlight can go: the open window, or the screen behind when none is open. */
  function scope(): HTMLElement {
    const open = [...document.querySelectorAll<HTMLElement>('dialog[open]')]
    return open.at(-1) ?? document.body
  }
  function candidates(root: HTMLElement) {
    return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
      if ((el as HTMLButtonElement).disabled || el.closest('[inert], [aria-hidden="true"]')) return false
      // The green scroll bar's ▲ ▼ are for pointers and touch; the arrows scroll windows themselves.
      if (el.closest('.rail-wrap')) return false
      if (root === document.body && el.closest('dialog')) return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
    })
  }
  /** The button to start from: the window's default, else the main button at the bottom. */
  function preferred(root: HTMLElement, list: HTMLElement[]) {
    return root.querySelector<HTMLElement>('[autofocus]:not([disabled])')
      ?? list.find(el => el.closest('.bottom'))
      // In a window: the first control in its content (a minigame's button, the picture), not ✕.
      ?? list.find(el => el.closest('.body') && !el.closest('.rail-wrap') && !el.hasAttribute('data-arcade-keys'))
      ?? list.find(el => el.closest('footer') && el.classList.contains('big-btn') && !el.classList.contains('quiet'))
      ?? list.find(el => el.closest('footer'))
      ?? list.find(el => !el.classList.contains('close'))
      ?? list[0]
  }
  function show(el: HTMLElement) {
    el.focus({ preventScroll: true })
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }
  function scroller(el: Element | null) {
    for (let n = el?.parentElement; n; n = n.parentElement) {
      if (n.scrollHeight > n.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(n).overflowY)) return n
    }
    return null
  }

  /** Move the highlight to the nearest button in that direction (or scroll, at an edge). */
  function move(dir: Dir) {
    const root = scope()
    const list = candidates(root)
    const cur = document.activeElement as HTMLElement | null
    if (!cur || !list.includes(cur)) {
      const start = preferred(root, list)
      if (start) show(start)
      return
    }
    let a: { top: number, bottom: number, left: number, right: number, width: number, height: number } = cur.getBoundingClientRect()
    // The highlight was scrolled out of sight: measure from the edge of what's visible instead.
    const homeBox = scroller(cur)
    if (homeBox) {
      const v = homeBox.getBoundingClientRect()
      if (a.bottom < v.top + 4) a = { top: v.top, bottom: v.top + 1, left: v.left, right: v.right, width: v.width, height: 1 }
      else if (a.top > v.bottom - 4) a = { top: v.bottom - 1, bottom: v.bottom, left: v.left, right: v.right, width: v.width, height: 1 }
    }
    const ax = a.left + a.width / 2
    const ay = a.top + a.height / 2
    let best: HTMLElement | null = null
    let bestScore = Infinity
    const curBox = scroller(cur)
    // Inside a window's scrolling part with more to read that way: stay inside it until the end.
    const moreThatWay = !!curBox && (dir === 'down'
      ? curBox.scrollTop + curBox.clientHeight < curBox.scrollHeight - 4
      : dir === 'up' && curBox.scrollTop > 4)
    for (const el of list) {
      if (el === cur) continue
      const b = el.getBoundingClientRect()
      if (moreThatWay && scroller(el) !== curBox) continue
      // Skip buttons scrolled out of sight in another part of the window (from inside it, scrolling reaches them).
      const elBox = scroller(el)
      if (elBox && elBox !== curBox) {
        const v = elBox.getBoundingClientRect()
        if (b.bottom < v.top + 4 || b.top > v.bottom - 4) continue
      }
      const bx = b.left + b.width / 2
      const by = b.top + b.height / 2
      // How far along the direction, and how far off to the side.
      const along = dir === 'down' ? b.top - a.bottom + 1 : dir === 'up' ? a.top - b.bottom + 1 : dir === 'right' ? b.left - a.right + 1 : a.left - b.right + 1
      const centre = dir === 'down' ? by - ay : dir === 'up' ? ay - by : dir === 'right' ? bx - ax : ax - bx
      if (centre <= 4 || along < -Math.min(a.height, a.width) / 2) continue
      const side = dir === 'up' || dir === 'down'
        ? Math.max(0, Math.max(b.left - a.right, a.left - b.right))
        : Math.max(0, Math.max(b.top - a.bottom, a.top - b.bottom))
      const score = Math.max(0, along) + side * 3 + (side ? 40 : 0)
      if (score < bestScore) {
        bestScore = score
        best = el
      }
    }
    // From a button outside the window's scrolling part (the footer, the header): if that part sits
    // between here and the next button and has more to read that way, scroll it rather than jump over it.
    if (!homeBox && (dir === 'up' || dir === 'down')) {
      const boxes = [...root.querySelectorAll<HTMLElement>('*')].filter(n => n.scrollHeight > n.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(n).overflowY))
      for (const b of boxes) {
        const v = b.getBoundingClientRect()
        const between = dir === 'up' ? v.bottom <= a.top + 2 && (!best || best.getBoundingClientRect().bottom <= v.top + 2) : v.top >= a.bottom - 2 && (!best || best.getBoundingClientRect().top >= v.bottom - 2)
        const more = dir === 'up' ? b.scrollTop > 4 : b.scrollTop + b.clientHeight < b.scrollHeight - 4
        if (between && more) {
          b.scrollBy({ top: (dir === 'down' ? 1 : -1) * b.clientHeight * 0.6, behavior: 'smooth' })
          return
        }
      }
    }
    const box = scroller(cur)
    if (box && (dir === 'up' || dir === 'down')) {
      const canScroll = dir === 'down' ? box.scrollTop + box.clientHeight < box.scrollHeight - 4 : box.scrollTop > 4
      const boxRect = box.getBoundingClientRect()
      // How far beyond the visible part of the window the next button sits.
      const beyond = best
        ? (() => {
            const r = best.getBoundingClientRect()
            return dir === 'down' ? r.bottom - boxRect.bottom : boxRect.top - r.top
          })()
        : Infinity
      // A long stretch of reading before the next button (or none at all): scroll, keeping the highlight.
      if (canScroll && beyond > box.clientHeight * 0.75) {
        box.scrollBy({ top: (dir === 'down' ? 1 : -1) * box.clientHeight * 0.6, behavior: 'smooth' })
        return
      }
      // Otherwise move to it, bringing it into the middle of the window.
      if (best) {
        best.focus({ preventScroll: true })
        if (beyond > 0) best.scrollIntoView({ block: 'center', behavior: 'smooth' })
        return
      }
    }
    if (best) show(best)
  }

  /** The main button at the bottom of the island, or the window's default button. */
  function mainAction() {
    const root = scope()
    const el = preferred(root, candidates(root))
    el?.click()
  }
  function back() {
    if (game.dialog) game.close()
  }

  function isTyping(el: Element | null, key: string) {
    if (!el) return false
    const tag = el.tagName
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (tag === 'INPUT') {
      const type = (el as HTMLInputElement).type
      if (['checkbox', 'radio', 'button', 'submit', 'range'].includes(type)) return false
      return key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Backspace'
    }
    return (el as HTMLElement).isContentEditable
  }

  /*
   * A TV remote's media buttons: ⏩ continues (the right-hand zone), ⏪ goes back (the left-hand
   * zone) and ⏯ presses the highlighted button. Fire TV sends them as key codes 228, 227 and 179.
   */
  function media(ev: KeyboardEvent): 'forward' | 'rewind' | 'play' | null {
    if (['MediaFastForward', 'MediaTrackNext'].includes(ev.key) || ev.keyCode === 228) return 'forward'
    if (['MediaRewind', 'MediaTrackPrevious'].includes(ev.key) || ev.keyCode === 227) return 'rewind'
    if (['MediaPlayPause', 'MediaPlay'].includes(ev.key) || ev.keyCode === 179) return 'play'
    return null
  }
  function zone(side: 'left' | 'right') {
    const root = scope()
    return root === document.body ? null : root.querySelector<HTMLButtonElement>(`.zone.${side}:not(:disabled)`)
  }

  window.addEventListener('keydown', (ev) => {
    if (!game.arcade || ev.metaKey || ev.ctrlKey || ev.altKey) return
    const m = media(ev)
    if (m) {
      ev.preventDefault()
      ev.stopPropagation()
      if (ev.repeat) return
      const active = document.activeElement as HTMLElement | null
      if (m === 'forward') {
        const z = zone('right')
        if (z) z.click()
        else if (scope() === document.body) mainAction()
      }
      else if (m === 'rewind') zone('left')?.click()
      else if (active && active !== document.body) active.click()
      else mainAction()
      return
    }
    const active = document.activeElement
    const dir = ARROWS[ev.key]
    if (dir) {
      if (isTyping(active, ev.key) || active?.closest('[data-arcade-keys]')) return
      ev.preventDefault()
      ev.stopPropagation()
      move(dir)
    }
    else if ((ev.key === 'Backspace' || ev.key === 'GoBack' || ev.key === 'BrowserBack') && !isTyping(active, ev.key)) {
      ev.preventDefault()
      back()
    }
    else if (ev.key === 'Enter' && (!active || active === document.body)) {
      ev.preventDefault()
      mainAction()
    }
  }, true)
  // A window that opens with the highlight on its ✕ moves it to the window's main control.
  watch(() => game.dialog, () => {
    if (!game.arcade) return
    setTimeout(() => {
      const active = document.activeElement as HTMLElement | null
      const root = scope()
      if (root === document.body || (active && active !== document.body && !active.classList.contains('close') && root.contains(active))) return
      const start = preferred(root, candidates(root))
      if (start) show(start)
    }, 120)
  })
  // When nothing is highlighted (a window just closed, a new button appeared), highlight the
  // main button, so there's always something to press.
  setInterval(() => {
    if (!game.arcade) return
    const active = document.activeElement
    if (active && active !== document.body && active.isConnected) return
    const root = scope()
    const start = preferred(root, candidates(root))
    if (start && (root !== document.body || start.closest('.bottom') || !game.started)) show(start)
  }, 400)
  // Pushing past the edge of the pebble picture moves on to the next button.
  window.addEventListener('arcade-leave', ev => move((ev as CustomEvent<Dir>).detail))

  /*
   * A TV remote's Back button goes back in the browser's history. While a window is open we add
   * a history step, so Back closes the window instead of leaving the game.
   */
  let pushed = false
  watch(() => !!game.dialog && game.arcade, (open) => {
    if (open && !pushed) {
      history.pushState({ ...history.state, hhWindow: true }, '')
      pushed = true
    }
    else if (!open && pushed) {
      pushed = false
      if (history.state?.hhWindow) history.back()
    }
  })
  window.addEventListener('popstate', () => {
    if (pushed && !history.state?.hhWindow) {
      pushed = false
      game.close()
    }
  })

  /* Gamepads (most arcade cabinets and many TV controllers): read them every frame. */
  const held = new Map<string, number>()
  let raf = 0
  function key(target: Element, type: 'keydown' | 'keyup', k: string) {
    return target.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true }))
  }
  function press(name: string, down: boolean, now: number) {
    const was = held.get(name)
    if (!down) {
      if (was !== undefined) {
        held.delete(name)
        if (name === 'ok') key(document.activeElement ?? document.body, 'keyup', 'Enter')
      }
      return
    }
    // Arrows repeat while held: once, then again after a pause, then quickly.
    if (was !== undefined && (!name.startsWith('arrow') || now < was)) return
    held.set(name, now + (was === undefined ? 380 : 140))
    if (!game.arcade) game.setArcade(true)
    const active = document.activeElement as HTMLElement | null
    if (name.startsWith('arrow')) {
      const k = { 'arrow-up': 'ArrowUp', 'arrow-down': 'ArrowDown', 'arrow-left': 'ArrowLeft', 'arrow-right': 'ArrowRight' }[name]!
      if (active?.closest('[data-arcade-keys]')) key(active, 'keydown', k)
      else move(ARROWS[k]!)
    }
    else if (name === 'ok') {
      if (!active || active === document.body) return mainAction()
      // Let the element handle the key itself (the wax seal is held down); otherwise press it.
      if (key(active, 'keydown', 'Enter')) active.click()
    }
    else if (name === 'back') back()
    else if (name === 'start') mainAction()
  }
  function poll(now: number) {
    const pads = navigator.getGamepads?.() ?? []
    for (const pad of pads) {
      if (!pad) continue
      const b = (i: number) => !!pad.buttons[i]?.pressed
      const x = pad.axes[0] ?? 0
      const y = pad.axes[1] ?? 0
      press('arrow-up', b(12) || y < -0.55, now)
      press('arrow-down', b(13) || y > 0.55, now)
      press('arrow-left', b(14) || x < -0.55, now)
      press('arrow-right', b(15) || x > 0.55, now)
      press('ok', b(0), now)
      press('back', b(1), now)
      press('start', b(9), now)
      break
    }
    raf = requestAnimationFrame(poll)
  }
  window.addEventListener('gamepadconnected', () => {
    game.setArcade(true)
    if (!raf) raf = requestAnimationFrame(poll)
  })
})
