// Takes the README screenshots with headless Chrome, driving the game through its dev hooks.
// 1. Start the dev server (npm run dev, or the desktop launcher), then
// 2. npm run screenshots          (optionally: URL=http://localhost:3000 CHROME=/path/to/chrome)
// Images are written to docs/screenshots/.
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const URL_ = process.env.URL ?? 'http://localhost:3000/'
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = fileURLToPath(new URL('../docs/screenshots/', import.meta.url))
const PORT = 9333
const sleep = ms => new Promise(r => setTimeout(r, ms))

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }

// Each shot: viewport, then a script run in the page (the dev build exposes window.__game).
const START = `const g = window.__game; try { localStorage.clear() } catch {}`
const PLAYING = `${START}; g.start(false); g.close(); g.arrived(); g.setFirstImpression('ai', [{ x: 0.5, y: 0.2 }]); g.talked('wren'); g.checked('tide');`
const SHOTS = [
  { name: 'title', view: DESKTOP, run: `${START}`, wait: 2500 },
  { name: 'welcome-guide', view: DESKTOP, run: `${START}; g.start(false); g.open({ kind: 'guide', page: 2 })`, wait: 2000 },
  { name: 'island', view: DESKTOP, run: `${PLAYING}; g.zoom = 0.85`, wait: 4500 },
  { name: 'notice', view: DESKTOP, run: `${START}; g.start(false); g.close(); g.arrived(); g.open({ kind: 'notice' })`, wait: 2500 },
  { name: 'talk-jim', view: DESKTOP, run: `${PLAYING}; g.open({ kind: 'talk', who: 'jim' })`, wait: 5000 },
  { name: 'reveal', view: DESKTOP, run: `${START}; g.start(false); g.close(); for (let i = 0; i < 4; i++) { g.step = 'investigate'; g.record.firstLean = 'ai'; g.pin(g.picture.truth, 'careful'); g.next() } g.step = 'investigate'; g.record.firstLean = 'unsure'; g.record.pebbles = [{ x: 0.6, y: 0.7 }]; g.talked('pip'); g.checked('tide'); g.pin('ai', 'careful')`, wait: 2500 },
  { name: 'reward', view: DESKTOP, run: `${START}; g.start(false); g.close(); for (let i = 0; i < 6; i++) { g.step = 'investigate'; g.record.firstLean = 'ai'; g.talked('wren'); g.talked('pip'); g.checked('tide'); g.pin(g.picture.truth, 'careful'); g.next() }`, wait: 5500 },
  { name: 'phone', view: PHONE, run: `${PLAYING}`, wait: 4500 },
]

const profile = mkdtempSync(join(tmpdir(), 'hh-shots-'))
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--mute-audio', '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
  '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' })

let ws
let id = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id
  pending.set(n, { resolve, reject })
  ws.send(JSON.stringify({ id: n, method, params }))
})

try {
  let page
  for (let i = 0; i < 200 && !page; i++) {
    await sleep(200)
    page = await fetch(`http://127.0.0.1:${PORT}/json/list`).then(r => r.json()).then(l => l.find(t => t.type === 'page')).catch(() => null)
  }
  if (!page) throw new Error('Chrome did not start')
  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise(r => ws.addEventListener('open', r, { once: true }))
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data)
    const p = pending.get(msg.id)
    if (!p) return
    pending.delete(msg.id)
    msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result)
  })
  mkdirSync(OUT, { recursive: true })
  for (const shot of SHOTS) {
    await send('Emulation.setDeviceMetricsOverride', shot.view)
    await send('Emulation.setTouchEmulationEnabled', { enabled: shot.view.mobile })
    await send('Page.navigate', { url: URL_ })
    // Wait for the game's dev hooks, then set the scene.
    for (let i = 0; i < 60; i++) {
      await sleep(250)
      const ok = await send('Runtime.evaluate', { expression: '!!window.__game', returnByValue: true })
      if (ok.result.value) break
    }
    await sleep(1500)
    const res = await send('Runtime.evaluate', { expression: `(async () => { ${shot.run} })()`, awaitPromise: true })
    if (res.exceptionDetails) throw new Error(`${shot.name}: ${res.exceptionDetails.exception?.description ?? res.exceptionDetails.text}`)
    await sleep(shot.wait)
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(OUT, `${shot.name}.png`), Buffer.from(data, 'base64'))
    console.log(`✓ ${shot.name}.png`)
  }
}
finally {
  ws?.close()
  chrome.kill()
}
