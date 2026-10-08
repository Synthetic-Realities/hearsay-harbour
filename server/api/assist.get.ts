/* Dev Studio only: is AI assist set up? (Never returns the key.) */
export default defineEventHandler(() => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const { provider, model, problem } = assistConfig()
  return { ready: !problem, provider, model, problem }
})
