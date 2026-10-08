/*
 * The picture pack for one island day. Everything a facilitator might want to change lives
 * here: the pictures, the captions they arrive with, what each villager thinks, what each
 * check turns up, and the reveal.
 *
 * The check results are scripted for teaching. They describe what a real check would
 * typically find, so facilitators should confirm them against their own searches before
 * running a workshop.
 */

export type Label = 'camera' | 'edited' | 'drawn' | 'assisted' | 'ai' | 'unsure'
export type Lean = 'camera' | 'drawn' | 'ai' | 'unsure'
export type VillagerId = 'wren' | 'pip' | 'moss' | 'jim'
export const VILLAGER_IDS: VillagerId[] = ['wren', 'pip', 'moss', 'jim']
export const isVillager = (id: string): id is VillagerId => (VILLAGER_IDS as string[]).includes(id)
export type CheckId = 'tide' | 'seal' | 'crate'

export const LABELS: Record<Label, { name: string, blurb: string }> = {
  camera: { name: 'Camera-made', blurb: 'A photo, taken with a camera or phone' },
  edited: { name: 'Edited photo', blurb: 'A real photo, changed afterwards' },
  drawn: { name: 'Hand-drawn or illustrated', blurb: 'Drawn or painted by a person, on paper or on a computer' },
  assisted: { name: 'AI-assisted', blurb: 'People made it, with AI doing some of the work' },
  ai: { name: 'AI-generated', blurb: 'Made by an AI image tool' },
  unsure: { name: 'Still unsure', blurb: 'The evidence doesn\'t settle it. You decide, and "not sure yet" is a fine answer' },
}

/** The first-impression choices, in order (also the room's first vote). */
export const LEAN_CHOICES: { id: Lean, text: string, short: string }[] = [
  { id: 'camera', text: 'Looks camera-made', short: 'Camera' },
  { id: 'drawn', text: 'Looks hand-drawn or illustrated', short: 'Hand-drawn' },
  { id: 'ai', text: 'Looks AI-made', short: 'AI' },
  { id: 'unsure', text: 'Can\'t tell yet', short: 'Can\'t tell' },
]

/** The "How was it made?" choices, in order (also the room's final vote). */
export const LABEL_ORDER: Label[] = ['camera', 'edited', 'drawn', 'assisted', 'ai', 'unsure']

/** Did a first impression point the right way? */
export function leanMatches(lean: Lean | null, truth: Label) {
  return (lean === 'camera' && (truth === 'camera' || truth === 'edited'))
    || (lean === 'drawn' && truth === 'drawn')
    || (lean === 'ai' && (truth === 'ai' || truth === 'assisted'))
}

/** Colours for each choice, used in the room's vote bars. */
export const CHOICE_COLORS: Record<string, string> = {
  camera: '#3f8fb0', edited: '#9ad0f5', drawn: '#8a6a9e', assisted: '#f2a0aa', ai: '#d1495b', unsure: '#f4c94f',
}

/** The room's votes as readable pairs, in the order the choices were offered. */
export function voteList(v: Partial<Record<string, number>>, first: boolean) {
  const opts = first ? LEAN_CHOICES.map(c => ({ id: c.id as string, name: c.short })) : LABEL_ORDER.map(l => ({ id: l as string, name: LABELS[l].name }))
  return opts.map(o => ({ ...o, n: v[o.id] ?? 0, color: CHOICE_COLORS[o.id]! }))
}

export const LEAN_WORDS: Record<Lean, string> = {
  camera: 'leans camera',
  drawn: 'leans hand-drawn',
  ai: 'leans AI',
  unsure: 'not sure',
}

export interface Villager {
  id: VillagerId
  name: string
  role: string
  /** What this villager pays attention to. */
  eye: string
  /** Shown in the welcome guide. */
  about: string
  coat: string
  skin: string
  hair: string
  /** Wren's turban, Pip's hair bobbles, Moss's boots, Jim's tattoos. */
  accent: string
  /** A villager whose opinion is the same about every picture, so it isn't evidence. */
  unreliable?: string
}

export const VILLAGERS: Record<VillagerId, Villager> = {
  wren: { id: 'wren', name: 'Wren', role: 'retired photographer', eye: 'reads light, focus and lenses', about: 'A Sikh elder who spent fifty years behind a camera. He knows how real light behaves.', coat: '#c6b3e6', skin: '#b07a52', hair: '#f4f1ec', accent: '#2f4f8f' },
  pip: { id: 'pip', name: 'Pip', role: 'sharp-eyed kid', eye: 'spots text and small details', about: 'Seven years old, never without her magnifying glass. Nothing small gets past her.', coat: '#ffcf4d', skin: '#6b3f26', hair: '#22160f', accent: '#e86a8a' },
  jim: { id: 'jim', name: 'Grumpy Professor Jim', role: 'retired professor and conspiracy theorist', eye: 'thinks everything is AI', about: 'Grey ponytail, salt-and-pepper beard, tattooed arms, and very sure of himself. He says every picture is fake, even the obviously real ones.', coat: '#8a8fa3', skin: '#f2d2bd', hair: '#9a968f', accent: '#3f5d8a', unreliable: 'Jim says every picture is AI, whatever it shows. An opinion that never changes tells you nothing about this picture.' },
  moss: { id: 'moss', name: 'Moss', role: 'young fisher', eye: 'asks who shared it and why', about: 'Helps on his family\'s boat and hears every bit of harbour gossip, so he always asks who\'s behind a story.', coat: '#7fbf7a', skin: '#ffe2cc', hair: '#d9622b', accent: '#f2c46b' },
}

export interface CheckInfo {
  id: CheckId
  name: string
  place: string
  /** What the real-world equivalent is. */
  realWorld: string
}

export const CHECKS: Record<CheckId, CheckInfo> = {
  tide: { id: 'tide', name: 'Tide search', place: 'the end of the pier', realWorld: 'Reverse image search: look for older copies and where the picture first appeared' },
  seal: { id: 'seal', name: 'Wax seal', place: 'the post office', realWorld: 'Content credentials (C2PA): a tamper-evident label some cameras and AI tools attach' },
  crate: { id: 'crate', name: 'Label crate', place: 'the dock crates', realWorld: 'File details (metadata): camera model, date and size stored inside the file' },
}

export type Strength = 'strong' | 'some' | 'none'

export interface Finding {
  headline: string
  body: string
  /** How much this finding helps decide. `none` findings still teach something. */
  strength: Strength
  points?: Lean
}

export interface Cue {
  /** Position on the picture, 0..1 from top-left. */
  x: number
  y: number
  note: string
}

export interface Picture {
  id: string
  /** Short name for credits and facilitator notes. */
  title?: string
  /** File name in public/pictures. */
  src: string
  /** How the picture arrives in the harbour. */
  arrival: string
  /** The caption it was shared with. */
  claim: string
  truth: Label
  /** Labels that are near enough to earn partial credit. */
  close: Label[]
  takes: Record<VillagerId, { lean: Lean, text: string }>
  checks: Record<CheckId, Finding>
  cues: Cue[]
  verdict: string
  lesson: string
  /** The picture's credential, shown on the reveal: what made it and who. */
  madeWith?: string
  /** Where the picture really came from, for facilitators and the credits. */
  source?: string
  /** `draft` entries came from the import pipeline and still need a human check. */
  /** Hidden pictures wait in a holding phase: they're not in the game until made visible. */
  visible?: boolean
}

export interface Pack {
  id: string
  /** Difficulty level: 1 is the tutorial day, higher levels are harder. */
  level: number
  title: string
  blurb: string
  pictures: Picture[]
}

/*
 * Picture packs live as JSON in app/packs/, one per level, so the import pipeline
 * (see content-inbox/README.md) can add pictures without touching code.
 */
const packFiles = import.meta.glob<Pack>('../packs/*.json', { eager: true, import: 'default' })
export const PACKS: Pack[] = Object.values(packFiles)
  .map(p => ({ ...p, pictures: (p.pictures ?? []).filter(pic => pic.visible !== false) }))
  .filter(p => p.pictures.length)
  .sort((a, b) => a.level - b.level || a.title.localeCompare(b.title))

export const packById = (id: string) => PACKS.find(p => p.id === id) ?? PACKS[0]!

/** URL for a picture file in public/pictures, wherever the game is hosted. */
export function pictureUrl(file: string) {
  const base = useRuntimeConfig().app.baseURL || '/'
  return `${base.endsWith('/') ? base : `${base}/`}pictures/${file}`
}
