#!/usr/bin/env node
/**
 * NEXUS ECHO — UI review capture + system-consistency audit
 *
 *   node scripts/screenshots/ui-review.mjs [--out=docs/ui-review/before] [--base=http://127.0.0.1:5173]
 *
 * Captures representative player + bureau screens with Puppeteer (repo
 * devDependency, local Chrome — no hosted service) at mobile 390x844 (DPR 2,
 * touch) and desktop 1440x900, and prints the reviewing-interface-quality
 * system audit: distinct computed font-size / font-family / border-radius /
 * box-shadow values, horizontal overflow, and console errors per page.
 *
 * Player screens come from /player-harness.html (real components, QA simulator
 * dummy data, no backend). The login screen and the bureau workstation come
 * from the Vite dev server; the workstation uses the dev-only admin bypass
 * (src/lib/devAdminBypass.ts) via localStorage, nothing else.
 *
 * Nothing is installed by this script. Exits non-zero only on capture crash.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`))
  return hit ? hit.split('=').slice(1).join('=') : d
}
const OUT = path.resolve(ROOT, arg('out', 'docs/ui-review/before'))
const BASE = arg('base', '')
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const DESKTOP = { width: 1440, height: 900 }

const freePort = () => new Promise((res, rej) => {
  const s = net.createServer()
  s.on('error', rej)
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) })
})
const waitMs = (ms) => new Promise((r) => setTimeout(r, ms))
const up = (url) => new Promise((res) => {
  fetch(url).then((r) => res(r.ok)).catch(() => res(false))
})

/** Screens: harness player screens + real app login + bureau workstation. */
const screens = (base) => [
  { name: 'player-login', url: `${base}/player/login`, views: ['mobile', 'desktop'] },
  { name: 'player-hub', url: `${base}/player-harness.html?route=&sim=PARTIAL`, views: ['mobile', 'desktop'] },
  { name: 'player-evidence', url: `${base}/player-harness.html?route=/evidence&sim=PARTIAL`, views: ['mobile', 'desktop'] },
  { name: 'player-inventory', url: `${base}/player-harness.html?route=/inventory&sim=PARTIAL`, views: ['mobile'] },
  { name: 'player-navigation', url: `${base}/player-harness.html?route=/navigation&sim=PARTIAL`, views: ['mobile'] },
  { name: 'player-qr', url: `${base}/player-harness.html?route=/qr&sim=PARTIAL`, views: ['mobile'] },
  { name: 'player-leaderboard', url: `${base}/player-harness.html?route=/leaderboard&sim=PARTIAL`, views: ['mobile'] },
  { name: 'player-notifications', url: `${base}/player-harness.html?route=/notifications&sim=PARTIAL`, views: ['mobile'] },
  { name: 'bureau-workstation', url: `${base}/admin/teams`, views: ['desktop'], devAdmin: true },
]

/** Prefer puppeteer's managed Chrome; fall back to a system Chrome/Edge. */
const chromePath = async () => {
  try {
    const managed = await puppeteer.executablePath()
    if (managed && fs.existsSync(managed)) return managed
  } catch { /* partial cache — fall through */ }
  for (const p of [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ]) if (fs.existsSync(p)) return p
  throw new Error('no Chrome/Edge found for puppeteer')
}

const AUDIT = `() => {
  const els = [...document.querySelectorAll('*')]
  const doc = document.documentElement
  const clipped = (e) => {
    for (let p = e.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p)
      if (['auto', 'scroll', 'hidden', 'clip'].includes(s.overflowX)) return true
    }
    return false
  }
  const overflow = els.filter((e) => {
    const r = e.getBoundingClientRect()
    return r.width > 0 && r.right > doc.clientWidth + 1 && !clipped(e)
  }).slice(0, 8).map((e) => e.tagName + '.' + (typeof e.className === 'string' ? e.className : '').slice(0, 60))
  const distinct = (p) => [...new Set(els.map((e) => getComputedStyle(e)[p]))]
    .filter((v) => v && v !== 'none' && v !== '0px' && v !== 'normal').slice(0, 24)
  return {
    overflow,
    hScroll: Math.max(0, doc.scrollWidth - doc.clientWidth),
    fontSize: distinct('font-size').length,
    fontFamily: distinct('font-family').length,
    borderRadius: distinct('border-radius'),
    boxShadow: distinct('box-shadow').length,
  }
}`

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  let base = BASE
  let proc = null
  if (!base) {
    const port = await freePort()
    base = `http://127.0.0.1:${port}`
    proc = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
      cwd: ROOT, shell: true, stdio: 'ignore',
    })
    for (let i = 0; i < 120 && !(await up(base)); i++) await waitMs(500)
    if (!(await up(base))) throw new Error('vite dev server did not come up')
  }

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], executablePath: await chromePath() })
  const report = {}
  try {
    for (const screen of screens(base)) {
      for (const view of screen.views) {
        const page = await browser.newPage()
        const errors = []
        page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
        page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 160)))
        await page.setViewport(view === 'mobile' ? MOBILE : DESKTOP)
        if (screen.devAdmin) {
          await page.evaluateOnNewDocument(() => globalThis.localStorage.setItem('nexus_dev_admin', '1'))
        }
        try {
          await page.goto(screen.url, { waitUntil: 'networkidle2', timeout: 30000 })
        } catch { /* timeout with a live SPA is fine — capture what rendered */ }
        await waitMs(1200)
        const file = path.join(OUT, `${screen.name}-${view}.png`)
        await page.screenshot({ path: file, fullPage: false })
        const audit = await page.evaluate(`(${AUDIT})()`) ?? {}
        const key = `${screen.name}-${view}`
        report[key] = { audit, errors: [...new Set(errors)].slice(0, 6) }
        console.log(`captured ${key}`)
        await page.close()
      }
    }
  } finally {
    await browser.close()
    if (proc) proc.kill()
  }
  fs.writeFileSync(path.join(OUT, 'ui-review-report.json'), JSON.stringify(report, null, 2))
  console.log(`\nreport -> ${path.join(OUT, 'ui-review-report.json')}`)
  for (const [k, v] of Object.entries(report)) {
    const a = v.audit ?? {}
    console.log(`${k}: sizes=${a.fontSize ?? '?'} families=${a.fontFamily ?? '?'} radii=${(a.borderRadius ?? []).length} shadows=${a.boxShadow ?? '?'} hScroll=${a.hScroll ?? '?'} overflow=${(a.overflow ?? []).length} errors=${v.errors.length}`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
