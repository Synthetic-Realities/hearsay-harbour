import type { CheckId, VillagerId } from './content'
import { type Hex, hexDistance, hexKey, hexesInRange } from './hex'

export type Terrain = 'plaza' | 'grass' | 'meadow' | 'sand' | 'garden' | 'water' | 'pier'

export interface Tile {
  hex: Hex
  key: string
  terrain: Terrain
  height: number
  walkable: boolean
}

export type PlaceId = 'board' | VillagerId | CheckId

export interface Place {
  id: PlaceId
  /** Where the building or person stands (not walkable). */
  at: Hex
  /** The tile you stand on to use it. */
  door: Hex
  /** Short verb for the action prompt. */
  verb: string
  name: string
  /** Name tag shown over it on the island and on the map. */
  label: string
}

export const PLACES: Place[] = [
  { id: 'board', at: { q: 0, r: -1 }, door: { q: 0, r: 0 }, verb: 'Read', name: 'the noticeboard', label: 'Noticeboard' },
  { id: 'wren', at: { q: -3, r: 0 }, door: { q: -3, r: 1 }, verb: 'Talk to', name: 'Wren', label: 'Wren' },
  { id: 'pip', at: { q: 2, r: -3 }, door: { q: 2, r: -2 }, verb: 'Talk to', name: 'Pip', label: 'Pip' },
  { id: 'moss', at: { q: 3, r: 0 }, door: { q: 2, r: 1 }, verb: 'Talk to', name: 'Moss', label: 'Moss' },
  { id: 'jim', at: { q: -4, r: 3 }, door: { q: -3, r: 3 }, verb: 'Talk to', name: 'Grumpy Professor Jim', label: 'Prof. Jim' },
  { id: 'seal', at: { q: -2, r: -2 }, door: { q: -1, r: -2 }, verb: 'Check the', name: 'wax seal', label: 'Wax seal' },
  { id: 'tide', at: { q: 0, r: 6 }, door: { q: 0, r: 5 }, verb: 'Cast for the', name: 'tide search', label: 'Tide search' },
  { id: 'crate', at: { q: 2, r: 3 }, door: { q: 1, r: 3 }, verb: 'Open the', name: 'label crate', label: 'Label crate' },
]

export const PLACE_BY_ID = Object.fromEntries(PLACES.map(p => [p.id, p])) as Record<PlaceId, Place>

/** Tiles where the trust garden grows, nearest the board first. */
export const GARDEN: Hex[] = [
  { q: -1, r: 1 }, { q: -2, r: 2 }, { q: -1, r: 2 }, { q: -2, r: 3 },
]

/**
 * Where the garden spreads once the garden beds are full: nearby grass, nearest first.
 * More levels mean more trust, so more of the island blooms.
 */
export const GARDEN_SPREAD: Hex[] = [
  { q: 0, r: 2 }, { q: -1, r: 3 }, { q: -3, r: 2 }, { q: 1, r: 1 }, { q: 1, r: 2 }, { q: -2, r: 1 },
]

/** The board's own tile is painted lilac so it stands out (the same colour as Wren's roof). */
export const BOARD_TILE_COLOR = '#c6b3e6'

/** Kept clear and not walkable, so a click aimed at the board's diamond never lands behind it. */
export const BEHIND_BOARD: Hex = { q: 0, r: -2 }

/** Scenery that takes up a tile. */
export const LIGHTHOUSE: Hex = { q: 4, r: -3 }

export const PIER: Hex[] = [{ q: 0, r: 4 }, { q: 0, r: 5 }]

const hash = (q: number, r: number) => {
  const s = Math.sin(q * 127.1 + r * 311.7) * 43758.5453
  return s - Math.floor(s)
}

export interface World {
  tiles: Tile[]
  byKey: Map<string, Tile>
}

export function buildWorld(): World {
  const tiles: Tile[] = []
  const occupied = new Set([...PLACES.map(p => hexKey(p.at)), hexKey(LIGHTHOUSE), hexKey(BEHIND_BOARD)])
  const garden = new Set(GARDEN.map(hexKey))
  const pier = new Set(PIER.map(hexKey))
  const doors = new Set(PLACES.map(p => hexKey(p.door)))
  const origin = { q: 0, r: 0 }
  for (const hex of hexesInRange(origin, 9)) {
    const key = hexKey(hex)
    const d = hexDistance(hex, origin)
    const n = hash(hex.q, hex.r)
    // A roundish island with a slightly ragged coast.
    const land = d <= 3 || (d === 4 && n > 0.18) || occupied.has(key) || doors.has(key)
    let terrain: Terrain
    if (pier.has(key)) terrain = 'pier'
    else if (key === hexKey(PLACE_BY_ID.tide.at)) terrain = 'water'
    else if (!land) terrain = 'water'
    else if (garden.has(key)) terrain = 'garden'
    else if (d <= 1) terrain = 'plaza'
    else if (d >= 4 || (d === 3 && n > 0.72)) terrain = 'sand'
    else terrain = n > 0.55 ? 'meadow' : 'grass'
    const height = terrain === 'water' ? -0.28 : terrain === 'pier' ? 0.02 : terrain === 'sand' ? 0 : 0.08 + n * 0.08
    const walkable = terrain !== 'water' && !occupied.has(key)
    tiles.push({ hex, key, terrain, height, walkable })
  }
  return { tiles, byKey: new Map(tiles.map(t => [t.key, t])) }
}

export const TERRAIN_COLORS: Record<Terrain, string> = {
  plaza: '#e8d2a4',
  grass: '#a6d98a',
  meadow: '#c3e38e',
  sand: '#f7eacb',
  garden: '#d9b08a',
  water: '#8fd3e8',
  pier: '#c49a6c',
}
