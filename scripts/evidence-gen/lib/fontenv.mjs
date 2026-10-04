// Deterministic handwriting font for the SVG renderer (sharp -> librsvg ->
// fontconfig). The host's installed fonts must not decide what a handwritten
// note looks like, so the OFL-licensed Caveat face is vendored under
// scripts/evidence-gen/fonts/ and registered through a generated fonts.conf.
//
// Import this module for its side effect BEFORE the first SVG is rasterised.
// fontconfig reads FONTCONFIG_FILE once, when it initialises, so the variable
// is set at import time. The host's own configuration is still included so the
// typewriter / sans faces used by the printed parts of each artifact are
// unchanged; only the hand is pinned.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const FONT_DIR = resolve(HERE, '..', 'fonts')

/** CSS family stack for every handwritten element. 'Caveat' is the vendored face. */
export const HAND_FAMILY = "'Caveat','Segoe Print','Bradley Hand',cursive"
/** Glyph advances (font units) for the vendored face; used for real letter spacing. */
export const HAND_METRICS = JSON.parse(readFileSync(join(FONT_DIR, 'caveat-metrics.json'), 'utf8'))

function register() {
  const conf = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>
  <dir>${FONT_DIR}</dir>
</fontconfig>
`
  const tag = createHash('sha256').update(conf).digest('hex').slice(0, 12)
  const dir = join(tmpdir(), `nx-evidence-fontconfig-${tag}`)
  const file = join(dir, 'fonts.conf')
  const full = conf.replace('</fontconfig>', `  <cachedir>${join(dir, 'cache')}</cachedir>\n</fontconfig>`)
  if (!existsSync(file)) {
    mkdirSync(join(dir, 'cache'), { recursive: true })
    writeFileSync(file, full)
  }
  process.env.FONTCONFIG_FILE = file
}

register()
