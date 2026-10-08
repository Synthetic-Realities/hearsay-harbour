/* Dev Studio only: every level and its pictures (visible or not), read fresh from disk. */
export default defineEventHandler(async () => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  return (await readPacks()).map(p => ({
    id: p.data.id,
    level: p.data.level,
    title: p.data.title,
    blurb: p.data.blurb,
    pictures: p.data.pictures.map(x => ({ ...x, visible: x.visible !== false })),
  })).sort((a, b) => a.level - b.level)
})
