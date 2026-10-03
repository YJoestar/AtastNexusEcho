/**
 * NEXUS ECHO — SURVEILLANCE CONTROL
 *
 * The camera records recovered into the case: the surveillance entries of the
 * evidence register, plus (in development builds only) the generated NX-037
 * showcase set. Every cell shows fields the record already carries — device,
 * location, capture time, condition, integrity — and nothing is simulated: if
 * there are no camera records, it says so.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminAPI } from '@/lib/admin'
import { showcaseCatalog, showcaseEnabled, SHOWCASE_LABEL } from '@/lib/evidence/showcaseCatalog'
import { contentString, type CaseArtifact } from '@/features/player/evidence/types'
import { cn } from '@/lib/utils'

interface Feed {
  id: string
  code: string
  title: string
  camera: string
  location: string
  capturedAt: string | null
  condition: string
  integrity: string
  image: string | null
  thumb: string | null
  simulation: boolean
  description: string
}

function fromShowcase(artifact: CaseArtifact): Feed {
  return {
    id: artifact.id,
    code: artifact.code,
    title: artifact.title,
    camera: contentString(artifact.content, ['device']) ?? artifact.code,
    location: artifact.location ?? 'LOCATION UNRECORDED',
    capturedAt: contentString(artifact.content, ['captured_at']),
    condition: (artifact.condition ?? 'NORMAL').toString(),
    integrity: contentString(artifact.content, ['integrity']) ?? 'UNVERIFIED',
    image: artifact.imageUrl ?? contentString(artifact.content, ['image_url']),
    thumb: artifact.thumbUrl ?? artifact.imageUrl ?? null,
    simulation: true,
    description: artifact.description,
  }
}

const SIGNAL_STATES = ['OFFLINE', 'CORRUPT', 'DEGRADED', 'PARTIAL', 'INCOMPLETE']

function signalOf(feed: Feed): { label: string; warn: boolean } {
  const text = `${feed.condition} ${feed.integrity}`.toUpperCase()
  const bad = SIGNAL_STATES.find(state => text.includes(state))
  return bad ? { label: bad, warn: true } : { label: feed.integrity.toUpperCase() || 'RECORDED', warn: false }
}

export function SurveillanceApp() {
  const [feeds, setFeeds] = useState<Feed[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setFeeds(null)
    const collected: Feed[] = []
    try {
      const catalog = await adminAPI.listEvidenceLabCatalog()
      for (const item of catalog.evidence) {
        if (!/SURVEILLANCE|CAMERA|CCTV|VIDEO/i.test(item.type)) continue
        const image = contentString(item.content, ['image_url', 'imageUrl', 'video_url', 'videoUrl'])
        collected.push({
          id: `evidence:${item.code}`,
          code: item.code,
          title: item.title,
          camera: contentString(item.content, ['device', 'camera_id']) ?? item.code,
          location: contentString(item.content, ['location', 'location_name']) ?? 'LOCATION UNRECORDED',
          capturedAt: contentString(item.content, ['captured_at', 'timestamp']),
          condition: item.condition ?? 'NORMAL',
          integrity: contentString(item.content, ['integrity']) ?? 'UNVERIFIED',
          image,
          thumb: image,
          simulation: false,
          description: item.description,
        })
      }
    } catch (failure) {
      // The showcase set does not depend on the server, so show it anyway.
      if (!showcaseEnabled()) {
        setError(failure instanceof Error ? failure.message : String(failure))
        return
      }
    }
    if (showcaseEnabled()) {
      const known = new Set(collected.map(feed => feed.code))
      collected.push(...showcaseCatalog().filter(item => /SURVEILLANCE/i.test(item.type) && !known.has(item.code)).map(fromShowcase))
    }
    setFeeds(collected)
  }, [])

  useEffect(() => { void load() }, [load])

  const active = useMemo(() => feeds?.find(feed => feed.id === selected) ?? null, [feeds, selected])

  if (error) {
    return (
      <div className="m-4 space-y-3 border border-nexus-danger/50 bg-nexus-dangerBg/20 p-4 font-mono">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-nexus-danger">ARCHIVE ERROR</p>
        <p className="text-xs text-nexus-textMuted">Unable to retrieve camera records.</p>
        <p className="text-[0.6rem] text-nexus-textSubtle">SOURCE: {error}</p>
        <button type="button" onClick={() => void load()} className="min-h-9 border border-nexus-border px-3 text-[0.6rem] uppercase tracking-[0.12em] hover:text-nexus-accent">[ RETRY ]</button>
      </div>
    )
  }
  if (!feeds) return <p className="p-6 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-nexus-textSubtle">OPENING SURVEILLANCE CHANNEL…</p>
  if (feeds.length === 0) {
    return (
      <div className="p-6 font-mono">
        <p className="text-[0.7rem] uppercase tracking-[0.16em] text-nexus-textMuted">NO CAMERA RECORDS</p>
        <p className="mt-2 max-w-md text-xs text-nexus-textSubtle">No surveillance footage has been recovered into this case yet. Records appear here when the evidence register holds them.</p>
      </div>
    )
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(220px,300px)_1fr]">
      <aside className="min-h-0 overflow-auto border-r border-nexus-border" aria-label="Camera records">
        <p className="border-b border-nexus-borderSubtle px-3 py-2 font-mono text-[0.52rem] uppercase tracking-[0.16em] text-nexus-textSubtle">
          {feeds.length} CAMERA RECORD{feeds.length > 1 ? 'S' : ''}{feeds.some(feed => feed.simulation) ? ` / ${SHOWCASE_LABEL}` : ''}
        </p>
        <ul>
          {feeds.map(feed => {
            const signal = signalOf(feed)
            return (
              <li key={feed.id}>
                <button
                  type="button"
                  onClick={() => setSelected(feed.id)}
                  aria-pressed={selected === feed.id}
                  className={cn('grid w-full grid-cols-[84px_1fr] gap-3 border-b border-nexus-borderSubtle px-3 py-2 text-left font-mono hover:bg-nexus-surface', selected === feed.id && 'bg-nexus-surfaceElevated')}
                >
                  <span className="relative block h-14 overflow-hidden border border-nexus-border bg-black">
                    {feed.thumb && <img src={feed.thumb} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover grayscale" />}
                    <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-[#c24b3f]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[0.62rem] font-bold text-nexus-text">{feed.camera}</span>
                    <span className="block truncate text-[0.55rem] text-nexus-textMuted">{feed.location}</span>
                    <span className={cn('block text-[0.5rem] uppercase tracking-[0.1em]', signal.warn ? 'text-nexus-warning' : 'text-nexus-textSubtle')}>{signal.label}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>
      <section className="min-h-0 overflow-auto" aria-label="Selected feed">
        {active ? <FeedViewer feed={active} /> : (
          <p className="p-6 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-nexus-textSubtle">SELECT A CAMERA RECORD</p>
        )}
      </section>
    </div>
  )
}

function FeedViewer({ feed }: { feed: Feed }) {
  const [zoom, setZoom] = useState(1)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const signal = signalOf(feed)
  const adjusted = brightness !== 100 || contrast !== 100

  return (
    <div className="space-y-3 p-4 font-mono">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-nexus-borderSubtle pb-2">
        <div>
          <p className="text-[0.52rem] uppercase tracking-[0.16em] text-nexus-textSubtle">{feed.code}</p>
          <h3 className="text-sm font-bold text-nexus-text">{feed.title}</h3>
        </div>
        <span className={cn('border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.12em]', signal.warn ? 'border-nexus-warning text-nexus-warning' : 'border-nexus-border text-nexus-textMuted')}>{signal.label}</span>
      </header>

      <div className="relative h-[min(46vh,420px)] overflow-auto border border-nexus-border bg-black" tabIndex={0} aria-label="Feed image. Scroll to pan.">
        {feed.image ? (
          <img
            src={feed.image}
            alt={`${feed.camera}, ${feed.location}`}
            decoding="async"
            draggable={false}
            className="block max-w-none origin-top-left"
            style={{ width: `${zoom * 100}%`, filter: adjusted ? `brightness(${brightness}%) contrast(${contrast}%)` : undefined }}
          />
        ) : (
          <p className="p-6 text-[0.65rem] uppercase tracking-[0.14em] text-nexus-textSubtle">NO FRAME ATTACHED TO THIS RECORD</p>
        )}
      </div>

      {feed.image && (
        <div className="flex flex-wrap items-center gap-3 text-[0.55rem] uppercase text-nexus-textSubtle">
          <span className="flex items-center gap-1">
            <button type="button" aria-label="Zoom out" onClick={() => setZoom(value => Math.max(1, +(value - 0.25).toFixed(2)))} className="min-h-8 min-w-8 border border-nexus-border">−</button>
            <output aria-label="Zoom" className="w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</output>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom(value => Math.min(4, +(value + 0.25).toFixed(2)))} className="min-h-8 min-w-8 border border-nexus-border">+</button>
          </span>
          <label className="flex items-center gap-2">BRIGHTNESS <input type="range" min={40} max={220} value={brightness} onChange={event => setBrightness(Number(event.target.value))} aria-label="Brightness" className="accent-nexus-accent" /></label>
          <label className="flex items-center gap-2">CONTRAST <input type="range" min={40} max={260} value={contrast} onChange={event => setContrast(Number(event.target.value))} aria-label="Contrast" className="accent-nexus-accent" /></label>
          <button type="button" onClick={() => { setZoom(1); setBrightness(100); setContrast(100) }} className="min-h-8 border border-nexus-border px-2">RESET</button>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[0.6rem] md:grid-cols-4">
        {[['CAMERA', feed.camera], ['LOCATION', feed.location], ['CAPTURED', feed.capturedAt ?? 'UNRECORDED'], ['CONDITION', feed.condition], ['INTEGRITY', feed.integrity]].map(([label, value]) => (
          <div key={label}><dt className="text-[0.48rem] uppercase tracking-[0.14em] text-nexus-textSubtle">{label}</dt><dd className="mt-0.5 break-words text-nexus-text">{value}</dd></div>
        ))}
      </dl>
      {feed.description && <p className="max-w-3xl border-l border-nexus-border pl-3 text-xs leading-relaxed text-nexus-textMuted">{feed.description}</p>}
    </div>
  )
}
