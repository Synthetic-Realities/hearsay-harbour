/* Dev Studio only: suggest the form fields for one picture with your own AI model. */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const body = await readBody<{ image?: string }>(event)
  if (!body?.image) throw createError({ statusCode: 400, statusMessage: 'Add a picture first.' })
  try {
    return await suggestFields(body.image)
  }
  catch (e) {
    throw createError({ statusCode: 502, statusMessage: e instanceof Error ? e.message : 'The AI request failed.' })
  }
})
