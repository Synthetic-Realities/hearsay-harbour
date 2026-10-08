/* Dev Studio only: show a picture in the game, or keep it out of the game (holding phase). */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const { packId, pictureId, visible } = await readBody<{ packId?: string, pictureId?: string, visible?: boolean }>(event)
  if (!packId || !pictureId || typeof visible !== 'boolean') throw createError({ statusCode: 400, statusMessage: 'Choose a picture.' })
  await setVisible(packId, pictureId, visible)
  return { ok: true }
})
