/* Dev Studio only: is AI assist set up? (Never returns the key.) */
export default defineEventHandler(async () => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const { provider, model, problem, auto } = await assistConfigResolved()
  return { ready: !problem, provider, model, problem, auto }
})
