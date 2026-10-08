/* Dev Studio only: what's waiting in content-inbox/. */
export default defineEventHandler(() => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  return listInbox()
})
