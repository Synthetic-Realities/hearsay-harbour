import * as THREE from 'three'

/*
 * Everything on the island is built from code: soft spheres, lathed trunks and rounded boxes
 * in a pastel palette, with no asset files.
 */

const TAU = Math.PI * 2
const mats = new Map<string, THREE.MeshStandardMaterial>()

/** One shared soft material per colour. */
export function mat(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
  const key = color + JSON.stringify(extra)
  let m = mats.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...extra })
    mats.set(key, m)
  }
  return m
}

export function mesh(geo: THREE.BufferGeometry, color: string | THREE.Material, shadow = true) {
  const m = new THREE.Mesh(geo, typeof color === 'string' ? mat(color) : color)
  m.castShadow = shadow
  m.receiveShadow = true
  return m
}

const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => {
  o.position.set(x, y, z)
  return o
}

/** A box with softly rounded edges. */
export function roundBox(w: number, h: number, d: number, r = 0.04) {
  const shape = new THREE.Shape()
  const x = -w / 2 + r
  const y = -h / 2 + r
  const iw = w - 2 * r
  const ih = h - 2 * r
  shape.moveTo(x, y - r)
  shape.lineTo(x + iw, y - r)
  shape.quadraticCurveTo(x + iw + r, y - r, x + iw + r, y)
  shape.lineTo(x + iw + r, y + ih)
  shape.quadraticCurveTo(x + iw + r, y + ih + r, x + iw, y + ih + r)
  shape.lineTo(x, y + ih + r)
  shape.quadraticCurveTo(x - r, y + ih + r, x - r, y + ih)
  shape.lineTo(x - r, y)
  shape.quadraticCurveTo(x - r, y - r, x, y - r)
  const g = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: 3, curveSegments: 4 })
  g.translate(0, 0, -(d - 2 * r) / 2)
  g.computeVertexNormals()
  return g
}

const sphere = (r: number, sy = 1, ws = 16, hs = 12) => new THREE.SphereGeometry(r, ws, hs).scale(1, sy, 1)

/** A pitched roof: a triangular prism, ridge along x. */
function roofGeometry(w: number, d: number, h: number, overhang = 0.08) {
  const s = new THREE.Shape()
  const hw = d / 2 + overhang
  s.moveTo(-hw, 0)
  s.lineTo(hw, 0)
  s.lineTo(0, h)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: w + overhang * 2, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 })
  g.translate(0, 0, -(w + overhang * 2) / 2)
  g.rotateY(Math.PI / 2)
  g.computeVertexNormals()
  return g
}

/* ------------------------------------------------------------------ */
/* Scenery                                                            */
/* ------------------------------------------------------------------ */

const CANOPY = ['#8fcf7a', '#a4d98b', '#7fbf7a', '#b5df8f', '#f3b6c8']

export function tree(seed: number) {
  const g = new THREE.Group()
  const trunk = new THREE.CylinderGeometry(0.05, 0.08, 0.5, 8)
  g.add(at(mesh(trunk, '#a47650'), 0, 0.25, 0))
  const c = CANOPY[seed % CANOPY.length]!
  g.add(at(mesh(sphere(0.32, 0.9), c), 0, 0.6, 0))
  g.add(at(mesh(sphere(0.21), c), -0.18, 0.5, 0.06))
  g.add(at(mesh(sphere(0.2), c), 0.12, 0.82, -0.04))
  if (seed % 3 === 0) {
    for (let i = 0; i < 6; i++) {
      const a = i * 1.7 + seed
      g.add(at(mesh(sphere(0.035), '#ff8f8f', false), Math.cos(a) * 0.3, 0.55 + (i % 3) * 0.1, Math.sin(a) * 0.3))
    }
  }
  return g
}

export function pine() {
  const g = new THREE.Group()
  g.add(at(mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.3, 8), '#8a5f3c'), 0, 0.15, 0))
  for (let i = 0; i < 3; i++) g.add(at(mesh(new THREE.ConeGeometry(0.3 - i * 0.07, 0.36, 9), '#6fae7e'), 0, 0.38 + i * 0.2, 0))
  return g
}

export const FLOWER_COLORS = ['#ffb3c7', '#ffd166', '#c6b3e6', '#ffffff', '#ff9e80', '#9ad0f5']

export function flower(color: string, scale = 1) {
  const g = new THREE.Group()
  g.add(at(mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.22, 5), '#6fb35e', false), 0, 0.11, 0))
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU
    const p = mesh(sphere(0.045, 0.5, 8, 6), color, false)
    p.position.set(Math.cos(a) * 0.05, 0.23, Math.sin(a) * 0.05)
    g.add(p)
  }
  g.add(at(mesh(sphere(0.03, 0.8, 8, 6), '#ffcf4d', false), 0, 0.245, 0))
  g.scale.setScalar(scale)
  return g
}

export function tuft() {
  const g = new THREE.Group()
  for (let i = 0; i < 5; i++) {
    const b = mesh(new THREE.ConeGeometry(0.018, 0.16, 4), '#8fcf73', false)
    const a = (i / 5) * TAU
    b.position.set(Math.cos(a) * 0.03, 0.07, Math.sin(a) * 0.03)
    b.rotation.set(Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4)
    g.add(b)
  }
  return g
}

export function pebble(scale = 1) {
  const p = mesh(sphere(0.07 * scale, 0.55, 10, 6), '#d8cfc2')
  p.position.y = 0.02
  return p
}

export function cloud() {
  const g = new THREE.Group()
  const m = mat('#ffffff', { roughness: 1, emissive: new THREE.Color('#fff6ec'), emissiveIntensity: 0.3 })
  const parts: [number, number, number, number][] = [[0, 0, 0, 0.6], [0.6, -0.1, 0.1, 0.45], [-0.6, -0.12, 0, 0.42], [0.2, 0.25, -0.1, 0.4]]
  for (const [x, y, z, r] of parts) {
    const s = new THREE.Mesh(sphere(r, 0.75), m)
    s.position.set(x, y, z)
    g.add(s)
  }
  return g
}

/* ------------------------------------------------------------------ */
/* Buildings                                                          */
/* ------------------------------------------------------------------ */

export function cottage(wall: string, roof: string, door = '#8a5f3c') {
  const g = new THREE.Group()
  g.add(at(mesh(roundBox(0.95, 0.62, 0.8, 0.06), wall), 0, 0.31, 0))
  g.add(at(mesh(roofGeometry(1.0, 0.86, 0.48), roof), 0, 0.6, 0))
  g.add(at(mesh(roundBox(0.24, 0.38, 0.06, 0.03), door), 0, 0.2, 0.41))
  const glow = mat('#fff1c2', { emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0.6 })
  for (const x of [-0.3, 0.3]) g.add(at(mesh(roundBox(0.17, 0.17, 0.04, 0.02), glow, false), x, 0.36, 0.41))
  g.add(at(mesh(roundBox(0.14, 0.3, 0.14, 0.03), '#c98b6b'), 0.28, 0.92, -0.12))
  return g
}

export function noticeboard() {
  const g = new THREE.Group()
  for (const x of [-0.55, 0.55]) g.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 8), '#a47650'), x, 0.6, 0))
  g.add(at(mesh(roundBox(1.3, 0.85, 0.08, 0.04), '#c99a6b'), 0, 0.78, 0))
  g.add(at(mesh(roundBox(1.18, 0.73, 0.04, 0.02), '#f2dfbd'), 0, 0.78, 0.04))
  g.add(at(mesh(roofGeometry(1.4, 0.32, 0.18, 0.04), '#e88f7a'), 0, 1.22, 0))
  return g
}

/** A little card for the noticeboard, showing a picture. */
export function pinCard(texture: THREE.Texture, aspect: number, pinColor: string) {
  const g = new THREE.Group()
  const h = 0.3
  const w = h * aspect
  g.add(at(mesh(roundBox(w + 0.05, h + 0.05, 0.015, 0.008), '#fffaf0', false), 0, 0, 0))
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }))
  pic.position.z = 0.01
  g.add(pic)
  g.add(at(mesh(sphere(0.035), pinColor, false), 0, h / 2 - 0.01, 0.03))
  return g
}

export function postOffice() {
  const g = cottage('#fff3dc', '#e88f7a', '#6b8fb5')
  // A big wax seal on the gable: this is where the seal check happens.
  const seal = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 20), '#d1495b')
  seal.rotation.x = Math.PI / 2
  g.add(at(seal, 0, 0.78, 0.44))
  g.add(at(mesh(sphere(0.07, 0.4), '#b33a4c', false), 0, 0.78, 0.47))
  // Mailbox by the door.
  g.add(at(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), '#8a5f3c'), 0.55, 0.2, 0.45))
  g.add(at(mesh(roundBox(0.2, 0.16, 0.26, 0.05), '#d1495b'), 0.55, 0.44, 0.45))
  return g
}

export function boatHut() {
  const g = new THREE.Group()
  const hut = cottage('#9ad0f5', '#f2c46b', '#5b3a24')
  hut.scale.setScalar(0.85)
  g.add(hut)
  // Nets drying on a rack.
  for (const x of [-0.5, -0.1]) g.add(at(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6), '#a47650'), x, 0.27, 0.55))
  const net = mesh(new THREE.PlaneGeometry(0.42, 0.3, 4, 3), mat('#fffaf0', { wireframe: true }), false)
  g.add(at(net, -0.3, 0.38, 0.55))
  return g
}

export function treehouse() {
  const g = new THREE.Group()
  g.add(at(mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.9, 9), '#a47650'), 0, 0.45, 0))
  g.add(at(mesh(roundBox(0.8, 0.08, 0.8, 0.03), '#c49a6c'), 0, 0.9, 0))
  g.add(at(mesh(roundBox(0.55, 0.42, 0.5, 0.05), '#ffd166'), 0, 1.15, 0))
  g.add(at(mesh(new THREE.ConeGeometry(0.48, 0.38, 4), '#e86a5a'), 0, 1.55, 0).rotateY(Math.PI / 4))
  g.add(at(mesh(roundBox(0.14, 0.14, 0.03, 0.02), mat('#fff1c2', { emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0.6 }), false), 0, 1.17, 0.26))
  // Ladder.
  for (const x of [-0.12, 0.12]) g.add(at(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 5), '#8a5f3c'), x, 0.45, 0.4))
  for (let i = 0; i < 5; i++) g.add(at(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 5).rotateZ(Math.PI / 2), '#8a5f3c'), 0, 0.12 + i * 0.17, 0.4))
  for (const [x, z] of [[-0.35, -0.2], [0.3, -0.25]] as const) g.add(at(mesh(sphere(0.28, 0.85), '#a4d98b'), x, 1.35, z))
  return g
}

/** Professor Jim's cabin: a satellite dish on the roof and a sign on the door. */
export function jimCabin() {
  const g = cottage('#d9d6cf', '#7a7f8f', '#5b3a24')
  const dish = mesh(new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3.2), mat('#f2f2f2', { side: THREE.DoubleSide }))
  dish.rotation.x = -0.9
  g.add(at(dish, -0.2, 1.0, 0.0))
  g.add(at(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 6), '#8a8fa3'), -0.2, 0.92, -0.05))
  g.add(at(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 5), '#8a8fa3'), 0.3, 1.2, 0.1))
  g.add(at(mesh(roundBox(0.3, 0.12, 0.02, 0.01), '#fff3dc', false), 0, 0.5, 0.43))
  g.add(at(mesh(roundBox(0.22, 0.02, 0.01, 0.005), '#d1495b', false), 0, 0.5, 0.445))
  return g
}

export function crates() {
  const g = new THREE.Group()
  const crate = (x: number, y: number, z: number, s: number, ry: number) => {
    const c = new THREE.Group()
    c.add(mesh(roundBox(s, s, s, 0.03), '#d9a46b'))
    for (const yy of [-s * 0.3, s * 0.3]) c.add(at(mesh(roundBox(s + 0.01, 0.05, s + 0.01, 0.015), '#a47650', false), 0, yy, 0))
    c.position.set(x, y + s / 2, z)
    c.rotation.y = ry
    g.add(c)
  }
  crate(-0.2, 0, 0.05, 0.42, 0.2)
  crate(0.25, 0, -0.1, 0.36, -0.3)
  crate(0, 0.42, 0, 0.32, 0.6)
  // A tag on the top crate: this crate holds a picture's labels.
  g.add(at(mesh(roundBox(0.14, 0.09, 0.01, 0.01), '#fffaf0', false), 0.05, 0.6, 0.17))
  return g
}

export function pierDeck() {
  const g = new THREE.Group()
  for (let i = 0; i < 6; i++) {
    const p = mesh(roundBox(1.25, 0.06, 0.24, 0.02), i % 2 ? '#c49a6c' : '#b88a5c')
    p.position.set(0, 0, -0.65 + i * 0.26)
    g.add(p)
  }
  for (const [x, z] of [[-0.55, -0.6], [0.55, -0.6], [-0.55, 0.6], [0.55, 0.6]] as const) {
    g.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 7), '#8a5f3c'), x, -0.2, z))
  }
  return g
}

export function buoy() {
  const g = new THREE.Group()
  g.add(at(mesh(sphere(0.16, 0.8), '#ffffff'), 0, 0, 0))
  g.add(at(mesh(new THREE.CylinderGeometry(0.162, 0.162, 0.07, 16), '#d1495b'), 0, 0.02, 0))
  g.add(at(mesh(new THREE.ConeGeometry(0.05, 0.18, 8), '#d1495b'), 0, 0.18, 0))
  return g
}

export function lighthouse() {
  const g = new THREE.Group()
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector2(0.32 - i * 0.02, i * 0.2))
  const body = new THREE.LatheGeometry(pts, 18)
  g.add(mesh(body, '#fffaf0'))
  for (const y of [0.35, 0.95]) g.add(at(mesh(new THREE.CylinderGeometry(0.29 - y * 0.1, 0.3 - y * 0.1, 0.18, 18), '#e86a5a'), 0, y, 0))
  g.add(at(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 12), mat('#fff4c9', { emissive: new THREE.Color('#ffd97a'), emissiveIntensity: 1 })), 0, 1.72, 0))
  g.add(at(mesh(new THREE.ConeGeometry(0.26, 0.28, 12), '#e86a5a'), 0, 1.97, 0))
  return g
}

/* ------------------------------------------------------------------ */
/* Characters                                                         */
/* ------------------------------------------------------------------ */

export interface Critter {
  root: THREE.Group
  body: THREE.Group
}

/** The player: a round little puffin, the harbour's new noticeboard keeper. */
export function puffin(): Critter {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  body.add(at(mesh(sphere(0.2, 1.15), '#3d3a4b'), 0, 0.26, 0))
  body.add(at(mesh(sphere(0.155, 1.1), '#fffaf0'), 0, 0.24, 0.08))
  body.add(at(mesh(sphere(0.15), '#3d3a4b'), 0, 0.5, 0.02))
  body.add(at(mesh(sphere(0.105, 0.95), '#fffaf0'), 0, 0.49, 0.08))
  const beak = mesh(new THREE.ConeGeometry(0.06, 0.15, 4), '#ff8a3d')
  beak.rotation.x = Math.PI / 2
  beak.scale.set(0.8, 1, 1.4)
  body.add(at(beak, 0, 0.47, 0.2))
  for (const x of [-0.055, 0.055]) {
    body.add(at(mesh(sphere(0.024), '#2b2230', false), x, 0.53, 0.16))
    body.add(at(mesh(sphere(0.022, 0.6), '#ffb3c7', false), x * 1.7, 0.46, 0.14))
  }
  for (const x of [-0.08, 0.08]) {
    const foot = mesh(sphere(0.06, 0.35), '#ff8a3d')
    foot.scale.z = 1.5
    body.add(at(foot, x, 0.03, 0.05))
  }
  for (const s of [-1, 1]) {
    const wing = mesh(sphere(0.1, 1.6), '#3d3a4b')
    wing.scale.x = 0.4
    body.add(at(wing, s * 0.19, 0.27, -0.01))
  }
  // A little satchel for evidence.
  const strap = mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 24), '#c99a6b', false)
  strap.rotation.set(0, Math.PI / 2, 0.6)
  body.add(at(strap, 0, 0.3, 0))
  body.add(at(mesh(roundBox(0.13, 0.1, 0.06, 0.02), '#e8b26a'), 0.15, 0.18, 0.08))
  return { root, body }
}

export interface VillagerLook {
  coat: string
  skin: string
  hair: string
  accent: string
}

/** A villager: a round body, a head with their own hair or turban, and something they carry. */
export function villager(look: VillagerLook, kind: 'wren' | 'pip' | 'moss' | 'jim'): Critter {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  const { coat, skin, hair, accent } = look
  body.add(at(mesh(sphere(0.22, 1.25), coat), 0, 0.28, 0))
  body.add(at(mesh(sphere(0.16), skin), 0, 0.6, 0))
  for (const x of [-0.055, 0.055]) {
    body.add(at(mesh(sphere(0.02), '#2b2230', false), x, 0.62, 0.145))
    body.add(at(mesh(sphere(0.022, 0.6), '#ff9fb5', false), x * 1.8, 0.56, 0.13))
  }
  // Little hands (Jim has his arms folded instead).
  if (kind !== 'jim') for (const x of [-0.2, 0.2]) body.add(at(mesh(sphere(0.045), skin), x, 0.26, 0.1))

  if (kind === 'wren') {
    // A neatly tied turban: a rounded wrap with the folds meeting in a peak at the front.
    const wrap = mesh(sphere(0.178, 0.82), accent)
    wrap.scale.z = 1.08
    body.add(at(wrap, 0, 0.71, -0.012))
    // Folds sweeping up from each temple to meet in a peak above the forehead.
    for (const s of [-1, 1]) {
      const fold = mesh(sphere(0.1, 0.5), accent)
      fold.scale.set(1.25, 1, 0.7)
      fold.rotation.z = s * 0.55
      body.add(at(fold, s * 0.06, 0.74, 0.1))
    }
    const peak = mesh(new THREE.ConeGeometry(0.075, 0.14, 12), accent)
    peak.scale.z = 0.6
    body.add(at(peak, 0, 0.84, 0.07))
    const band = mesh(new THREE.TorusGeometry(0.16, 0.016, 6, 24).rotateX(Math.PI / 2), mat(accent, { roughness: 0.55 }), false)
    band.rotation.x = -0.12
    body.add(at(band, 0, 0.665, 0.01))
    // A full white beard and moustache.
    const beard = mesh(sphere(0.13, 1.05), hair)
    beard.scale.z = 0.62
    body.add(at(beard, 0, 0.5, 0.1))
    const tache = mesh(sphere(0.05, 0.45), hair, false)
    tache.scale.x = 1.7
    body.add(at(tache, 0, 0.575, 0.148))
    // Round spectacles and an old camera on a strap.
    for (const x of [-0.055, 0.055]) {
      body.add(at(mesh(new THREE.TorusGeometry(0.032, 0.006, 6, 16), '#5b3a24', false), x, 0.625, 0.152))
    }
    body.add(at(mesh(roundBox(0.16, 0.1, 0.07, 0.02), '#3d3a4b'), 0, 0.33, 0.22))
    const lens = mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.06, 12), '#8a8fa3', false)
    lens.rotation.x = Math.PI / 2
    body.add(at(lens, 0, 0.33, 0.27))
  }
  else if (kind === 'jim') {
    // Grey hair pulled back into a ponytail, a salt-and-pepper beard, rectangular glasses and a frown.
    const cap = mesh(sphere(0.166, 0.78), hair)
    cap.scale.z = 1.04
    body.add(at(cap, 0, 0.655, -0.035))
    body.add(at(mesh(new THREE.TorusGeometry(0.026, 0.01, 6, 12), '#3d3a4b', false), 0, 0.64, -0.185))
    const tail = mesh(sphere(0.045, 1.9), hair)
    tail.rotation.x = 0.35
    body.add(at(tail, 0, 0.56, -0.2))
    const beard = mesh(sphere(0.135, 0.95), hair)
    beard.scale.z = 0.65
    body.add(at(beard, 0, 0.5, 0.09))
    for (const [x, y] of [[-0.06, 0.47], [0.04, 0.44], [0.08, 0.52], [-0.03, 0.54], [0.0, 0.41], [-0.09, 0.5]] as const) {
      body.add(at(mesh(sphere(0.014), '#4a4744', false), x, y, 0.175))
    }
    for (const x of [-0.06, 0.06]) {
      body.add(at(mesh(roundBox(0.075, 0.05, 0.012, 0.01), mat('#2b2230', { transparent: true, opacity: 0.85 }), false), x, 0.625, 0.152))
      const brow = mesh(roundBox(0.06, 0.016, 0.016, 0.006), '#4a4744', false)
      brow.rotation.z = x < 0 ? -0.35 : 0.35
      body.add(at(brow, x, 0.68, 0.145))
    }
    // Arms folded across his chest, tattooed.
    for (const s of [-1, 1]) {
      const arm = mesh(new THREE.CapsuleGeometry(0.045, 0.22, 4, 10), skin)
      arm.rotation.z = Math.PI / 2 + s * 0.12
      body.add(at(arm, 0, 0.3 + s * 0.035, 0.19 + s * 0.012))
      for (const t of [-0.08, 0.02, 0.09]) {
        const ink = mesh(sphere(0.022, 0.4), accent, false)
        ink.scale.set(1.2, 1, 0.8)
        body.add(at(ink, t * -s, 0.3 + s * 0.035 + 0.035, 0.21 + s * 0.012))
      }
    }
    // A clipboard of theories.
    body.add(at(mesh(roundBox(0.12, 0.16, 0.015, 0.01), '#e8d2a6'), -0.24, 0.25, 0.04))
  }
  else if (kind === 'pip') {
    // Hair close to the head, and two round pigtail puffs tied with pink bobbles.
    const cap = mesh(sphere(0.168, 0.85), hair)
    cap.scale.z = 1.02
    body.add(at(cap, 0, 0.64, -0.025))
    for (const s of [-1, 1]) {
      body.add(at(mesh(sphere(0.085), hair), s * 0.17, 0.73, -0.02))
      body.add(at(mesh(sphere(0.032), accent, false), s * 0.125, 0.7, 0.0))
    }
    // A magnifying glass.
    const ring = mesh(new THREE.TorusGeometry(0.07, 0.014, 6, 18), '#e8b26a', false)
    body.add(at(ring, 0.22, 0.42, 0.12))
    body.add(at(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 6), '#8a5f3c', false), 0.22, 0.29, 0.12))
  }
  else {
    // Messy ginger hair, a sprinkle of freckles, and a coil of rope.
    const cap = mesh(sphere(0.168, 0.8), hair)
    body.add(at(cap, 0, 0.66, -0.03))
    for (const [x, y, z, r] of [[-0.07, 0.78, 0.04, 0.06], [0.05, 0.8, 0.05, 0.055], [0.0, 0.79, -0.06, 0.065], [0.11, 0.74, 0.07, 0.045]] as const) {
      body.add(at(mesh(sphere(r), hair), x, y, z))
    }
    for (const sx of [-1, 1]) {
      for (const [dx, dy] of [[0, 0], [0.022, 0.012], [0.03, -0.012]] as const) {
        body.add(at(mesh(sphere(0.009), '#c8743f', false), sx * (0.07 + dx), 0.585 + dy, 0.148))
      }
    }
    body.add(at(mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 16).rotateY(Math.PI / 2), '#e8d2a6', false), -0.24, 0.3, 0.05))
    // Yellow wellies.
    for (const x of [-0.08, 0.08]) body.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 10), accent), x, 0.05, 0.02))
  }
  root.scale.setScalar(kind === 'wren' || kind === 'jim' ? 1 : kind === 'pip' ? 0.78 : 0.84)
  return { root, body }
}

/** The harbour gull that brings each new picture, and nags you to share it. */
export function gull() {
  const root = new THREE.Group()
  const body = mesh(sphere(0.17, 0.75), '#ffffff')
  body.scale.z = 1.6
  root.add(body)
  root.add(at(mesh(sphere(0.11), '#ffffff'), 0, 0.08, 0.26))
  const beak = mesh(new THREE.ConeGeometry(0.03, 0.12, 6), '#ffcf4d')
  beak.rotation.x = Math.PI / 2
  root.add(at(beak, 0, 0.07, 0.4))
  for (const x of [-0.04, 0.04]) root.add(at(mesh(sphere(0.016), '#2b2230', false), x, 0.12, 0.34))
  const wings: THREE.Object3D[] = []
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group()
    pivot.position.set(s * 0.12, 0.05, 0)
    const w = mesh(roundBox(0.5, 0.025, 0.2, 0.01), '#cfd6e2')
    w.position.x = s * 0.25
    pivot.add(w)
    root.add(pivot)
    wings.push(pivot)
  }
  // The card it carries.
  const card = mesh(roundBox(0.22, 0.16, 0.012, 0.006), '#fffaf0', false)
  card.rotation.x = -Math.PI / 2.4
  root.add(at(card, 0, -0.18, 0.1))
  return { root, wings, card }
}
