import { defineStore } from 'pinia'
import { type CheckId, type Label, type Lean, PACKS, type Picture, type VillagerId, isVillager, packById } from '~/utils/content'
import { PLACE_BY_ID, type PlaceId } from '~/utils/world'
import { hexToWorld } from '~/utils/hex'

export type Caption = 'careful' | 'over' | 'shrug'

export type Votes = Record<Lean, number>

export interface Pebble {
  x: number
  y: number
}

/** Everything the player did with one picture: the recorded findings. */
export interface PictureRecord {
  id: string
  firstLean: Lean | null
  pebbles: Pebble[]
  talked: VillagerId[]
  checked: CheckId[]
  label: Label | null
  caption: Caption | null
  sharedEarly: boolean
  trustDelta: number
  /** Workshop mode: the room's show of hands, before and after investigating. */
  roomFirst: Votes
  roomFinal: Votes
}

/**
 * - `arriving`: the gull is bringing the picture to the board
 * - `notice`: waiting for the player to read it at the board
 * - `investigate`: Discuss and Check, free to roam
 * - `done`: revealed, waiting for the next picture
 */
export type Step = 'arriving' | 'notice' | 'investigate' | 'done'

export type Dialog =
  | { kind: 'guide', page?: number }
  | { kind: 'notice' }
  | { kind: 'talk', who: VillagerId }
  | { kind: 'check', id: CheckId }
  | { kind: 'reflect' }
  | { kind: 'reveal' }
  | { kind: 'share' }
  | { kind: 'recap' }
  | { kind: 'help' }
  | { kind: 'map' }
  | { kind: 'studio' }
  | { kind: 'credits' }
  | { kind: 'reward' }

const blankRecord = (p: Picture): PictureRecord => ({
  id: p.id,
  firstLean: null,
  pebbles: [],
  talked: [],
  checked: [],
  label: null,
  caption: null,
  sharedEarly: false,
  trustDelta: 0,
  roomFirst: { camera: 0, ai: 0, unsure: 0 },
  roomFinal: { camera: 0, ai: 0, unsure: 0 },
})

const SAVE_KEY = 'hearsay-harbour:v1'

export function scoreRecord(rec: PictureRecord, pic: Picture) {
  const evidence = rec.talked.length + rec.checked.length
  let delta: number
  if (rec.label === pic.truth) delta = rec.sharedEarly ? 1 : 3
  else if (rec.label && pic.close.includes(rec.label)) delta = 1
  // Saying "still unsure" after a proper look is honest, and the village trusts honesty.
  else if (rec.label === 'unsure') delta = evidence >= 3 ? 1 : 0
  // A confident wrong answer costs far more, and more again if it was rushed out.
  else delta = rec.sharedEarly ? -4 : -2
  if (rec.caption === 'careful') delta += 1
  if (rec.caption === 'over' && rec.label !== pic.truth) delta -= 1
  return delta
}

export const useGame = defineStore('game', {
  state: () => ({
    started: false,
    index: 0,
    step: 'arriving' as Step,
    /** Which picture pack (level) is being played. */
    packId: PACKS[0]!.id,
    records: PACKS[0]!.pictures.map(blankRecord),
    trust: 2,
    dialog: null as Dialog | null,
    /** The place the player is standing at, if any. */
    at: null as PlaceId | null,
    /** Polite announcements for screen readers. */
    announcement: '',
    /** Bumped when the scene should send the player somewhere (e.g. "go to the board"). */
    goto: null as PlaceId | null,
    muted: false,
    /** Camera zoom: below 1 is closer, above 1 shows more of the island. */
    zoom: 1,
    /** Bumped to ask the camera to recentre on the puffin. */
    recentre: 0,
    /** The puffin's spot on the island (world x, z), for the map. */
    pos: { x: 0, z: 0 },
    /** Workshop mode: a facilitator runs the game for a room, with show-of-hands votes. */
    workshop: false,
    /** Whether there's a saved day to continue from the title screen. */
    hasSave: false,
  }),
  getters: {
    pack: s => packById(s.packId),
    pictures: s => packById(s.packId).pictures,
    picture: s => {
      const pics = packById(s.packId).pictures
      return pics[Math.min(s.index, pics.length - 1)]!
    },
    record: s => s.records[Math.min(s.index, s.records.length - 1)]!,
    finished: s => s.index >= s.records.length,
    evidenceCount(): number {
      return this.record.talked.length + this.record.checked.length
    },
    /**
     * Where to go next: the board to start or finish a picture, otherwise the nearest place
     * not yet visited, nudging towards at least one villager and one tool first.
     */
    suggestion(): PlaceId | null {
      if (!this.started || this.finished || this.dialog) return null
      if (this.step === 'notice') return 'board'
      if (this.step !== 'investigate') return null
      const rec = this.record
      const seen = new Set<string>([...rec.talked, ...rec.checked])
      const people = (['wren', 'pip', 'moss'] as PlaceId[]).filter(id => !seen.has(id))
      const tools = (['tide', 'seal', 'crate'] as PlaceId[]).filter(id => !seen.has(id))
      const nearest = (ids: PlaceId[]) => ids
        .map((id) => {
          const { x, z } = hexToWorld(PLACE_BY_ID[id].door)
          return { id, d: Math.hypot(x - this.pos.x, z - this.pos.z) }
        })
        .sort((a, b) => a.d - b.d)[0]?.id ?? null
      if (this.evidenceCount >= 4) return 'board'
      if (!rec.talked.some(v => v !== 'jim') && people.length) return nearest(people)
      if (!rec.checked.length && tools.length) return nearest(tools)
      const rest = [...people, ...tools, ...(seen.has('jim') ? [] : ['jim' as PlaceId])]
      return rest.length ? nearest(rest) : 'board'
    },
  },
  actions: {
    say(text: string) {
      // Clear first so repeating the same message is still announced.
      this.announcement = ''
      queueMicrotask(() => (this.announcement = text))
    },
    open(d: Dialog) {
      this.dialog = d
    },
    close() {
      this.dialog = null
    },
    start(workshop = false, packId?: string) {
      this.packId = packById(packId ?? this.packId).id
      this.restart()
      this.workshop = workshop
      this.started = true
      this.dialog = { kind: 'guide', page: 0 }
    },
    /** Pick up a saved day where it left off. */
    resume() {
      if (!this.load()) return this.start()
      this.started = true
      this.dialog = this.finished ? { kind: 'reward' } : null
      // A picture that was mid-flight arrives again.
      if (this.step === 'done' && !this.finished) this.step = 'arriving'
    },
    save() {
      if (!this.started) return
      try {
        const { packId, index, step, records, trust, workshop, muted } = this
        localStorage.setItem(SAVE_KEY, JSON.stringify({ packId, index, step, records, trust, workshop, muted }))
      }
      catch {}
    },
    peekSave() {
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        const d = raw ? JSON.parse(raw) : null
        const pics = packById(d?.packId ?? PACKS[0]!.id).pictures
        this.hasSave = !!d && Array.isArray(d.records) && d.records.length === pics.length
          && d.records.every((r: PictureRecord, i: number) => r.id === pics[i]!.id)
      }
      catch {
        this.hasSave = false
      }
    },
    load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        if (!raw) return false
        const d = JSON.parse(raw)
        const pack = packById(d.packId ?? PACKS[0]!.id)
        if (pack.id !== (d.packId ?? pack.id)) return false
        if (!Array.isArray(d.records) || d.records.length !== pack.pictures.length) return false
        // A save from before the pictures changed would mix up answers, so start fresh instead.
        if (d.records.some((r: PictureRecord, i: number) => r.id !== pack.pictures[i]!.id)) return false
        this.packId = pack.id
        this.index = d.index
        this.step = d.step
        this.records = d.records.map((r: PictureRecord, i: number) => ({ ...blankRecord(pack.pictures[i]!), ...r }))
        this.trust = d.trust
        this.workshop = !!d.workshop
        this.muted = !!d.muted
        return true
      }
      catch {
        return false
      }
    },
    arrived() {
      this.step = 'notice'
      this.say(`${this.picture.arrival} Go to the noticeboard to look at it.`)
    },
    /** The player used whatever they're standing at. */
    use(place: PlaceId) {
      if (this.finished) {
        if (place === 'board') this.open({ kind: 'recap' })
        return
      }
      if (this.step === 'arriving' || this.step === 'done') {
        if (place === 'board') this.say('The board is waiting for the next picture.')
        else this.say('Nothing to look into right now. The next picture is on its way.')
        return
      }
      if (place === 'board') {
        this.open(this.step === 'notice' ? { kind: 'notice' } : { kind: 'reflect' })
        return
      }
      if (this.step === 'notice') {
        this.say('Read the new picture at the noticeboard first.')
        this.goto = 'board'
        return
      }
      if (isVillager(place)) this.open({ kind: 'talk', who: place })
      else this.open({ kind: 'check', id: place })
    },
    setFirstImpression(lean: Lean, pebbles: Pebble[]) {
      this.record.firstLean = lean
      this.record.pebbles = pebbles
      this.step = 'investigate'
      this.dialog = null
      this.say('First impression pinned. Now ask around and use the tools, then come back to the board.')
    },
    talked(who: VillagerId) {
      if (!this.record.talked.includes(who)) this.record.talked.push(who)
    },
    checked(id: CheckId) {
      if (!this.record.checked.includes(id)) this.record.checked.push(id)
    },
    pin(label: Label, caption: Caption) {
      const rec = this.record
      rec.label = label
      rec.caption = caption
      rec.trustDelta = scoreRecord(rec, this.picture)
      this.trust = Math.max(0, this.trust + rec.trustDelta)
      this.step = 'done'
      this.dialog = { kind: 'reveal' }
    },
    /** Giving in to the Share gull: the first impression goes straight out. */
    shareNow() {
      const rec = this.record
      rec.sharedEarly = true
      const label: Label = rec.firstLean === 'camera' ? 'camera' : rec.firstLean === 'ai' ? 'ai' : 'unsure'
      this.pin(label, 'over')
    },
    next() {
      this.index++
      this.dialog = this.finished ? { kind: 'reward' } : null
      this.step = this.finished ? 'done' : 'arriving'
    },
    zoomBy(f: number) {
      this.zoom = Math.min(1.9, Math.max(0.5, this.zoom * f))
    },
    vote(which: 'roomFirst' | 'roomFinal', lean: Lean, by: number) {
      const v = this.record[which]
      v[lean] = Math.max(0, v[lean] + by)
    },
    restart() {
      this.index = 0
      this.records = this.pictures.map(blankRecord)
      this.trust = 2
      this.step = 'arriving'
      this.dialog = null
    },
  },
})
