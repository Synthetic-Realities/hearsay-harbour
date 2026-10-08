/* Dev Studio only: turn an inbox picture into a draft entry in a level, using your own AI model. */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const { file } = await readBody<{ file?: string }>(event)
  try {
    return await importPicture(safeName(file))
  }
  catch (e) {
    const err = e as { statusCode?: number, statusMessage?: string, message?: string }
    throw createError({ statusCode: err.statusCode ?? 502, statusMessage: err.statusMessage ?? err.message ?? 'The import failed.' })
  }
})
