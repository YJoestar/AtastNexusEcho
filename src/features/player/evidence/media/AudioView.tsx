import { useRef, useState } from 'react'
import { contentString } from '../types'
import { seriesContextFor } from './seriesContext'
import type { MediaProps } from './types'

const format = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`

export function AudioSurface({ artifact, audioUrl, contentText, catalog }: MediaProps) {
  const device = contentString(artifact.content, ['device'])
  const source = contentString(artifact.content, ['source'])
  const recorded = contentString(artifact.content, ['captured_at', 'capturedAt', 'timestamp'])
  const duration = contentString(artifact.content, ['duration'])
  const series = seriesContextFor(artifact, catalog)
  const rows: Array<[string, string]> = [
    ['DURATION', duration ?? 'NOT RECORDED'],
    ['SOURCE', source ?? 'UNKNOWN'],
    ['RECORDED', recorded ?? 'TIME NOT RECORDED'],
    ['RECORDER', device ?? 'UNKNOWN'],
  ]
  return (
    <div className="absolute inset-0 flex flex-col justify-center overflow-auto border border-nexus-border bg-nexus-surfaceElevated p-5" onPointerDown={event => event.stopPropagation()}>
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-nexus-textSubtle">
        ARCHIVAL RECORDING / {artifact.code}{series ? ` / ${series.unit ?? `RECORDING ${series.position} OF ${series.total}`}` : ''}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-mono">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[0.64rem] uppercase tracking-[0.12em] text-nexus-textSubtle">{label}</dt>
            <dd className="mt-0.5 break-words text-[0.8rem] text-nexus-text">{value}</dd>
          </div>
        ))}
      </dl>
      {audioUrl ? (
        <AudioScrubber key={artifact.id} src={audioUrl} />
      ) : (
        <p className="mt-4 border-l border-nexus-warning pl-3 font-mono text-xs text-nexus-warning">AUDIO SOURCE / NOT ATTACHED</p>
      )}
      {contentText && <p className="mt-4 max-h-32 overflow-auto whitespace-pre-wrap border-t border-nexus-borderSubtle pt-3 text-xs leading-relaxed text-nexus-textMuted">{contentText}</p>}
    </div>
  )
}

function AudioScrubber({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  return (
    <div className="mt-4 border-t border-nexus-border pt-3">
      <audio
        ref={audioRef}
        src={src}
        controls
        preload="metadata"
        className="w-full"
        onLoadedMetadata={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onTimeUpdate={event => setCurrent(event.currentTarget.currentTime)}
      />
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(current, duration)}
        onChange={event => {
          const value = Number(event.target.value)
          if (audioRef.current) audioRef.current.currentTime = value
          setCurrent(value)
        }}
        aria-label="Recording timeline"
        className="mt-2 h-11 w-full accent-nexus-accent"
        disabled={!duration}
      />
      <div className="flex justify-between font-mono text-[0.62rem] tabular-nums text-nexus-textSubtle">
        <span>{format(current)}</span><span>{duration ? format(duration) : 'DURATION UNKNOWN'}</span>
      </div>
    </div>
  )
}
