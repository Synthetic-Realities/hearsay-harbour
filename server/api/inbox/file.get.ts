import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/* Dev Studio only: show an inbox picture's thumbnail. */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const name = safeName(getQuery(event).name)
  const type = /\.png$/i.test(name) ? 'image/png' : /\.webp$/i.test(name) ? 'image/webp' : /\.gif$/i.test(name) ? 'image/gif' : 'image/jpeg'
  setHeader(event, 'content-type', type)
  return readFile(join(studioPaths().inbox, name)).catch(() => {
    throw createError({ statusCode: 404, statusMessage: 'That picture isn\'t in the inbox.' })
  })
})
