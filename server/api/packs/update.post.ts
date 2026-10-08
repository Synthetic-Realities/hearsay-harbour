/* Dev Studio only: save the Edit screen's changes to a picture. */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const { packId, picture } = await readBody<{ packId?: string, picture?: Record<string, any> }>(event)
  if (!packId || !picture) throw createError({ statusCode: 400, statusMessage: 'Nothing to save.' })
  return updatePicture(packId, picture)
})
