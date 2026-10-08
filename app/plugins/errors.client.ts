/*
 * If something breaks, say so on screen instead of failing silently. Players see a short
 * note; the details go to the console.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const show = (err: unknown) => {
    console.error(err)
    if (document.getElementById('hh-error')) return
    const el = document.createElement('div')
    el.id = 'hh-error'
    el.setAttribute('role', 'alert')
    el.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:9999;max-width:min(520px,calc(100vw - 24px));padding:10px 16px;border-radius:14px;background:#fdf0f1;color:#7a1f2b;font:500 14px/1.4 Fredoka,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.15)'
    const msg = err instanceof Error ? err.message : String(err)
    el.textContent = `Something went wrong: ${msg}. Try reloading the page.`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 12000)
  }
  nuxtApp.vueApp.config.errorHandler = show
  nuxtApp.hook('app:error', show)
})
