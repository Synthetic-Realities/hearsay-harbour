import * as THREE from 'three'
import { type Label, VILLAGERS, isVillager } from '~/utils/content'
import { type Hex, hexKey, hexToWorld } from '~/utils/hex'
import { GARDEN, LIGHTHOUSE, PIER, PLACES, type PlaceId, TERRAIN_COLORS, type World } from '~/utils/world'
import { cushionHexGeometry, roundedHexShape } from './geometry'
import {
  type Critter,
  FLOWER_COLORS,
  boatHut,
  buoy,
  cloud,
  cottage,
  crates,
  flower,
  jimCabin,
  lighthouse,
  noticeboard,
  pebble,
  pierDeck,
  pinCard,
  pine,
  postOffice,
  tree,
  treehouse,
  tuft,
  villager,
} from './props'

const TILE_RADIUS = 0.96
const tmpM = new THREE.Matrix4()
const tmpQ = new THREE.Quaternion()
const tmpP = new THREE.Vector3()
const tmpS = new THREE.Vector3(1, 1, 1)
const tmpC = new THREE.Color()

const hash = (a: number, b: number, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453
  return s - Math.floor(s)
}

/** Heading (rotation about y) that turns a +z-facing model from `from` towards `to`. */
export function facing(from: Hex, to: Hex) {
  const a = hexToWorld(from)
  const b = hexToWorld(to)
  return Math.atan2(b.x - a.x, b.z - a.z)
}

export const LABEL_PIN: Record<Label, string> = {
  camera: '#6fb7ea',
  edited: '#9ad0f5',
  assisted: '#c6b3e6',
  ai: '#d1495b',
  unsure: '#ffd166',
}

export class IslandView {
  readonly group = new THREE.Group()
  readonly caps: THREE.InstancedMesh
  /** Land tiles by caps instance slot, for picking. */
  readonly capTiles: Hex[] = []
  private water: THREE.InstancedMesh
  private waterBase: { x: number, z: number, phase: number }[] = []
  readonly villagers = new Map<PlaceId, Critter>()
  private clouds: THREE.Group[] = []
  private buoy: THREE.Group
  private board: THREE.Group
  private cards = new THREE.Group()
  private textures = new Map<string, { tex: THREE.Texture, aspect: number }>()
  private garden = new THREE.Group()
  private gardenSlots: THREE.Vector3[] = []
  private blooms: { obj: THREE.Object3D, grow: number, target: number }[] = []
  private markers = new Map<PlaceId, THREE.Mesh>()
  /** Where each place's name tag floats, in world space. */
  readonly tagAnchors = new Map<PlaceId, THREE.Vector3>()
  private time = 0

  constructor(private world: World) {
    const land = world.tiles.filter(t => t.terrain !== 'water' && t.terrain !== 'pier')
    
    const capGeo = cushionHexGeometry(TILE_RADIUS, 0.1, 0.07, 0.24)
    this.caps = new THREE.InstancedMesh(capGeo, new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0 }), land.length)
    this.caps.receiveShadow = true
    // Earthy skirts under the land, so the island reads as a thick soft cake.
    const soilGeo = new THREE.CylinderGeometry(0.93, 0.8, 1, 6).rotateY(Math.PI / 6)
    const soil = new THREE.InstancedMesh(soilGeo, new THREE.MeshStandardMaterial({ roughness: 0.9, color: '#d9b48f' }), land.length)
    land.forEach((t, i) => {
      const { x, z } = hexToWorld(t.hex)
      tmpM.compose(tmpP.set(x, t.height, z), tmpQ.identity(), tmpS.set(1, 1, 1))
      this.caps.setMatrixAt(i, tmpM)
      const n = hash(t.hex.q, t.hex.r)
      tmpC.set(TERRAIN_COLORS[t.terrain]).offsetHSL(0, 0, (n - 0.5) * 0.04)
      this.caps.setColorAt(i, tmpC)
      this.capTiles.push(t.hex)
      const depth = t.height + 0.9
      tmpM.compose(tmpP.set(x, t.height - 0.1 - depth / 2, z), tmpQ.identity(), tmpS.set(1, depth, 1))
      soil.setMatrixAt(i, tmpM)
      soil.setColorAt(i, tmpC.set(n > 0.5 ? '#d9b48f' : '#cfa882'))
    })
    this.group.add(this.caps, soil)

    // The sea: one calm pastel plane, deeper blue near the island and paler towards the haze.
    const seaGeo = new THREE.CircleGeometry(70, 72).rotateX(-Math.PI / 2)
    const seaCols: number[] = []
    const pos = seaGeo.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      const d = Math.hypot(pos.getX(i), pos.getZ(i))
      tmpC.set('#3fb0e0').lerp(new THREE.Color('#bfe6f5'), Math.min(1, d / 45))
      seaCols.push(tmpC.r, tmpC.g, tmpC.b)
    }
    seaGeo.setAttribute('color', new THREE.Float32BufferAttribute(seaCols, 3))
    const seaMesh = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0 }))
    seaMesh.position.y = -0.3
    seaMesh.receiveShadow = true
    this.group.add(seaMesh)

    // Soft foam hugging the shore, breathing in and out.
    const isLand = (q: number, r: number) => {
      const t = world.byKey.get(`${q},${r}`)
      return !!t && t.terrain !== 'water' && t.terrain !== 'pier'
    }
    const coast = land.filter(t => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]].some(([dq, dr]) => !isLand(t.hex.q + dq!, t.hex.r + dr!)))
    const foamGeo = new THREE.ShapeGeometry(roundedHexShape(1.12, 0.3), 6).rotateX(-Math.PI / 2)
    this.water = new THREE.InstancedMesh(foamGeo, new THREE.MeshBasicMaterial({ color: '#f4fbff', transparent: true, opacity: 0.6, depthWrite: false }), coast.length)
    this.water.renderOrder = 1
    coast.forEach((t) => {
      const { x, z } = hexToWorld(t.hex)
      this.waterBase.push({ x, z, phase: hash(t.hex.q, t.hex.r, 3) * Math.PI * 2 })
    })
    this.group.add(this.water)
    this.updateWater(0)

    this.scatter()
    this.buildPlaces()
    this.board = this.group.getObjectByName('board') as THREE.Group
    this.board.add(this.cards)

    const tide = PLACES.find(p => p.id === 'tide')!
    this.buoy = buoy()
    const bw = hexToWorld(tide.at)
    this.buoy.position.set(bw.x + 0.2, -0.22, bw.z + 0.1)
    this.group.add(this.buoy)
    for (const h of PIER) {
      const deck = pierDeck()
      const { x, z } = hexToWorld(h)
      deck.position.set(x, -0.01, z)
      this.group.add(deck)
    }
    const lh = lighthouse()
    const lw = hexToWorld(LIGHTHOUSE)
    lh.position.set(lw.x, world.byKey.get(hexKey(LIGHTHOUSE))!.height, lw.z)
    this.group.add(lh)

    this.group.add(this.garden)
    for (const h of GARDEN) {
      const { x, z } = hexToWorld(h)
      const y = world.byKey.get(hexKey(h))?.height ?? 0
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + hash(h.q, h.r) * 2
        const r = k % 2 ? 0.52 : 0.3
        this.gardenSlots.push(new THREE.Vector3(x + Math.cos(a) * r, y, z + Math.sin(a) * r))
      }
    }

    for (let i = 0; i < 7; i++) {
      const c = cloud()
      const a = (i / 7) * Math.PI * 2
      c.position.set(Math.cos(a) * (13 + (i % 3) * 2), 2.2 + (i % 2) * 1.2, Math.sin(a) * (12 + (i % 2) * 2) - 3)
      c.scale.setScalar(0.8 + hash(i, 1) * 0.6)
      this.clouds.push(c)
      this.group.add(c)
    }
  }

  private tileY(h: Hex) {
    return this.world.byKey.get(hexKey(h))?.height ?? 0
  }

  private scatter() {
    const reserved = new Set<string>([
      ...PLACES.flatMap(p => [hexKey(p.at), hexKey(p.door)]),
      ...GARDEN.map(hexKey),
      hexKey(LIGHTHOUSE),
    ])
    for (const t of this.world.tiles) {
      if (t.terrain === 'water' || t.terrain === 'pier' || reserved.has(t.key)) continue
      const { x, z } = hexToWorld(t.hex)
      const n = hash(t.hex.q, t.hex.r, 7)
      const put = (o: THREE.Object3D, k: number, r = 0.55) => {
        const a = hash(t.hex.q, t.hex.r, k) * Math.PI * 2
        const rr = r * (0.4 + 0.6 * hash(t.hex.q, t.hex.r, k + 1))
        o.position.set(x + Math.cos(a) * rr, t.height, z + Math.sin(a) * rr)
        o.rotation.y = a * 3
        this.group.add(o)
      }
      if (t.terrain === 'plaza') {
        if (n > 0.7) put(pebble(0.7), 1)
        continue
      }
      if (t.terrain === 'sand') {
        if (n > 0.45) put(pebble(1 + n * 0.5), 2)
        if (n > 0.86) put(pine(), 3, 0.3)
        continue
      }
      if (n > 0.8) put(tree(Math.floor(n * 100)), 4, 0.3)
      else if (n > 0.66) put(pine(), 4, 0.3)
      for (let k = 0; k < 3; k++) {
        if (hash(t.hex.q, t.hex.r, 20 + k) > 0.45) put(tuft(), 30 + k * 2)
      }
      if (t.terrain === 'meadow') {
        for (let k = 0; k < 4; k++) put(flower(FLOWER_COLORS[Math.floor(hash(t.hex.q, k, 9) * FLOWER_COLORS.length)]!, 0.9), 50 + k * 2)
      }
    }
  }

  private buildPlaces() {
    const markerGeo = new THREE.OctahedronGeometry(0.2, 0).scale(1, 1.3, 1)
    for (const p of PLACES) {
      const { x, z } = hexToWorld(p.at)
      const y = this.tileY(p.at)
      const heading = facing(p.at, p.door)
      const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading))
      let building: THREE.Group | null = null
      if (p.id === 'board') {
        building = noticeboard()
        building.name = 'board'
        building.scale.setScalar(1.3)
      }
      else if (p.id === 'seal') building = postOffice()
      else if (p.id === 'crate') building = crates()
      else if (p.id === 'wren') building = cottage('#f3e9f5', '#c6b3e6')
      else if (p.id === 'pip') building = treehouse()
      else if (p.id === 'moss') building = boatHut()
      else if (p.id === 'jim') building = jimCabin()
      if (building) {
        const isPerson = isVillager(p.id)
        building.position.set(x, y, z).addScaledVector(forward, isPerson ? -0.22 : 0)
        building.rotation.y = heading
        if (isPerson) building.scale.setScalar(0.78)
        this.group.add(building)
      }
      if (isVillager(p.id)) {
        const v = VILLAGERS[p.id]
        const c = villager(v, p.id)
        c.root.position.set(x, y, z).addScaledVector(forward, 0.55)
        c.root.rotation.y = heading
        this.villagers.set(p.id, c)
        this.group.add(c.root)
      }
      const marker = new THREE.Mesh(markerGeo, new THREE.MeshStandardMaterial({ color: '#ffb627', emissive: new THREE.Color('#ffb627'), emissiveIntensity: 0.5, roughness: 0.4, transparent: true }))
      const top = p.id === 'board' ? 2.2 : p.id === 'pip' ? 2.1 : p.id === 'tide' ? 0.7 : p.id === 'crate' ? 1.2 : 1.45
      const mx = isVillager(p.id) ? 0.55 : 0
      marker.position.set(x, y + top, z).addScaledVector(forward, mx)
      marker.visible = false
      this.tagAnchors.set(p.id, marker.position.clone())
      marker.position.y += 0.55
      marker.userData.baseY = marker.position.y
      this.markers.set(p.id, marker)
      this.group.add(marker)
    }
  }

  /** Bouncing honey diamonds over the places worth visiting next. */
  setMarkers(ids: PlaceId[], strong: PlaceId | null) {
    for (const [id, m] of this.markers) {
      m.visible = ids.includes(id) || id === strong
      m.scale.setScalar(id === strong ? 1.35 : 1)
      ;(m.material as THREE.MeshStandardMaterial).opacity = id === strong ? 1 : 0.85
    }
  }

  private texture(src: string) {
    let t = this.textures.get(src)
    if (!t) {
      const entry = { tex: new THREE.Texture(), aspect: 1 }
      const tex = new THREE.TextureLoader().load(src, (loaded) => {
        const img = loaded.image as HTMLImageElement
        entry.aspect = img.width / img.height
        this.onTextureLoaded?.()
      })
      tex.colorSpace = THREE.SRGBColorSpace
      entry.tex = tex
      this.textures.set(src, entry)
      t = entry
    }
    return t
  }

  onTextureLoaded?: () => void

  /** Pin cards on the board: one per picture that has arrived, pinned ones show their label. */
  setCards(cards: { src: string, label: Label | null }[]) {
    for (const c of [...this.cards.children]) this.cards.remove(c)
    cards.forEach((c, i) => {
      const { tex, aspect } = this.texture(c.src)
      const card = pinCard(tex, Math.min(1.5, Math.max(0.65, aspect)), c.label ? LABEL_PIN[c.label] : '#ffb627')
      const col = i % 3
      const row = Math.floor(i / 3)
      card.position.set(-0.38 + col * 0.38, 0.97 - row * 0.38, 0.07)
      card.rotation.z = (hash(i, 4) - 0.5) * 0.18
      this.cards.add(card)
    })
  }

  /** The trust garden: one bloom per point of trust. */
  setTrust(n: number, instant = false) {
    const want = Math.min(n, this.gardenSlots.length)
    while (this.blooms.length < want) {
      const i = this.blooms.length
      const f = flower(FLOWER_COLORS[i % FLOWER_COLORS.length]!, 1.5)
      f.position.copy(this.gardenSlots[i]!)
      f.rotation.y = hash(i, 2) * 6
      f.scale.setScalar(instant ? 1.5 : 0.001)
      this.garden.add(f)
      this.blooms.push({ obj: f, grow: instant ? 1 : 0, target: 1 })
    }
    for (let i = 0; i < this.blooms.length; i++) this.blooms[i]!.target = i < want ? 1 : 0
  }

  private updateWater(t: number) {
    this.waterBase.forEach((w, i) => {
      const k = 1 + Math.sin(t * 0.9 + w.phase) * 0.035
      tmpM.compose(tmpP.set(w.x, -0.285, w.z), tmpQ.identity(), tmpS.set(k, 1, k))
      this.water.setMatrixAt(i, tmpM)
    })
    this.water.instanceMatrix.needsUpdate = true
  }

  /** End of the day: the villagers celebrate. */
  party = false

  update(dt: number, reducedMotion: boolean) {
    this.time += dt
    const t = this.time
    if (!reducedMotion) {
      this.updateWater(t)
      this.buoy.position.y = -0.2 + Math.sin(t * 1.6) * 0.04
      this.buoy.rotation.z = Math.sin(t * 1.2) * 0.12
      for (const [i, c] of this.clouds.entries()) c.position.x += Math.sin(t * 0.05 + i) * dt * 0.08
      for (const [id, v] of this.villagers) {
        if (this.party) {
          // Little celebration hops (even Jim, grudgingly).
          const k = id === 'jim' ? 3 : 6
          v.body.position.y = Math.abs(Math.sin(t * k + id.length)) * (id === 'jim' ? 0.04 : 0.18)
          v.body.rotation.y = id === 'jim' ? 0 : Math.sin(t * 3 + id.length) * 0.5
          continue
        }
        const k = id === 'pip' ? 3.2 : 2
        v.body.position.y = Math.abs(Math.sin(t * k + id.length)) * 0.025
        v.body.rotation.z = Math.sin(t * k * 0.5 + id.length) * 0.04
        v.body.rotation.y = 0
      }
    }
    for (const m of this.markers.values()) {
      if (!m.visible) continue
      m.rotation.y = t * 1.5
      m.position.y = m.userData.baseY + (reducedMotion ? 0 : Math.sin(t * 3) * 0.06)
    }
    for (let i = this.blooms.length - 1; i >= 0; i--) {
      const b = this.blooms[i]!
      b.grow += (b.target - b.grow) * (1 - Math.exp(-dt * (reducedMotion ? 30 : 5)))
      const pop = b.target > 0 ? 1 + Math.sin(Math.min(1, b.grow) * Math.PI) * 0.25 : 1
      b.obj.scale.setScalar(Math.max(0.001, b.grow * 1.5 * pop))
      if (b.target === 0 && b.grow < 0.02) {
        this.garden.remove(b.obj)
        this.blooms.splice(i, 1)
      }
    }
  }
}

