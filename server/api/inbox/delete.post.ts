/* Dev Studio only: move an inbox picture to content-inbox/deleted/ (kept, so it can be restored). */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const { file } = await readBody<{ file?: string }>(event)
  await shelve(safeName(file), 'deleted')
  return { ok: true }
})
