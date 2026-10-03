/**
 * NEXUS ECHO — Boot sequence
 *
 * Short, skippable, and truthful: every status line is read from state the
 * workstation actually has. It plays once per browser session; after the first
 * ever boot it runs in a fraction of the time. Any key or click skips it, and
 * under reduced motion it does not type.
 */
import { useEffect, useMemo, useState } from 'react'
import { SHOWCASE_CASE } from '@/lib/evidence/showcaseCatalog'
import { prefersReducedMotion } from '@/lib/vfx/glitch'
import { BOOTED_KEY, SEEN_KEY } from './bootState'

export interface BootFacts {
  operator: string
  role: string
  online: boolean
  /** null while the first read is still in flight. */
  units: number | null
  windows: number
}

interface Line {
  text: string
  tone?: 'ok' | 'warn' | 'dim'
}


function seenEver(): boolean {
  try { return window.localStorage.getItem(SEEN_KEY) === '1' } catch { return false }
}

export function BootSequence({ facts, onDone }: { facts: BootFacts; onDone: () => void }) {
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const step = reduced ? 0 : seenEver() ? 70 : 190
  const [shown, setShown] = useState(0)

  const lines: Line[] = [
    { text: `NEXUS ECHO // CONTINUITY RECORDS SYSTEM  ${SHOWCASE_CASE.build}` },
    { text: SHOWCASE_CASE.institution, tone: 'dim' },
    { text: `OPERATOR   ${facts.operator}` },
    { text: `ACCESS LEVEL   ${facts.role}`, tone: 'ok' },
    { text: `LINK   ${facts.online ? 'AVAILABLE' : 'OFFLINE'}`, tone: facts.online ? 'ok' : 'warn' },
    facts.units === null
      ? { text: 'FIELD UNITS   READING…', tone: 'dim' }
      : { text: `FIELD UNITS   ${facts.units} INDEXED`, tone: 'ok' },
    { text: facts.windows > 0 ? `DESKTOP   ${facts.windows} WINDOW${facts.windows > 1 ? 'S' : ''} RESTORED` : 'DESKTOP   NEW LAYOUT', tone: 'dim' },
  ]

  const finish = () => {
    try {
      window.sessionStorage.setItem(BOOTED_KEY, '1')
      window.localStorage.setItem(SEEN_KEY, '1')
    } catch { /* storage is optional */ }
    onDone()
  }

  useEffect(() => {
    if (shown < lines.length) {
      const timer = setTimeout(() => setShown(count => count + 1), step)
      return () => clearTimeout(timer)
    }
    // Hold on the last line only until the unit count has actually arrived.
    if (facts.units === null) {
      const wait = setTimeout(finish, 1500)
      return () => clearTimeout(wait)
    }
    const timer = setTimeout(finish, reduced ? 250 : 380)
    return () => clearTimeout(timer)
    // `finish` is stable for the life of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, facts.units])

  useEffect(() => {
    const skip = () => finish()
    window.addEventListener('keydown', skip)
    return () => window.removeEventListener('keydown', skip)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      role="status"
      aria-label="System starting. Press any key to skip."
      onClick={finish}
      className="fixed inset-0 z-[9500] flex cursor-pointer flex-col justify-end bg-black p-8 font-mono text-[0.78rem] tracking-[0.08em] text-nexus-text md:p-14"
    >
      <div className="max-w-2xl space-y-1">
        {lines.slice(0, shown).map((line, index) => (
          <p key={index} className={line.tone === 'ok' ? 'text-nexus-accent' : line.tone === 'warn' ? 'text-nexus-warning' : line.tone === 'dim' ? 'text-nexus-textMuted' : undefined}>
            {line.text}
          </p>
        ))}
        <p className="h-4 w-2 animate-pulse bg-nexus-accent/70" aria-hidden="true" />
      </div>
      <p className="mt-10 text-[0.6rem] uppercase tracking-[0.2em] text-nexus-textSubtle">PRESS ANY KEY TO CONTINUE</p>
    </div>
  )
}
