/*
 * Every sound is synthesised with Web Audio: soft plucks, little chimes, the sea as filtered
 * noise, and a slow pentatonic music box. No audio files.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let musicGain: GainNode | null = null
let muted = false
let musicTimer: ReturnType<typeof setTimeout> | null = null

function ensure() {
  if (ctx) return ctx
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = muted ? 0 : 0.7
  master.connect(ctx.destination)
  musicGain = ctx.createGain()
  musicGain.gain.value = 0.22
  musicGain.connect(master)
  startSea()
  scheduleMusic()
  return ctx
}

/** Call from a user gesture so the browser lets audio start. */
export function unlockAudio() {
  // Sound is a nice extra: if the browser or an embedding frame refuses audio, play on silently.
  try {
    const c = ensure()
    if (c?.state === 'suspended') void c.resume().catch(() => {})
  }
  catch {
    ctx = null
  }
}

export function setMuted(m: boolean) {
  muted = m
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.1)
}

function tone(freq: number, opts: { dur?: number, type?: OscillatorType, vol?: number, delay?: number, slide?: number, out?: AudioNode } = {}) {
  const c = ctx
  if (!c || !master || muted) return
  try {
    play(c, freq, opts)
  }
  catch {}
}

function play(c: AudioContext, freq: number, opts: { dur?: number, type?: OscillatorType, vol?: number, delay?: number, slide?: number, out?: AudioNode }) {
  const { dur = 0.25, type = 'sine', vol = 0.18, delay = 0, slide = 0 } = opts
  const t = c.currentTime + delay
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g)
  g.connect(opts.out ?? master!)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noiseBurst(dur: number, freq: number, vol: number, q = 1) {
  const c = ctx
  if (!c || !master || muted) return
  const len = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = q
  const g = c.createGain()
  g.gain.value = vol
  src.connect(f)
  f.connect(g)
  g.connect(master)
  src.start()
}

function startSea() {
  const c = ctx!
  const len = c.sampleRate * 4
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    // Brown-ish noise: soft and low, like waves heard from a cottage.
    last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02
    d[i] = last * 3.5
  }
  const src = c.createBufferSource()
  src.buffer = buf
  src.loop = true
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 500
  const g = c.createGain()
  g.gain.value = 0.18
  // Slow swell.
  const lfo = c.createOscillator()
  const lfoGain = c.createGain()
  lfo.frequency.value = 0.12
  lfoGain.gain.value = 0.08
  lfo.connect(lfoGain)
  lfoGain.connect(g.gain)
  src.connect(f)
  f.connect(g)
  g.connect(master!)
  src.start()
  lfo.start()
}

const SCALE = [392, 440, 523.25, 587.33, 659.25, 783.99, 880]
function scheduleMusic() {
  let step = 0
  const tick = () => {
    if (ctx && musicGain && !muted) {
      const n = SCALE[Math.floor(Math.random() * SCALE.length)]!
      tone(n, { dur: 1.6, vol: 0.12, type: 'triangle', out: musicGain })
      if (step % 4 === 0) tone(n / 2, { dur: 2.4, vol: 0.08, out: musicGain })
      step++
    }
    musicTimer = setTimeout(tick, 700 + Math.random() * 900)
  }
  if (!musicTimer) tick()
}

export const sfx = {
  hop: () => tone(520 + Math.random() * 60, { dur: 0.09, vol: 0.06, type: 'triangle', slide: 1.5 }),
  talk: () => [0, 0.07, 0.14].forEach((d, i) => tone(600 + i * 90 + Math.random() * 40, { dur: 0.07, vol: 0.06, type: 'square', delay: d })),
  open: () => tone(660, { dur: 0.18, vol: 0.1, slide: 1.3 }),
  chime: () => [784, 988, 1175].forEach((f, i) => tone(f, { dur: 0.6, vol: 0.12, delay: i * 0.08 })),
  pebble: () => tone(340 + Math.random() * 80, { dur: 0.08, vol: 0.12, type: 'triangle', slide: 0.6 }),
  splash: () => noiseBurst(0.4, 900, 0.5, 0.7),
  reel: () => tone(900, { dur: 0.05, vol: 0.05, type: 'square' }),
  stamp: () => { noiseBurst(0.12, 200, 0.8, 0.8); tone(110, { dur: 0.2, vol: 0.2, slide: 0.5 }) },
  creak: () => tone(140, { dur: 0.35, vol: 0.1, type: 'sawtooth', slide: 1.6 }),
  gull: () => [0, 0.18].forEach(d => tone(1400, { dur: 0.16, vol: 0.06, type: 'sawtooth', slide: 0.7, delay: d })),
  good: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, { dur: 0.5, vol: 0.12, type: 'triangle', delay: i * 0.1 })),
  meh: () => [523, 587].forEach((f, i) => tone(f, { dur: 0.4, vol: 0.1, type: 'triangle', delay: i * 0.12 })),
  bad: () => [392, 330].forEach((f, i) => tone(f, { dur: 0.5, vol: 0.1, type: 'triangle', delay: i * 0.16 })),
}
