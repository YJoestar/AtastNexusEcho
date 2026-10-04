import { contentString } from '../types'
import { keyTimeOffset } from './seriesContext'
import { NoImage } from './shared'
import type { MediaProps } from './types'

export function SurveillanceSurface({ artifact, imageUrl, thumbUrl, videoUrl, imageStyle, contentText, video }: MediaProps) {
  if (videoUrl) {
    return (
      <video
        ref={video.ref}
        key={artifact.id}
        src={videoUrl}
        poster={imageUrl ?? undefined}
        playsInline
        preload="metadata"
        aria-label={`${artifact.title} video`}
        className="absolute inset-0 h-full w-full bg-black object-contain"
        {...video.handlers}
      />
    )
  }
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={artifact.title}
        draggable={false}
        decoding="async"
        className="absolute inset-0 h-full w-full bg-black bg-contain bg-center bg-no-repeat object-contain"
        style={{
          ...(thumbUrl && thumbUrl !== imageUrl ? { backgroundImage: `url(${thumbUrl})` } : null),
          ...imageStyle,
        }}
      />
    )
  }
  return <NoImage label="FRAME / NOT ATTACHED" text={contentText || artifact.description || 'No frame is attached to this record.'} />
}

/** Glass over the monitor: bezel, scan lines and the on-screen readout. Never interactive. */
export function SurveillanceOverlay({ artifact, series }: MediaProps) {
  const stamp = contentString(artifact.content, ['captured_at', 'capturedAt', 'timestamp'])
  const device = contentString(artifact.content, ['device'])
  const rawSource = contentString(artifact.content, ['source'])
  // The source line often repeats the device ("DVR NODE B-04"); show only what the device line lacks.
  const source = rawSource
    ? rawSource.split(' / ').filter(part => !(device ?? '').toUpperCase().includes(part.toUpperCase())).join(' / ') || null
    : null
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{ background: 'repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) 2px, rgba(0,0,0,0.18) 3px)' }}
      />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)' }} />
      <div className="absolute inset-0 rounded-[14px] shadow-[inset_0_0_0_10px_#1a1c1e,inset_0_0_0_11px_#3a3d40]" />
      <div className="absolute left-4 top-4 font-mono text-[0.8rem] uppercase leading-tight tracking-[0.1em] text-[#d9e2d4] [text-shadow:0_0_4px_rgba(0,0,0,0.9)]">
        <p className="tabular-nums">{stamp ?? 'NO TIMESTAMP'}</p>
        {series && <p className="text-[0.66rem] tracking-[0.14em]">FRAME {series.position}/{series.total}</p>}
      </div>
      <div className="absolute right-4 top-4 max-w-[45%] text-right font-mono text-[0.66rem] uppercase leading-tight tracking-[0.12em] text-[#d9e2d4] [text-shadow:0_0_4px_rgba(0,0,0,0.9)]">
        <p className="truncate">{device ?? 'CAMERA UNKNOWN'}</p>
        {source && <p className="truncate">{source}</p>}
      </div>
    </div>
  )
}

const formatClock = (seconds: number) =>
  `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`

export function SurveillanceStrip(props: MediaProps) {
  const { artifact, series, videoUrl, video, onOpenRelated } = props
  const offset = keyTimeOffset(artifact)
  const stepper = 'flex min-h-11 flex-1 items-center justify-center border border-nexus-border px-3 font-mono text-[0.7rem] uppercase tracking-[0.08em] disabled:opacity-40'
  return (
    <section aria-label="Monitor controls" className="space-y-2 border border-nexus-border bg-nexus-surfaceSubtle p-3">
      {series ? (
        <>
          <div className="flex items-center gap-2" role="group" aria-label="Frame stepper">
            <button type="button" className={stepper} disabled={!series.previous || !onOpenRelated} onClick={() => series.previous && onOpenRelated?.(series.previous.id)} aria-label={series.previous ? `Previous frame, ${series.previous.code}` : 'Previous frame, none'}>
              ◀ PREV
            </button>
            <p className="min-w-[7.5rem] text-center font-mono text-[0.68rem] uppercase tracking-[0.1em] text-nexus-text" aria-live="polite">
              FRAME {series.position} OF {series.total}{series.unit ? ` / ${series.unit}` : ''}
            </p>
            <button type="button" className={stepper} disabled={!series.next || !onOpenRelated} onClick={() => series.next && onOpenRelated?.(series.next.id)} aria-label={series.next ? `Next frame, ${series.next.code}` : 'Next frame, none'}>
              NEXT ▶
            </button>
          </div>
          <div>
            <div>
            <div
              role="img"
              aria-label={`Frame ${series.position} of ${series.total} from ${series.source}${series.byTime ? ', placed by capture time' : ''}`}
              className="relative h-6"
            >
              <span className="absolute inset-x-0 top-1/2 h-px bg-nexus-border" />
              {series.ticks.map(tick => (
                <span
                  key={tick.code}
                  className={tick.current ? 'absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 bg-nexus-warning' : 'absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-nexus-textSubtle'}
                  style={{ left: `calc(3px + (100% - 6px) * ${tick.at})` }}
                />
              ))}
            </div>
            </div>
            <div className="mt-1 flex justify-between font-mono text-[0.6rem] uppercase tabular-nums text-nexus-textSubtle">
              <span>{series.span?.first ?? series.source}</span>
              <span>{series.span?.last ?? ''}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-nexus-textMuted">NO OTHER FRAME FROM THIS SOURCE IN THE ARCHIVE</p>
      )}
      {offset && (
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-nexus-text">
          {offset.label} <span className="text-nexus-textSubtle">({offset.keyTime})</span>
        </p>
      )}
      {videoUrl ? (
        <div className="flex items-center gap-3">
          <button type="button" onClick={video.toggle} aria-pressed={video.playing} className="min-h-11 min-w-24 border border-nexus-accent px-3 font-mono text-[0.7rem] uppercase text-nexus-accent">
            {video.playing ? 'PAUSE' : 'PLAY'}
          </button>
          <span className="font-mono text-[0.68rem] tabular-nums text-nexus-textSubtle">
            {formatClock(video.time)} / {video.duration ? formatClock(video.duration) : 'LENGTH UNKNOWN'}
          </span>
        </div>
      ) : (
        <p role="status" className="border-l border-nexus-warning pl-3 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-nexus-warning">
          STILL FRAME - NO VIDEO ATTACHED
        </p>
      )}
    </section>
  )
}
