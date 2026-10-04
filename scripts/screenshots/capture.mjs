#!/usr/bin/env node
/**
 * NEXUS ECHO — evidence archive screenshot capture
 *
 *   node scripts/screenshots/capture.mjs [--only=photograph,audio] [--viewports=desktop,mobile]
 *                                        [--port=5199] [--base=http://127.0.0.1:3000] [--out=docs/evidence-screenshots]
 *
 * Starts `npm run dev` (vite) on a free port, opens /admin/evidence-showcase
 * as the dev-only admin (see src/lib/devAdminBypass.ts: DEV build + a local
 * flag set below, nothing else), and for each of the 8 media captures every
 * step in STEPS at desktop 1440x900 and mobile 390x844 (DPR 2, touch).
 * Then tiles the captured PNGs into a contact sheet. No image is generated or
 * edited: every tile is a screenshot taken here.
 *
 * A capture FAILS (non-zero exit, listed in capture-report.json) on: console
 * errors / uncaught page errors, broken images (naturalWidth 0), horizontal
 * overflow, or a loading state still pending. Network requests that leave the
 * dev server are aborted (there is no backend); the browser's generic
 * "Failed to load resource" console line for those is counted separately as
 * `offlineBackend` and does not fail a capture.
 *
 * Dependencies: playwright-core (repo node_modules, else $PLAYWRIGHT_CORE_DIR,
 * else /opt/node-tools) and a Chromium under /opt/pw-browsers (or $PW_CHROMIUM).
 * Nothing is installed by this script. sharp (a repo dependency) builds the sheet.
 */
/* global document, window, getComputedStyle */
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const require = createRequire(path.join(ROOT, 'package.json'))

/* ───────────────────────────── configuration ───────────────────────────── */

/** The eight real media, in showcase order. NN in file names is this position. */
export const MEDIA = ['PHOTOGRAPH', 'SURVEILLANCE', 'DOCUMENT', 'FRAGMENT', 'NOTE', 'PERSONNEL', 'AUDIO', 'MAP']

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
}

const SHOWCASE_PATH = '/admin/evidence-showcase'
const READY_TIMEOUT_MS = 20000

/**
 * Named capture steps. Each is `{ id, appliesTo?(medium), run(ctx) }`; `run` must
 * leave the page in the state to photograph. File name:
 *   <viewport>-<NN medium>-<medium>-<id>.png   e.g. desktop-02-surveillance-inspection.png
 * ctx: { page, medium, code, base, goto(urlPath), waitStable() }
 */
export const STEPS = [
  {
    id: 'library',
    async run({ page, medium, goto }) {
      await goto(`${SHOWCASE_PATH}?type=${medium}`)
      await page.waitForSelector(`[data-testid="group-${medium}"] [data-testid="showcase-record"]`, { timeout: READY_TIMEOUT_MS })
      // The deep link scrolls the medium to the top of its window; wait for it to settle.
      await page.waitForFunction(type => {
        const el = document.querySelector(`[data-testid="group-${type}"]`)
        return !!el && el.getBoundingClientRect().top < 140
      }, medium, { timeout: 5000 }).catch(() => undefined)
    },
  },
  {
    id: 'inspection',
    async run({ page, medium, code, goto }) {
      await goto(`${SHOWCASE_PATH}?type=${medium}&code=${encodeURIComponent(code)}`)
      await page.waitForSelector('[data-testid="showcase-overlay"]', { timeout: READY_TIMEOUT_MS })
    },
  },
  // Interaction states go here once the inspection internals settle, e.g.
  // {
  //   id: 'stepped-frame',
  //   appliesTo: medium => medium === 'SURVEILLANCE',
  //   async run(ctx) {
  //     await STEPS.find(step => step.id === 'inspection').run(ctx)
  //     await ctx.page.getByRole('button', { name: /next frame/i }).click()
  //   },
  // },
]

/** Text that means "still loading" if it is on screen at capture time. */
const PENDING_TEXT = /\b(INDEXING|LOADING|MOUNTING WORKSTATION|CHECKING PERMISSIONS|RETRIEVING|PLEASE WAIT)\b/i

/* ───────────────────────────── helpers ───────────────────────────── */

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=')
  return [key, rest.length ? rest.join('=') : 'true']
}))
const OUT = path.resolve(ROOT, args.out ?? 'docs/evidence-screenshots')
const onlyMedia = args.only ? args.only.toUpperCase().split(',') : MEDIA
const onlyViewports = args.viewports ? args.viewports.split(',') : Object.keys(VIEWPORTS)
const log = (...parts) => console.log('[capture]', ...parts)

function loadPlaywright() {
  const candidates = [path.join(ROOT, 'node_modules'), process.env.PLAYWRIGHT_CORE_DIR, '/opt/node-tools/node_modules'].filter(Boolean)
  for (const dir of candidates) {
    try {
      return createRequire(path.join(dir, 'noop.js'))('playwright-core')
    } catch { /* try the next */ }
  }
  throw new Error(`playwright-core not found (looked in ${candidates.join(', ')}). Set PLAYWRIGHT_CORE_DIR to a node_modules that has it.`)
}

function findChromium() {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM
  const base = '/opt/pw-browsers'
  const dirs = fs.existsSync(base) ? fs.readdirSync(base) : []
  const full = dirs.filter(d => /^chromium-\d+$/.test(d)).sort().reverse().map(d => path.join(base, d, 'chrome-linux', 'chrome'))
  const shell = dirs.filter(d => /^chromium_headless_shell-\d+$/.test(d)).sort().reverse().map(d => path.join(base, d, 'chrome-linux', 'headless_shell'))
  const found = [...full, ...shell].find(file => fs.existsSync(file))
  if (!found) throw new Error(`No Chromium under ${base}. Set PW_CHROMIUM. (This script never installs browsers.)`)
  return found
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

async function startDevServer() {
  if (args.base) return { base: args.base.replace(/\/$/, ''), stop: async () => {} }
  const port = Number(args.port) || await freePort()
  const base = `http://127.0.0.1:${port}`
  log(`starting dev server on ${base}`)
  const child = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
    cwd: ROOT, detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, BROWSER: 'none' },
  })
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  let exited = false
  child.on('exit', () => { exited = true })
  const stop = async () => {
    if (exited) return
    try { process.kill(-child.pid, 'SIGTERM') } catch { /* already gone */ }
    await new Promise(resolve => setTimeout(resolve, 500))
    try { process.kill(-child.pid, 'SIGKILL') } catch { /* already gone */ }
    log('dev server stopped')
  }
  const deadline = Date.now() + 90000
  while (Date.now() < deadline) {
    if (exited) throw new Error(`dev server exited early:\n${output}`)
    try {
      const response = await fetch(`${base}/`)
      if (response.ok) return { base, stop }
    } catch { /* not up yet */ }
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  await stop()
  throw new Error(`dev server did not start in time:\n${output}`)
}

/* ───────────────────────────── page checks ───────────────────────────── */

async function settle(page) {
  // Images, then fonts, then a short beat for the window and CRT layers to stop moving.
  await page.waitForFunction(() => Array.from(document.images).every(img => img.complete), undefined, { timeout: READY_TIMEOUT_MS }).catch(() => undefined)
  await page.evaluate(() => document.fonts?.ready).catch(() => undefined)
  await page.waitForFunction(pattern => {
    const text = document.body.innerText
    return !new RegExp(pattern, 'i').test(text) && !document.querySelector('[aria-busy="true"]')
  }, PENDING_TEXT.source, { timeout: 8000 }).catch(() => undefined)
  await page.waitForTimeout(600)
}

async function audit(page) {
  return page.evaluate(pattern => {
    const problems = []
    const brokenImages = Array.from(document.images)
      .filter(img => !img.complete || img.naturalWidth === 0)
      .map(img => img.currentSrc || img.src)
    if (brokenImages.length) problems.push(`broken or unloaded images: ${brokenImages.join(', ')}`)

    const slack = 1
    const scrollers = [document.documentElement, document.body]
    const overlay = document.querySelector('[data-testid="showcase-overlay"]')
    if (overlay) scrollers.push(overlay, ...overlay.querySelectorAll('div'))
    const root = document.querySelector('[data-testid="showcase"]')
    for (let el = root?.parentElement; el; el = el.parentElement) scrollers.push(el)
    const overflowing = scrollers.filter(el => el.scrollWidth > el.clientWidth + slack && getComputedStyle(el).overflowX === 'visible' || (el === document.documentElement && el.scrollWidth > window.innerWidth + slack))
    if (overflowing.length) {
      problems.push(`horizontal overflow: ${overflowing.slice(0, 3).map(el => `${el.tagName.toLowerCase()}[${el.getAttribute('data-testid') ?? el.className.toString().slice(0, 40)}] ${el.scrollWidth}>${el.clientWidth}`).join('; ')}`)
    }

    const pendingText = document.body.innerText.match(new RegExp(pattern, 'i'))
    if (pendingText) problems.push(`loading text still on screen: "${pendingText[0]}"`)
    if (document.querySelector('[aria-busy="true"]')) problems.push('aria-busy element still present')
    return problems
  }, PENDING_TEXT.source)
}

/* ───────────────────────────── main ───────────────────────────── */

async function main() {
  const playwright = loadPlaywright()
  const executablePath = findChromium()
  fs.mkdirSync(OUT, { recursive: true })
  const server = await startDevServer()
  const browser = await playwright.chromium.launch({ executablePath, args: ['--no-sandbox'] })
  const origin = new URL(server.base).origin
  const report = { startedAt: new Date().toISOString(), base: server.base, chromium: executablePath, shots: [] }

  async function newContext(viewportName) {
    const context = await browser.newContext({ ...VIEWPORTS[viewportName], reducedMotion: 'no-preference' })
    // Dev-only admin identity + skip the boot sequence (see devAdminBypass.ts / bootState.ts).
    await context.addInitScript(() => {
      try { window.localStorage.setItem('nexus_dev_admin', '1') } catch { /* optional */ }
      try { window.sessionStorage.setItem('nexus_booted', '1') } catch { /* optional */ }
    })
    // There is no backend: anything that leaves the dev server is refused.
    await context.route(url => new URL(url).origin !== origin, route => route.abort())
    return context
  }

  async function open(viewportName, body) {
    const context = await newContext(viewportName)
    const page = await context.newPage()
    const issues = { console: [], offlineBackend: 0 }
    page.on('console', message => {
      if (message.type() !== 'error') return
      const where = message.location()?.url ?? ''
      if (/Failed to load resource/i.test(message.text()) && where && !where.startsWith(origin)) { issues.offlineBackend += 1; return }
      issues.console.push(message.text())
    })
    page.on('pageerror', error => issues.console.push(`uncaught: ${error.message}`))
    try {
      return await body(page, issues)
    } finally {
      await context.close()
    }
  }

  const gotoFor = page => async urlPath => {
    await page.goto(`${server.base}${urlPath}`, { waitUntil: 'domcontentloaded' })
  }

  try {
    // Which record each medium shows first: read from the library itself.
    const codes = {}
    await open('desktop', async page => {
      await gotoFor(page)(SHOWCASE_PATH)
      await page.waitForSelector('[data-testid="group-PHOTOGRAPH"] [data-testid="showcase-record"]', { timeout: READY_TIMEOUT_MS })
      for (const medium of MEDIA) {
        codes[medium] = await page.locator(`[data-testid="group-${medium}"] [data-testid="showcase-record"]`).first().getAttribute('data-code')
      }
    })
    log('first record per medium:', JSON.stringify(codes))
    const missing = MEDIA.filter(medium => !codes[medium])
    if (missing.length) throw new Error(`no records found for: ${missing.join(', ')}`)

    for (const viewportName of onlyViewports) {
      for (const medium of onlyMedia) {
        const index = MEDIA.indexOf(medium)
        if (index < 0) throw new Error(`unknown medium ${medium}`)
        for (const step of STEPS) {
          if (step.appliesTo && !step.appliesTo(medium)) continue
          const file = `${viewportName}-${String(index + 1).padStart(2, '0')}-${medium.toLowerCase()}-${step.id}.png`
          const shot = { file, viewport: viewportName, medium, step: step.id, code: codes[medium], problems: [] }
          await open(viewportName, async (page, issues) => {
            try {
              await step.run({ page, medium, code: codes[medium], base: server.base, goto: gotoFor(page), waitStable: () => settle(page) })
              await settle(page)
              shot.problems.push(...await audit(page))
              await page.screenshot({ path: path.join(OUT, file) })
            } catch (error) {
              shot.problems.push(`step failed: ${error instanceof Error ? error.message : String(error)}`)
            }
            shot.problems.push(...issues.console.map(text => `console error: ${text}`))
            shot.offlineBackendErrors = issues.offlineBackend
          })
          report.shots.push(shot)
          log(`${shot.problems.length ? 'FAIL' : 'ok  '} ${file}${shot.problems.length ? `\n        ${shot.problems.join('\n        ')}` : ''}`)
        }
      }
    }
  } finally {
    await browser.close()
    await server.stop()
  }

  report.finishedAt = new Date().toISOString()
  const files = sortShots(fs.readdirSync(OUT).filter(name => /^(desktop|mobile)-\d\d-.+\.png$/.test(name)))
  if (files.length) {
    const sheet = await buildContactSheet(files)
    report.contactSheet = sheet
  }
  report.totalBytes = fs.readdirSync(OUT).filter(name => name.endsWith('.png')).reduce((sum, name) => sum + fs.statSync(path.join(OUT, name)).size, 0)
  fs.writeFileSync(path.join(OUT, 'capture-report.json'), `${JSON.stringify(report, null, 2)}\n`)

  const failed = report.shots.filter(shot => shot.problems.length)
  log(`${report.shots.length - failed.length}/${report.shots.length} captures clean; ${(report.totalBytes / 1048576).toFixed(1)} MB of PNG in ${path.relative(ROOT, OUT)}`)
  if (failed.length) process.exitCode = 1
}

/* ───────────────────────────── contact sheet ───────────────────────────── */

/** Medium order first, then the step order in STEPS (library before inspection). */
function sortShots(files) {
  const key = file => file.match(/^(desktop|mobile)-\d\d/)?.[0] ?? file
  const stepRank = file => {
    const rank = STEPS.findIndex(step => file.endsWith(`-${step.id}.png`))
    return rank < 0 ? STEPS.length : rank
  }
  return [...files].sort((a, b) => key(a).localeCompare(key(b)) || stepRank(a) - stepRank(b) || a.localeCompare(b))
}


async function buildContactSheet(files) {
  const sharp = require('sharp')
  const SHEET = 'evidence-showcase-contact-sheet.png'
  const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const groups = [
    { title: 'DESKTOP 1440 x 900', files: files.filter(f => f.startsWith('desktop-')), tile: { w: 340, h: 213 }, cols: 4 },
    { title: 'MOBILE 390 x 844 @2x', files: files.filter(f => f.startsWith('mobile-')), tile: { w: 118, h: 255 }, cols: 8 },
  ].filter(group => group.files.length)

  const pad = 16, gap = 12, caption = 26, heading = 34
  const width = Math.max(...groups.map(g => pad * 2 + g.cols * g.tile.w + (g.cols - 1) * gap))
  const composites = []
  let y = pad
  for (const group of groups) {
    composites.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${heading}"><text x="${pad}" y="22" font-family="monospace" font-size="16" font-weight="bold" fill="#d8d6d0">${escape(`NEXUS ECHO EVIDENCE ARCHIVE / ${group.title} / SIMULATION DATA`)}</text></svg>`), left: 0, top: y })
    y += heading
    const rows = Math.ceil(group.files.length / group.cols)
    for (let i = 0; i < group.files.length; i += 1) {
      const col = i % group.cols
      const row = Math.floor(i / group.cols)
      const left = pad + col * (group.tile.w + gap)
      const top = y + row * (group.tile.h + caption + gap)
      const tile = await sharp(path.join(OUT, group.files[i])).resize(group.tile.w, group.tile.h, { fit: 'contain', background: '#0a0a0b' }).png().toBuffer()
      composites.push({ input: tile, left, top })
      const [number, ...stepParts] = group.files[i].replace(/^(desktop|mobile)-/, '').replace(/\.png$/, '').split('-').slice(0)
      const label = `${number} ${stepParts[0] ?? ''}`
      const step = stepParts.slice(1).join('-')
      const size = group.tile.w < 200 ? 9 : 11
      composites.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${group.tile.w}" height="${caption}"><text x="0" y="10" font-family="monospace" font-size="${size}" fill="#d8d6d0">${escape(label)}</text><text x="0" y="21" font-family="monospace" font-size="${size}" fill="#918f89">${escape(step)}</text></svg>`), left, top: top + group.tile.h + 2 })
    }
    y += rows * (group.tile.h + caption + gap) + 10
  }
  const height = y + pad
  await sharp({ create: { width, height, channels: 4, background: '#050506' } }).composite(composites).png().toFile(path.join(OUT, SHEET))
  log(`contact sheet: ${SHEET} (${width}x${height}, ${files.length} captures)`)
  return { file: SHEET, width, height, tiles: files }
}

if (args['sheet-only']) {
  // Rebuild only the contact sheet from the PNGs already in the output directory.
  const files = fs.readdirSync(OUT).filter(name => /^(desktop|mobile)-\d\d-.+\.png$/.test(name))
  buildContactSheet(sortShots(files)).catch(error => { console.error(error); process.exit(2) })
} else main().catch(error => {
  console.error('[capture] fatal:', error)
  process.exit(2)
})
