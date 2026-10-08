// Takes the Dev Studio screenshots for the README (and for slides) with headless Chrome.
//   npm run screenshots:studio          (optionally: CHROME=/path/to/chrome)
// It starts its own dev server on port 3218 wired to a pretend AI model that runs inside this
// script, so no AI credits are spent and nothing leaves your computer. The example picture it
// saves to the inbox is deleted again afterwards. Images are written to docs/screenshots/.
// Note: the "Pictures in the game" shot lists every picture in app/packs, hidden ones too.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const OUT = join(ROOT, 'docs/screenshots')
const INBOX = join(ROOT, 'content-inbox')
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const DEV_PORT = 3218
const AI_PORT = 11999
const CDP_PORT = 9334
const URL_ = `http://localhost:${DEV_PORT}/`
const PICTURE = join(ROOT, 'public/pictures/cat-hat.jpg')
const sleep = ms => new Promise(r => setTimeout(r, ms))

// The pretend model: answers the Add tab's "suggest" request with an example a real model might give.
const SUGGESTION = {
  title: 'Cat in a brown fedora',
  caption: 'My cat at his first photoshoot!',
  notes: [
    'The hat brim and the fur around the ears blend into each other',
    'Every whisker is sharp while the background is a perfect golden blur',
    'No camera details or credit are visible in the picture',
  ],
  madeWith: '',
  visibleText: '',
  truthGuess: { label: 'ai', confidence: 'medium', why: 'The fur, hat and lighting are unusually flawless, and the edges where they meet melt together, which is common in AI images.' },
}
const ai = createServer((req, res) => {
  let body = ''
  req.on('data', (c) => { body += c })
  req.on('end', () => {
    res.setHeader('content-type', 'application/json')
    if (req.method === 'GET') return res.end(JSON.stringify({ models: [{ name: 'llama3.2-vision' }] }))
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(SUGGESTION) } }] }))
  })
}).listen(AI_PORT, '127.0.0.1')

const before = new Set(existsSync(INBOX) ? readdirSync(INBOX) : [])
const dev = spawn('npx', ['nuxt', 'dev', '--port', String(DEV_PORT)], {
  cwd: ROOT,
  env: { ...process.env, NUXT_IGNORE_LOCK: '1', HH_AI_PROVIDER: 'ollama', HH_AI_MODEL: 'llama3.2-vision', HH_OLLAMA_URL: `http://127.0.0.1:${AI_PORT}` },
  stdio: 'ignore',
  detached: true,
})
const profile = mkdtempSync(join(tmpdir(), 'hh-studio-shots-'))
let chrome

let ws
let id = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id
  pending.set(n, { resolve, reject })
  ws.send(JSON.stringify({ id: n, method, params }))
})
async function run(js) {
  const res = await send('Runtime.evaluate', { expression: `(async () => { ${js} })()`, awaitPromise: true, returnByValue: true })
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text)
  return res.result.value
}
async function shot(name) {
  await sleep(700)
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, 'base64'))
  console.log(`✓ ${name}.png`)
}
// Small page helpers: set a v-model field, click a control, scroll the Studio to an element.
const HELPERS = `
  const $ = s => document.querySelector(s)
  const wait = ms => new Promise(r => setTimeout(r, ms))
  const set = (s, v) => { const e = $(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })) }
  const click = s => $(s).click()
  const tab = t => [...document.querySelectorAll('[role=tab]')].find(b => b.textContent.includes(t)).click()
  const scrollTo = (s, off = 0) => { const body = $('dialog[open] .body'); const e = $(s); body.scrollTop = e.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - off }
`

try {
  // Wait for the dev server.
  for (let i = 0; i < 240; i++) {
    await sleep(500)
    const ok = await fetch(URL_).then(r => r.ok).catch(() => false)
    if (ok) break
    if (i === 239) throw new Error('The dev server did not start')
  }
  chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`,
    '--hide-scrollbars', '--mute-audio', '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
    '--window-size=1440,1000', 'about:blank',
  ], { stdio: 'ignore' })
  let page
  for (let i = 0; i < 200 && !page; i++) {
    await sleep(200)
    page = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).then(r => r.json()).then(l => l.find(t => t.type === 'page')).catch(() => null)
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: URL_ })
  for (let i = 0; i < 120; i++) {
    await sleep(250)
    const ok = await send('Runtime.evaluate', { expression: '!!window.__game', returnByValue: true })
    if (ok.result.value) break
  }
  await sleep(1500)

  // 1. Add a picture, with AI assist on.
  await run(`try { localStorage.clear(); localStorage.setItem('hearsay-harbour:ai-assist', 'on') } catch {}
    window.__game.open({ kind: 'studio' })`)
  await sleep(1500)
  const { root } = await send('DOM.getDocument')
  const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#studio-file' })
  await send('DOM.setFileInputFiles', { nodeId, files: [PICTURE] })
  await sleep(2500)
  await run(`${HELPERS}
    click('#studio-truth-ai')
    click('input[name=mode][value=add]')
    await wait(200)
    set('#studio-made', 'Adobe Firefly (AI image generator)')
    set('#studio-source', 'Generated with Adobe Firefly for the workshop, 2026')`)
  await shot('studio-add')
  await run(`${HELPERS} scrollTo('#studio-title', 30)`)
  await shot('studio-add-details')

  // 2. Not sure how it was made? The second-opinion panel.
  await run(`${HELPERS}
    click('#studio-truth-unknown')
    await wait(300)
    scrollTo('details.so', 20)`)
  await shot('studio-second-opinion')

  // 3. Save it to the inbox, then the Inbox tab.
  await run(`${HELPERS}
    click('#studio-truth-ai')
    await wait(200)
    $('form.form').requestSubmit()
    await wait(1500)
    tab('Inbox')`)
  await shot('studio-inbox')

  // 4. Pictures in the game, with the visibility switches.
  await run(`${HELPERS} tab('in the game')`)
  await sleep(1000)
  await shot('studio-pictures')

  // 5. The Edit screen for one picture.
  await run(`${HELPERS}
    const row = [...document.querySelectorAll('article.item')].find(a => a.textContent.includes('Cat in a hat'))
    ;[...row.querySelectorAll('button')].find(b => b.textContent.trim() === 'Edit').click()
    await wait(800)
    $('dialog[open] .body').scrollTop = 0`)
  await shot('studio-edit')
  await run(`${HELPERS} scrollTo('.villagers', 60)`)
  await shot('studio-edit-villagers')
}
finally {
  ws?.close()
  chrome?.kill()
  try {
    process.kill(-dev.pid)
  }
  catch {}
  ai.close()
  // Remove the example picture this script saved to the inbox.
  if (existsSync(INBOX)) {
    for (const f of readdirSync(INBOX)) {
      if (!before.has(f) && /cat-in-a-brown-fedora/i.test(f + (f.endsWith('.json') ? readFileSync(join(INBOX, f), 'utf8') : ''))) {
        rmSync(join(INBOX, f), { force: true })
        console.log(`  removed the example ${f} from the inbox`)
      }
    }
  }
  // Chrome may still be closing; its temporary profile is left for the system to clear if so.
  await sleep(1000)
  try {
    rmSync(profile, { recursive: true, force: true })
  }
  catch {}
}
