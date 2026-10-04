import type { CaseArtifact } from '../types'
import { captureTimeOf, deriveSeries, seriesPosition } from '@/lib/evidence/series'
import { describeGap } from '@/lib/evidence/clues'
import { SHOWCASE_CASE } from '@/lib/evidence/showcaseCatalog'

export interface SeriesContext {
  source: string
  position: number
  total: number
  unit: string | null
  previous: CaseArtifact | null
  next: CaseArtifact | null
  /** Where each member sits on the bar, 0..1, in series order. */
  ticks: Array<{ code: string; at: number; current: boolean }>
  /** True when ticks are proportional to capture time rather than evenly spaced. */
  byTime: boolean
  /** Capture stamp of the first and last frames, when both are readable. */
  span: { first: string; last: string } | null
}

/** Real records of the same medium and source, from the supplied catalogue. */
export function seriesContextFor(artifact: CaseArtifact, catalog: readonly CaseArtifact[]): SeriesContext | null {
  const all = deriveSeries(catalog)
  const place = seriesPosition(all, artifact.code)
  if (!place) return null
  const byCode = new Map(catalog.map(item => [item.code, item]))
  const members = place.series.members
  const index = place.position - 1
  const times = members.map(code => {
    const item = byCode.get(code)
    const time = item ? captureTimeOf(item) : null
    return time && (time.precision === 'SECOND' || time.precision === 'MINUTE') ? time.ms : null
  })
  const readable = times.every((ms): ms is number => ms !== null)
  const first = readable ? Math.min(...(times as number[])) : 0
  const last = readable ? Math.max(...(times as number[])) : 0
  const proportional = readable && last > first
  const ticks = members.map((code, i) => ({
    code,
    current: i === index,
    at: proportional ? ((times[i] as number) - first) / (last - first) : members.length > 1 ? i / (members.length - 1) : 0,
  }))
  const stamp = (code: string) => {
    const item = byCode.get(code)
    return item ? (item.content.captured_at as string | undefined) ?? null : null
  }
  const firstStamp = stamp(members[0])
  const lastStamp = stamp(members[members.length - 1])
  return {
    source: place.series.source,
    position: place.position,
    total: place.total,
    unit: place.unit,
    previous: index > 0 ? byCode.get(members[index - 1]) ?? null : null,
    next: index < members.length - 1 ? byCode.get(members[index + 1]) ?? null : null,
    ticks,
    byTime: proportional,
    span: readable && firstStamp && lastStamp ? { first: firstStamp, last: lastStamp } : null,
  }
}

function clockSeconds(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(text)
  if (!match) return null
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

/**
 * Clock offset between a frame and the case key time. Only when the frame's
 * stamp reads to the minute or second; otherwise there is nothing honest to say.
 */
export function keyTimeOffset(artifact: CaseArtifact): { label: string; keyTime: string } | null {
  const time = captureTimeOf(artifact)
  const key = clockSeconds(SHOWCASE_CASE.keyTime)
  if (!time || key === null || (time.precision !== 'SECOND' && time.precision !== 'MINUTE')) return null
  const frame = Math.floor((time.ms % 86_400_000) / 1000)
  const gap = (frame - key) * 1000
  const label = gap === 0 ? 'SAME INSTANT AS KEY TIME' : `${describeGap(gap)} ${gap < 0 ? 'BEFORE' : 'AFTER'} KEY TIME`
  return { label, keyTime: SHOWCASE_CASE.keyTime }
}
