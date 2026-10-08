/* Dev Studio only: take a picture out of the game (a copy is kept in content-inbox/removed/). */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const { packId, pictureId } = await readBody<{ packId?: string, pictureId?: string }>(event)
  if (!packId || !pictureId) throw createError({ statusCode: 400, statusMessage: 'Choose a picture.' })
  return removePicture(packId, pictureId)
})
