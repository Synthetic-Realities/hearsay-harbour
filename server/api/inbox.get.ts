import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

/* Dev Studio only: list what's waiting in content-inbox/. */
export default defineEventHandler(async () => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const dir = useRuntimeConfig().inboxDir as string
  const files = await readdir(dir).catch(() => [] as string[])
  const images = files.filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f))
  return Promise.all(images.map(async (file) => {
    const base = file.replace(/\.[^.]+$/, '')
    const notes = await readFile(join(dir, `${base}.json`), 'utf8').then(JSON.parse).catch(() => null)
    return { file, notes }
  }))
})
