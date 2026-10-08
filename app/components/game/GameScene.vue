<script setup lang="ts">
import * as THREE from 'three'
import { useLoop, useTres } from '@tresjs/core'
import { sfx } from '~/audio/sfx'
import { blobShadowTexture, hexRingGeometry } from '~/game/geometry'
import { IslandView } from '~/game/islandView'
import { gull as buildGull, puffin } from '~/game/props'
import { pictureUrl } from '~/utils/content'
import { type Direction, type Hex, findPath, hexEquals, hexKey, hexToWorld, neighbor, worldToHex } from '~/utils/hex'
import { PLACES, PLACE_BY_ID, type PlaceId, buildWorld } from '~/utils/world'
import { useGame } from '~/stores/game'

const game = useGame()
const { renderer, scene: tresScene } = useTres()
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const world = buildWorld()
const island = new IslandView(world)
const rig = new THREE.Group()
if (import.meta.dev) Object.assign(window, { __island: island, __game: game })
rig.add(island.group)

/* ------------------------------------------------------------------ */
/* Light: a warm day that slowly turns golden as the pictures go by    */
/* ------------------------------------------------------------------ */
const sun = new THREE.DirectionalLight('#fff0d6', 2.1)
sun.position.set(6, 12, 6)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 })
sun.shadow.bias = -0.0008
sun.shadow.normalBias = 0.03
sun.shadow.radius = 4
const hemi = new THREE.HemisphereLight('#fff6e6', '#b9d9a4', 1.15)
const ambient = new THREE.AmbientLight('#ffe9d6', 0.25)
rig.add(sun, sun.target, hemi, ambient)
const fog = new THREE.Fog('#f7ecd8', 30, 62)

const MORNING = { sun: new THREE.Color('#fff0d6'), sunI: 2.1, sky: new THREE.Color('#fff6e6'), amb: new THREE.Color('#ffe9d6'), fog: new THREE.Color('#d9eef6') }
const EVENING = { sun: new THREE.Color('#ffc9a0'), sunI: 1.75, sky: new THREE.Color('#ffd9c2'), amb: new THREE.Color('#ffc9b0'), fog: new THREE.Color('#f3d6cf') }
let dayNow = 0
function applyDaylight(dt: number) {
  const target = Math.min(1, game.index / game.pictures.length)
  dayNow += (target - dayNow) * (1 - Math.exp(-dt * 0.8))
  sun.color.copy(MORNING.sun).lerp(EVENING.sun, dayNow)
  sun.intensity = THREE.MathUtils.lerp(MORNING.sunI, EVENING.sunI, dayNow)
  hemi.color.copy(MORNING.sky).lerp(EVENING.sky, dayNow)
  ambient.color.copy(MORNING.amb).lerp(EVENING.amb, dayNow)
  fog.color.copy(MORNING.fog).lerp(EVENING.fog, dayNow)
}

/* ------------------------------------------------------------------ */
/* The player                                                         */
/* ------------------------------------------------------------------ */
const player = puffin()
const blob = new THREE.Mesh(
  new THREE.PlaneGeometry(0.7, 0.7).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false }),
)
blob.renderOrder = 1
rig.add(player.root, blob)

const tileY = (h: Hex) => world.byKey.get(hexKey(h))?.height ?? 0
const isWalkable = (h: Hex) => world.byKey.get(hexKey(h))?.walkable ?? false

let here: Hex = { ...PLACE_BY_ID.board.door }
let path: Hex[] = []
let hopFrom = new THREE.Vector3()
let hopTo = new THREE.Vector3()
let hopT = 1
let heading = 0
let useOnArrival: PlaceId | null = null
{
  const { x, z } = hexToWorld(here)
  player.root.position.set(x, tileY(here), z)
}
onMounted(() => {
  game.at = placeAtDoor(here)?.id ?? null
})

function placeAtDoor(h: Hex) {
  return PLACES.find(p => hexEquals(p.door, h)) ?? null
}

function walkTo(target: Hex, use: PlaceId | null = null) {
  useOnArrival = use
  if (hexEquals(target, here)) {
    // Already here (or landing here at the end of this hop).
    path = []
    if (hopT >= 1) arrive()
    return
  }
  // `here` is already the tile being hopped to, so plan onwards from there.
  const route = findPath(here, target, isWalkable)
  if (route.length) path = route
}

function arrive() {
  const p = placeAtDoor(here)
  game.at = p?.id ?? null
  // Face whatever is here, except the board: there, face the camera so you can see the puffin.
  if (p?.id === 'board') heading = 0
  else if (p) {
    const a = hexToWorld(here)
    const b = hexToWorld(p.at)
    heading = Math.atan2(b.x - a.x, b.z - a.z)
  }
  if (useOnArrival && p?.id === useOnArrival && !game.dialog) game.use(p.id)
  useOnArrival = null
}

function step(dt: number) {
  if (hopT < 1) {
    hopT = Math.min(1, hopT + dt / (reducedMotion ? 0.12 : 0.26))
    const t = hopT
    player.root.position.lerpVectors(hopFrom, hopTo, t)
    player.root.position.y += Math.sin(t * Math.PI) * (reducedMotion ? 0 : 0.28)
    const squash = reducedMotion ? 1 : 1 + Math.sin(t * Math.PI * 2) * 0.08
    player.body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash))
    if (hopT >= 1) {
      player.body.scale.set(1, 1, 1)
      if (!path.length) arrive()
    }
    return
  }
  const next = path.shift()
  if (!next) return
  game.at = null
  hopFrom.copy(player.root.position)
  const { x, z } = hexToWorld(next)
  hopTo.set(x, tileY(next), z)
  game.pos = { x, z }
  heading = Math.atan2(x - hopFrom.x, z - hopFrom.z)
  here = next
  hopT = 0
  syncTrail()
  panTarget.set(0, 0, 0)
  sfx.hop()
}

/* ------------------------------------------------------------------ */
/* The gull: brings each picture, then hangs about nagging you         */
/* ------------------------------------------------------------------ */
const gull = buildGull()
gull.root.scale.setScalar(0.9)
rig.add(gull.root)
const boardWorld = (() => {
  const { x, z } = hexToWorld(PLACE_BY_ID.board.at)
  return new THREE.Vector3(x, tileY(PLACE_BY_ID.board.at) + 1.95, z)
})()
let gullT = 0
let gullCalled = false
const gullStart = new THREE.Vector3(14, 6, -10)

function updateGull(dt: number, time: number) {
  const flap = reducedMotion ? 0.2 : Math.sin(time * 10) * 0.6
  gull.wings[0]!.rotation.z = flap
  gull.wings[1]!.rotation.z = -flap
  // The gull waits politely while the welcome guide is open.
  if (game.step === 'arriving' && game.started && !game.finished && game.dialog?.kind !== 'guide') {
    gull.card.visible = true
    if (!gullCalled) {
      gullCalled = true
      gullT = 0
      gull.root.position.copy(gullStart)
      sfx.gull()
    }
    gullT = Math.min(1, gullT + dt / (reducedMotion ? 0.4 : 3))
    const t = 1 - Math.pow(1 - gullT, 2)
    const target = boardWorld.clone().add(new THREE.Vector3(0, 0.5, 0.4))
    gull.root.position.lerpVectors(gullStart, target, t)
    gull.root.position.y += Math.sin(t * Math.PI) * 2
    gull.root.lookAt(target.x, gull.root.position.y, target.z)
    if (gullT >= 1) {
      gullCalled = false
      gull.card.visible = false
      sfx.chime()
      game.arrived()
    }
    return
  }
  gull.card.visible = false
  // Investigating: circle over the puffin's head, waiting for you to share.
  const pestering = game.step === 'investigate'
  const centre = pestering ? player.root.position : boardWorld
  const r = pestering ? 1.7 : 0.9
  const a = time * (pestering ? 0.9 : 0.5)
  // Circle a point just behind the puffin so the gull never hides it.
  const back = pestering ? -1.2 : 0
  const want = new THREE.Vector3(centre.x + Math.cos(a) * r, (pestering ? centre.y + 2.6 : boardWorld.y + 1.2) + Math.sin(time * 2) * 0.1, centre.z + back + Math.sin(a) * r * 0.6)
  gull.root.position.lerp(want, 1 - Math.exp(-dt * 2.5))
  gull.root.rotation.set(0, -a, Math.sin(a) * 0.1 - 0.2)
}

/* ------------------------------------------------------------------ */
/* Board cards, markers, garden                                       */
/* ------------------------------------------------------------------ */
function syncCards() {
  const shown = game.records.slice(0, game.step === 'arriving' ? game.index : game.index + 1)
  island.setCards(shown.map((r, i) => ({ src: pictureUrl(game.pictures[i]!.src), label: r.label })))
}
island.onTextureLoaded = syncCards
watch(() => [game.index, game.step, game.record.label], syncCards, { immediate: true })

function syncMarkers() {
  if (!game.started || game.finished) return island.setMarkers([], null)
  if (game.step === 'notice') return island.setMarkers([], 'board')
  if (game.step !== 'investigate') return island.setMarkers([], null)
  const rec = game.record
  const todo = (['wren', 'pip', 'moss', 'tide', 'seal', 'crate'] as PlaceId[])
    .filter(id => !rec.talked.includes(id as never) && !rec.checked.includes(id as never))
  island.setMarkers(todo, game.suggestion)
}
watch(() => [game.step, game.started, game.evidenceCount, game.index, game.suggestion], syncMarkers, { immediate: true, deep: true })

/* ------------------------------------------------------------------ */
/* End-of-day festival: fireworks over the harbour                    */
/* ------------------------------------------------------------------ */
const SPARKS = 160
const sparks = new THREE.InstancedMesh(
  new THREE.SphereGeometry(0.06, 6, 4),
  new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
  SPARKS,
)
sparks.count = 0
sparks.frustumCulled = false
rig.add(sparks)
const sparkState = Array.from({ length: SPARKS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 }))
const FIREWORK = ['#ffb627', '#d1495b', '#6fb7ea', '#7fbf7a', '#c6b3e6', '#fff4c9'].map(c => new THREE.Color(c))
let nextBurst = 0
let sparkCursor = 0
watch(() => game.finished, f => (island.party = f), { immediate: true })
function updateFireworks(dt: number, time: number) {
  if (!game.finished || reducedMotion) {
    sparks.count = 0
    return
  }
  if (time > nextBurst) {
    nextBurst = time + 0.9 + Math.random() * 0.6
    const c = new THREE.Vector3((Math.random() - 0.5) * 8, 4 + Math.random() * 2, (Math.random() - 0.5) * 6 - 1)
    const col = FIREWORK[Math.floor(Math.random() * FIREWORK.length)]!
    for (let i = 0; i < 32; i++) {
      const s = sparkState[sparkCursor]!
      s.p.copy(c)
      s.v.randomDirection().multiplyScalar(2 + Math.random())
      s.life = 1.4
      sparks.setColorAt(sparkCursor, col)
      sparkCursor = (sparkCursor + 1) % SPARKS
    }
    if (sparks.instanceColor) sparks.instanceColor.needsUpdate = true
    sfx.pebble()
  }
  sparks.count = SPARKS
  sparkState.forEach((s, i) => {
    if (s.life > 0) {
      s.life -= dt
      s.v.y -= dt * 2.2
      s.v.multiplyScalar(1 - dt * 0.9)
      s.p.addScaledVector(s.v, dt)
    }
    const k = Math.max(0, s.life / 1.4)
    trailM.compose(s.p, new THREE.Quaternion(), trailS.set(k, k, k))
    sparks.setMatrixAt(i, trailM)
  })
  sparks.instanceMatrix.needsUpdate = true
}

/* ------------------------------------------------------------------ */
/* The honey trail: glowing stepping stones to the suggested next place */
/* ------------------------------------------------------------------ */
const TRAIL_MAX = 40
const trail = new THREE.InstancedMesh(
  new THREE.CircleGeometry(0.16, 20).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: '#ffb627', transparent: true, opacity: 0.9, depthWrite: false }),
  TRAIL_MAX,
)
trail.count = 0
trail.renderOrder = 2
// Instances move around the whole island, so never cull them by their first bounds.
trail.frustumCulled = false
rig.add(trail)
let trailPts: THREE.Vector3[] = []
function syncTrail() {
  const s = game.suggestion
  trailPts = []
  if (s && !hexEquals(PLACE_BY_ID[s].door, here)) {
    const route = findPath(here, PLACE_BY_ID[s].door, isWalkable)
    const pts = [here, ...route].map((h) => {
      const { x, z } = hexToWorld(h)
      return new THREE.Vector3(x, tileY(h) + 0.03, z)
    })
    // Two stones per tile: one in the middle, one on the edge to the next tile.
    for (let i = 1; i < pts.length; i++) {
      trailPts.push(pts[i - 1]!.clone().lerp(pts[i]!, 0.5), pts[i]!.clone())
    }
    trailPts = trailPts.slice(0, TRAIL_MAX)
  }
  trail.count = trailPts.length
}
watch(() => [game.suggestion, game.dialog], syncTrail)
const trailM = new THREE.Matrix4()
const trailS = new THREE.Vector3()
function animateTrail(time: number) {
  trail.visible = !!trailPts.length && !game.dialog
  trailPts.forEach((p, i) => {
    // A ripple runs along the trail towards the destination.
    const k = reducedMotion ? 1 : 0.7 + 0.5 * Math.max(0, Math.sin(time * 4 - i * 0.6))
    trailM.compose(p, new THREE.Quaternion(), trailS.set(k, 1, k))
    trail.setMatrixAt(i, trailM)
  })
  trail.instanceMatrix.needsUpdate = true
}

island.setTrust(game.trust, true)
watch(() => game.trust, t => island.setTrust(t))
watch(() => game.recentre, () => panTarget.set(0, 0, 0))
watch(() => game.goto, (g) => {
  if (!g) return
  // Walk there and use it on arrival (from the "Next" button or a nudge back to the board).
  walkTo(PLACE_BY_ID[g].door, g)
  game.goto = null
})
watch(() => game.index, (i) => {
  if (i === 0 && game.step === 'arriving') {
    // Restarted: back to the board.
    walkTo(PLACE_BY_ID.board.door)
  }
})

/* ------------------------------------------------------------------ */
/* Hover + destination rings                                          */
/* ------------------------------------------------------------------ */
const hoverRing = new THREE.Mesh(hexRingGeometry(0.9, 0.08), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false }))
hoverRing.visible = false
hoverRing.renderOrder = 3
const destRing = new THREE.Mesh(hexRingGeometry(0.9, 0.12), new THREE.MeshBasicMaterial({ color: '#ffb627', transparent: true, opacity: 0.95, depthWrite: false }))
destRing.visible = false
destRing.renderOrder = 3
rig.add(hoverRing, destRing)

function setRing(ring: THREE.Mesh, h: Hex | null) {
  ring.visible = !!h
  if (!h) return
  const { x, z } = hexToWorld(h)
  ring.position.set(x, tileY(h) + 0.02, z)
}

/* ------------------------------------------------------------------ */
/* Input                                                              */
/* ------------------------------------------------------------------ */
const camRef = shallowRef<THREE.PerspectiveCamera>()
const raycaster = new THREE.Raycaster()
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.08)
const ndc = new THREE.Vector2()
const hit = new THREE.Vector3()

function hexUnder(ev: PointerEvent): Hex | null {
  const cam = camRef.value
  if (!cam) return null
  const rect = renderer.domElement.getBoundingClientRect()
  ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1)
  raycaster.setFromCamera(ndc, cam)
  if (!raycaster.ray.intersectPlane(ground, hit)) return null
  const h = worldToHex(hit.x, hit.z)
  return world.byKey.has(hexKey(h)) ? h : null
}

/** A building, villager or diamond under the pointer, if any (these sit in front of tiles). */
function placeUnder(ev: PointerEvent): PlaceId | null {
  const cam = camRef.value
  if (!cam) return null
  const rect = renderer.domElement.getBoundingClientRect()
  ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1)
  raycaster.setFromCamera(ndc, cam)
  for (const hit of raycaster.intersectObjects(island.pickTargets, true)) {
    let o: THREE.Object3D | null = hit.object
    let visible = true
    while (o) {
      if (!o.visible) visible = false
      if (o.userData.place) return visible ? o.userData.place as PlaceId : null
      o = o.parent
    }
  }
  return null
}

/** A tile you can click: somewhere walkable, or a place (walks to its door and uses it). */
function clickTarget(h: Hex): { tile: Hex, use: PlaceId | null } | null {
  const place = PLACES.find(p => hexEquals(p.at, h))
  if (place) return { tile: place.door, use: place.id }
  if (isWalkable(h)) return { tile: h, use: placeAtDoor(h)?.id ?? null }
  return null
}

/*
 * Pan and zoom: drag to pan, wheel or pinch to zoom. A short press without moving is a
 * tap (walk there). Hopping somewhere eases the view back onto the puffin.
 */
const pan = new THREE.Vector3()
const panTarget = new THREE.Vector3()
const pointers = new Map<number, { x: number, y: number }>()
let downAt = { x: 0, y: 0 }
let dragged = false
let pinchStart = 0
let pinchZoom = 1
function onPointerDown(ev: PointerEvent) {
  downAt = { x: ev.clientX, y: ev.clientY }
  dragged = false
  pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinchStart = Math.hypot(a!.x - b!.x, a!.y - b!.y)
    pinchZoom = game.zoom
  }
}
const groundAt = (x: number, y: number, out: THREE.Vector3) => {
  const cam = camRef.value
  if (!cam) return false
  const rect = renderer.domElement.getBoundingClientRect()
  ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1)
  raycaster.setFromCamera(ndc, cam)
  return !!raycaster.ray.intersectPlane(ground, out)
}
const grabA = new THREE.Vector3()
const grabB = new THREE.Vector3()
/** Drag the ground: the spot under the pointer stays under the pointer. */
function panBy(fromX: number, fromY: number, toX: number, toY: number) {
  if (!groundAt(fromX, fromY, grabA) || !groundAt(toX, toY, grabB)) return
  panTarget.sub(grabB.sub(grabA))
  panTarget.y = 0
  panTarget.clampLength(0, 9)
}
function onDrag(ev: PointerEvent) {
  const p = pointers.get(ev.pointerId)
  if (!p) return
  if (pointers.size === 2) {
    p.x = ev.clientX
    p.y = ev.clientY
    const [a, b] = [...pointers.values()]
    const d = Math.hypot(a!.x - b!.x, a!.y - b!.y)
    if (pinchStart > 0) game.zoom = Math.min(1.9, Math.max(0.5, pinchZoom * (pinchStart / d)))
    dragged = true
    return
  }
  if (!dragged && Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 8) dragged = true
  if (dragged && !game.dialog) panBy(p.x, p.y, ev.clientX, ev.clientY)
  p.x = ev.clientX
  p.y = ev.clientY
}
function onWheel(ev: WheelEvent) {
  if (game.dialog || !game.started) return
  ev.preventDefault()
  game.zoomBy(Math.exp(ev.deltaY * 0.0015))
}
function onPointerUp(ev: PointerEvent) {
  pointers.delete(ev.pointerId)
  if (pointers.size < 2) pinchStart = 0
  if (ev.type === 'pointercancel' || dragged) return
  if (game.dialog || !game.started) return
  if (Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 8) return
  const picked = placeUnder(ev)
  if (picked) return walkTo(PLACE_BY_ID[picked].door, picked)
  const h = hexUnder(ev)
  const t = h && clickTarget(h)
  if (!t) return
  walkTo(t.tile, t.use)
}
function onPointerMove(ev: PointerEvent) {
  onDrag(ev)
  if (ev.pointerType !== 'mouse' || pointers.size) return
  const picked = placeUnder(ev)
  if (picked) {
    setRing(hoverRing, game.dialog ? null : PLACE_BY_ID[picked].at)
    renderer.domElement.style.cursor = 'pointer'
    return
  }
  const h = hexUnder(ev)
  const t = h && clickTarget(h)
  setRing(hoverRing, t && !game.dialog ? (PLACES.some(p => hexEquals(p.at, h!)) ? h : t.tile) : null)
  renderer.domElement.style.cursor = t ? 'pointer' : 'default'
}

const KEYS: Record<string, Direction> = { w: 'N', s: 'S', q: 'NW', e: 'NE', a: 'SW', d: 'SE', arrowup: 'N', arrowdown: 'S' }
let zig = false
function onKey(ev: KeyboardEvent) {
  if (game.dialog || !game.started || ev.metaKey || ev.ctrlKey || ev.altKey) return
  const tag = (ev.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  const k = ev.key.toLowerCase()
  if (k === '+' || k === '=') return game.zoomBy(0.85)
  if (k === '-' || k === '_') return game.zoomBy(1 / 0.85)
  if (k === 'c') return game.recentre++
  if (k === ' ' || k === 'enter') {
    if (tag === 'BUTTON' || tag === 'A') return
    if (game.at) {
      ev.preventDefault()
      game.use(game.at)
    }
    return
  }
  let dir = KEYS[k]
  // Left and right zig-zag along the flat-top grid.
  if (k === 'arrowleft' || k === 'arrowright') {
    zig = !zig
    dir = k === 'arrowleft' ? (zig ? 'NW' : 'SW') : (zig ? 'NE' : 'SE')
  }
  if (!dir) return
  ev.preventDefault()
  const base = path.length ? path[path.length - 1]! : here
  const n = neighbor(base, dir)
  if (!isWalkable(n)) return
  if (hopT < 1 || path.length) path = [...path, n].slice(-2)
  else path = [n]
  useOnArrival = null
}

onMounted(() => {
  tresScene.value.fog = fog
  const el = renderer.domElement
  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointerup', onPointerUp)
  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('pointercancel', onPointerUp)
  el.addEventListener('wheel', onWheel, { passive: false })
  el.style.touchAction = 'none'
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  const el = renderer.domElement
  el.removeEventListener('pointerdown', onPointerDown)
  el.removeEventListener('pointerup', onPointerUp)
  el.removeEventListener('pointermove', onPointerMove)
  el.removeEventListener('pointercancel', onPointerUp)
  el.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKey)
})

/* ------------------------------------------------------------------ */
/* Camera + loop                                                      */
/* ------------------------------------------------------------------ */
const camTarget = new THREE.Vector3()
let camReady = false
function updateCamera(cam: THREE.PerspectiveCamera, dt: number) {
  const portrait = Math.min(1.9, Math.max(1, 1 / Math.max(0.3, cam.aspect)))
  const z = 0.9 * Math.pow(portrait, 0.75)
  // Before the game starts, a slow drift round the whole island.
  pan.lerp(panTarget, dragged && pointers.size ? 1 : 1 - Math.exp(-dt * 10))
  const focus = game.started ? player.root.position.clone().add(pan) : new THREE.Vector3(0, 0, 1)
  const k = !camReady || (dragged && pointers.size) ? 1 : 1 - Math.exp(-dt * 6)
  camTarget.lerp(new THREE.Vector3(focus.x, 0, focus.z), k)
  const zoom = game.started ? z * game.zoom : z * 1.35
  const want = new THREE.Vector3(camTarget.x, 12.5 * zoom, camTarget.z + 10 * zoom)
  cam.position.lerp(want, !camReady || (dragged && pointers.size) ? 1 : 1 - Math.exp(-dt * 2))
  cam.lookAt(camTarget.x, 0.2, camTarget.z)
  camReady = true
}

let time = 0
const { onBeforeRender } = useLoop()
onBeforeRender(({ delta }) => {
  const dt = Math.min(0.05, delta)
  time += dt
  step(dt)
  // Turn smoothly towards the heading.
  let diff = heading - player.root.rotation.y
  diff = Math.atan2(Math.sin(diff), Math.cos(diff))
  player.root.rotation.y += diff * (1 - Math.exp(-dt * 12))
  if (!reducedMotion && hopT >= 1) player.body.position.y = Math.abs(Math.sin(time * 2.2)) * 0.012
  blob.position.set(player.root.position.x, (hopT < 1 ? hopTo.y : player.root.position.y) + 0.015, player.root.position.z)
  setRing(destRing, path.length ? path[path.length - 1]! : null)
  updateGull(dt, time)
  animateTrail(time)
  updateFireworks(dt, time)
  island.update(dt, reducedMotion)
  applyDaylight(dt)
  sun.position.set(player.root.position.x + 6, 12, player.root.position.z + 6)
  sun.target.position.copy(player.root.position)
  const cam = camRef.value
  if (cam) {
    updateCamera(cam, dt)
    updateTags(cam)
  }
})

/* ------------------------------------------------------------------ */
/* Name tags: HTML labels pinned over each place                       */
/* ------------------------------------------------------------------ */
const tagV = new THREE.Vector3()
function updateTags(cam: THREE.PerspectiveCamera) {
  const el = renderer.domElement
  const w = el.clientWidth
  const h = el.clientHeight
  for (const [id, anchor] of island.tagAnchors) {
    const tag = document.getElementById(`tag-${id}`)
    if (!tag) continue
    tagV.copy(anchor).project(cam)
    const on = tagV.z < 1 && Math.abs(tagV.x) < 1.1 && Math.abs(tagV.y) < 1.1
    tag.style.opacity = on ? '' : '0'
    tag.style.transform = `translate(${((tagV.x + 1) / 2) * w}px, ${((1 - tagV.y) / 2) * h}px) translate(-50%, -100%)`
  }
}
</script>

<template>
  <TresPerspectiveCamera ref="camRef" :fov="34" :near="0.5" :far="120" />
  <primitive :object="rig" />
</template>
