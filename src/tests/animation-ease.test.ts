/**
 * NEXUS - Animation ease validation
 *
 * GSAP resolves an ease by looking its name up in the ease registry. A string it
 * does not recognise - including a raw CSS `cubic-bezier(...)`, which is NOT a
 * GSAP ease - is accepted silently and replaced by `power1.out`. That is a
 * defect of the quiet kind: the animation still runs, nothing throws, and the
 * authored curve is simply never applied.
 *
 * Every timeline in `useAnimation` passed `'cubic-bezier(0.16, 0.84, 0.44, 1)'`
 * as its default ease, so none of the case's motion used the curve it named.
 * This test scans the real sources for `ease:` string literals and holds each
 * one to the set of eases GSAP actually registers, so an invented ease cannot
 * come back unnoticed.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import gsap from 'gsap'

const SRC = join(process.cwd(), 'src')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === 'tests' || entry === 'node_modules') continue
      walk(full, out)
    } else if (['.ts', '.tsx'].includes(extname(entry))) {
      out.push(full)
    }
  }
  return out
}

/** Every `ease: 'literal'` in the source, with its file for a useful failure. */
function easeLiterals(): Array<{ file: string; value: string }> {
  const found: Array<{ file: string; value: string }> = []
  for (const file of walk(SRC)) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/\bease:\s*'([^']+)'/g)) {
      found.push({ file: file.slice(SRC.length + 1), value: m[1] })
    }
  }
  return found
}

describe('animation eases are real GSAP eases', () => {
  it('finds the eases the source declares', () => {
    // If this drops to zero the scanner has stopped seeing the source and the
    // assertion below would pass vacuously.
    expect(easeLiterals().length).toBeGreaterThan(0)
  })

  it('every literal ease is one GSAP can actually resolve', () => {
    const eases = easeLiterals()
    const bad = eases.filter(({ value }) => {
      // A registered alias (`power2.out`) round-trips through gsap.parseEase.
      const parsed = gsap.parseEase(value)
      return parsed === undefined || parsed === null
    })
    expect(
      bad.map(b => `${b.file}: ease '${b.value}'`),
      'these eases are not registered with GSAP and would silently fall back',
    ).toEqual([])
  })

  it('no ease is a raw CSS cubic-bezier, which GSAP does not accept', () => {
    const bezier = easeLiterals().filter(({ value }) => value.trim().startsWith('cubic-bezier'))
    expect(
      bezier.map(b => `${b.file}: '${b.value}'`),
      'a CSS cubic-bezier is not a GSAP ease; use a registered ease or CustomEase',
    ).toEqual([])
  })
})
