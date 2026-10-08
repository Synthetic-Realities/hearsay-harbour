/* Dev Studio only: mark a picture as a draft or as reviewed. */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const { packId, pictureId, status } = await readBody<{ packId?: string, pictureId?: string, status?: string }>(event)
  if (!packId || !pictureId || (status !== 'draft' && status !== 'reviewed')) throw createError({ statusCode: 400, statusMessage: 'Choose a picture and a status.' })
  await setStatus(packId, pictureId, status)
  return { ok: true }
})
