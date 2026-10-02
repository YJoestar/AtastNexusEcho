/**
 * NEXUS ECHO — Bureau: Signal
 *
 * Measured channels: signal integrity, recording state, and a waveform drawn
 * from a recording rather than animated noise.
 *
 * The waveform is deterministic for a given seed. A player's transcript of a
 * recording and their teammate's are the same waveform, which is what makes it
 * evidence instead of decoration.
 */

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { unitFloat } from '@/lib/narrative'

export type SignalTone = 'unknown' | 'normal' | 'degraded' | 'critical'

const FILL_CLASS: Record<SignalTone, string> = {
  unknown: 'signal-fill-unknown',
  normal: 'signal-fill',
  degraded: 'signal-fill-warning',
  critical: 'signal-fill-critical',
}

const TONE_LABEL: Record<SignalTone, string> = {
  unknown: 'Indeterminate',
  normal: 'Signal stable',
  degraded: 'Signal degraded',
  critical: 'Signal failing',
}

/** Integrity in tenths, the way a bureau form would report it. */
function toTenths(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 10)
}

/**
 * Integrity below a quarter is failing; below three fifths is degraded.
 * Not exported: it is a presentation detail of this bar, not a bureau rule, and
 * exporting a helper alongside components breaks fast refresh.
 */
function toneForIntegrity(value: number, known: boolean): SignalTone {
  if (!known) return 'unknown'
  if (value < 0.25) return 'critical'
  if (value < 0.6) return 'degraded'
  return 'normal'
}

/**
 * Signal integrity as a measured bar with tenths.
 *
 * `known` is separate from `value` because "we could not measure it" and "we
 * measured zero" are different findings, and a bureau that cannot tell them
 * apart is not doing its job.
 */
export function SignalIntegrity({
  value,
  known = true,
  label = 'Signal integrity',
  className,
}: {
  value: number
  known?: boolean
  label?: string
  className?: string
}) {
  const tone = toneForIntegrity(value, known)
  const tenths = known ? toTenths(value) : null

  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="section-label">{label}</span>
        <span className="font-mono text-[0.875rem] tabular-nums text-nexus-textMuted">
          {tenths === null ? '— / 10' : `${tenths} / 10`}
        </span>
      </div>
      <div className="signal-track" role="img" aria-label={`${label}: ${TONE_LABEL[tone]}`}>
        <div className={cn(FILL_CLASS[tone], tone !== 'unknown' && 'transition-[width] duration-settle')} style={{ width: known ? `${tenths}%` : '100%' }} />
        <div className="signal-ticks" />
      </div>
      <p className="meta mt-1">{TONE_LABEL[tone]}</p>
    </div>
  )
}

/** A lamp that is on. Recording is announced, never implied. */
export function RecordingLamp({
  active,
  startedAt,
  className,
}: {
  active: boolean
  /** ISO timestamp the current recording began. */
  startedAt?: string | null
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {active && <span className="rec-lamp" aria-hidden="true" />}
      <span className="section-label">
        {active ? 'Recording' : 'Not recording'}
        {active && startedAt ? ` since ${startedAt}` : ''}
      </span>
    </div>
  )
}

/**
 * A waveform for one recording.
 *
 * `breakAt` removes the trace at a single position rather than fading it: the
 * discontinuity is structural, so nothing is drawn there at all.
 */
export function Waveform({
  seed,
  bars = 56,
  tone = 'normal',
  breakAt,
  height = 48,
  label = 'Recording waveform',
  className,
}: {
  seed: string
  bars?: number
  tone?: 'normal' | 'degraded'
  breakAt?: number
  height?: number
  label?: string
  className?: string
}) {
  const amplitudes = useMemo(
    () =>
      Array.from({ length: bars }, (_, index) => {
        // A slow envelope with a fast carrier, so the trace reads as a voice
        // rather than as static.
        const envelope = 0.35 + 0.65 * Math.abs(Math.sin((index / bars) * Math.PI * 3.1))
        const carrier = unitFloat('waveform', seed, index)
        return Math.max(0.08, envelope * (0.35 + carrier * 0.65))
      }),
    [seed, bars]
  )

  const step = 100 / bars
  const strokeClass = tone === 'degraded' ? 'waveform-trace-degraded' : 'waveform-trace'

  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className={cn('w-full', className)}
      style={{ height }}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <line
          key={`grid-${index}`}
          className="waveform-tick"
          x1={0}
          x2={100}
          y1={index * 10}
          y2={index * 10}
          opacity={0.4}
        />
      ))}
      {amplitudes.map((amplitude, index) => {
        if (breakAt !== undefined && index === breakAt) return null
        const x = index * step + step / 2
        const half = amplitude * 17
        return (
          <line
            key={index}
            className={strokeClass}
            x1={x}
            x2={x}
            y1={20 - half}
            y2={20 + half}
          />
        )
      })}
    </svg>
  )
}

/**
 * An unreadable region of a recording: not noise, an absence. Nothing is
 * rendered, because nothing survived.
 */
export function IllegibleRegion({ label = 'Segment unreadable', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('surveillance-illegible h-12 w-full border-y border-nexus-borderSubtle', className)}>
      <span className="sr-only">{label}</span>
    </div>
  )
}