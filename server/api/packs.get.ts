/* Dev Studio only: every level and its pictures, read fresh from disk. */
export default defineEventHandler(async () => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  return (await readPacks()).map(p => ({
    id: p.data.id,
    level: p.data.level,
    title: p.data.title,
    pictures: p.data.pictures.map(x => ({ id: x.id, title: x.title ?? x.id, src: x.src, truth: x.truth, status: x.status ?? 'reviewed' })),
  })).sort((a, b) => a.level - b.level)
})
