// Check that every local media path the app references actually exists.
//
// Generated media is referenced by string literal from TypeScript, so a
// renamed asset or a hand-typed path fails silently at runtime: the viewer
// renders an empty stage and nothing else complains. This reads those literals
// out of the source tree and resolves them against public/.
import { readFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join, dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'node:fs/promises'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PUBLIC = join(ROOT, 'public')

// Paths under /evidence are generated and owned by this pipeline; /audio is not.
const PATTERN = /['"`](\/evidence\/[A-Za-z0-9._/-]+\.(?:jpg|jpeg|png|webp|svg))['"`]/g

const sources = []
for await (const entry of glob('src/**/*.{ts,tsx}', { cwd: ROOT })) {
  sources.push(entry)
}

const missing = new Map()
const seen = new Set()

for (const relative of sources) {
  // Unit tests assert against synthetic paths on purpose; nothing fetches them.
  if (relative.includes(`${sep}tests${sep}`)) continue
  const text = await readFile(join(ROOT, relative), 'utf8')
  for (const match of text.matchAll(PATTERN)) {
    const path = match[1]
    const key = `${relative} ${path}`
    if (seen.has(key)) continue
    seen.add(key)
    try {
      await access(join(PUBLIC, path.slice(1)), constants.F_OK)
    } catch {
      if (!missing.has(path)) missing.set(path, [])
      missing.get(path).push(relative)
    }
  }
}

console.log(`${sources.length} source files scanned, ${seen.size} evidence path reference(s) checked`)

if (missing.size === 0) {
  console.log('all referenced evidence media exists')
} else {
  console.log(`\n${missing.size} missing asset(s):`)
  for (const [path, files] of missing) {
    console.log(`  x ${path}`)
    for (const file of files) console.log(`      referenced by ${file}`)
  }
  process.exitCode = 1
}