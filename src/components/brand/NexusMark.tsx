/**
 * NEXUS ECHO — mark and wordmark components
 *
 * Draw from `lib/brand/geometry`, the same source as the exported SVG kit, so
 * the app and the files in `public/brand` cannot drift. Colours follow
 * `currentColor`; the nodes take `--nx-accent` unless `monochrome`.
 */
import { BRACKETS, ECHO_OFFSET, N_PATH, NODES, WORDMARK_ECHO_OFFSET, WORDMARK_STROKE, translatePath, wordmark, wordmarkStacked } from '@/lib/brand/geometry'
import { cn } from '@/lib/utils'

export function NexusMark({
  size = 32,
  compact,
  monochrome = false,
  className,
  title,
}: {
  size?: number
  /** Drop the frame and echo. Defaults on below 28 px, where they turn to noise. */
  compact?: boolean
  monochrome?: boolean
  className?: string
  title?: string
}) {
  const small = compact ?? size < 28
  const node = monochrome ? 'currentColor' : 'var(--nx-accent, #6fb3c4)'
  const echo = translatePath(N_PATH, ECHO_OFFSET.x * (small ? 0.8 : 1), ECHO_OFFSET.y * (small ? 0.8 : 1))
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('nx-mark shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeMiterlimit={1.6}
    >
      {!small && BRACKETS.map(d => <path key={d} d={d} strokeWidth={3} />)}
      <path d={echo} strokeOpacity={0.42} strokeWidth={small ? 3 : 2} />
      <path d={N_PATH} strokeWidth={small ? 6 : 4.5} />
      {NODES.map(([cx, cy, s]) => {
        const size2 = small ? s + 2 : s
        return <rect key={`${cx}-${cy}`} x={cx - size2 / 2} y={cy - size2 / 2} width={size2} height={size2} fill={node} stroke="none" />
      })}
    </svg>
  )
}

export function NexusWordmark({
  height = 14,
  stacked = false,
  className,
  title = 'NEXUS ECHO',
}: {
  height?: number
  stacked?: boolean
  className?: string
  title?: string
}) {
  const w = stacked ? wordmarkStacked() : wordmark()
  const pad = 1.2
  const width = w.width + pad * 2 + WORDMARK_ECHO_OFFSET.x
  const h = w.height + pad * 2 + WORDMARK_ECHO_OFFSET.y
  const ghost = translatePath(w.d, WORDMARK_ECHO_OFFSET.x, WORDMARK_ECHO_OFFSET.y)
  return (
    <svg
      viewBox={`0 0 ${width} ${h}`}
      height={height}
      width={(height * width) / h}
      className={cn('shrink-0', className)}
      role="img"
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeMiterlimit={1.6}
    >
      <g transform={`translate(${pad} ${pad})`}>
        <path d={ghost} strokeOpacity={0.35} strokeWidth={WORDMARK_STROKE * 0.7} />
        <path d={w.d} strokeWidth={WORDMARK_STROKE} />
      </g>
    </svg>
  )
}
