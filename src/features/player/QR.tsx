/**
 * NEXUS — Player QR Scanner
 *
 * Camera-based QR scanning with narrative failure states. A decoded payload is
 * handed to the Bureau unchanged; the server resolves it against `qr_nodes`
 * (code, marker_id or manual_code) and decides whether the marker is real, and
 * whether this team is allowed to use it. The scanner deliberately keeps no
 * registry of its own — a second source of truth for what a marker means is how
 * a client and a server end up disagreeing about every marker on the wall.
 *
 * Camera ownership: the stream, the decode timer and the in-flight lookup all
 * have exactly one owner, released by `releaseCamera`. `startScan` is re-entrant
 * in practice (see below), and single-slot refs lose whichever resource they
 * overwrite.
 */

import { useState, useRef, useEffect, useCallback, useContext } from 'react'
import { Link } from 'react-router-dom'
import { BureauIcons, Stamp } from '@/components/bureau'
import { useGameEngine, type QRScanResult } from '@/hooks/useGameEngine'
import { useConnection } from '@/hooks/useConnection'
import { QASimulatorContext } from '@/contexts/QASimulatorContext'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'

type JsQrFn = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: 'dontInvert' | 'attemptBoth' },
) => { data: string } | null

let jsQrPromise: Promise<JsQrFn> | null = null
async function loadJsQr(): Promise<JsQrFn> {
  if (!jsQrPromise) {
    jsQrPromise = import('jsqr').then(m => (m.default ?? m) as JsQrFn)
  }
  return jsQrPromise
}

const SCAN_INTERVAL_MS = 250

/**
 * How long one accepted marker stays suppressed after its lookup settled. This
 * is a comfort window against a camera that keeps re-reading the same code, NOT
 * the mechanism that prevents duplicate lookups — `inflightRef` is.
 */
const SCAN_DEDUPE_MS = 3000

type CameraState =
  | 'IDLE'
  | 'REQUESTING_CAMERA'
  | 'CAMERA_READY'
  | 'SCANNING'
  | 'UNSUPPORTED'
  | 'OFFLINE'
  | 'PERMISSION_DENIED'
  | 'NO_CAMERA'
  | 'INSECURE_CONTEXT'
  | 'STREAM_FAILED'
  | 'DETECTION_UNAVAILABLE'

const CAMERA_STATE_LABELS: Record<CameraState, { title: string; description: string; icon: ReactNode }> = {
  IDLE: {
    title: 'OPTICAL READER / STANDBY',
    description: 'Arm the reader, then hold a Bureau field marker inside the acquisition frame.',
    icon: <BureauIcons.QrCode className="bureau-icon w-12 h-12 text-nexus-accent" />,
  },
  REQUESTING_CAMERA: {
    title: 'REQUESTING OPTICAL INPUT',
    description: 'Waiting for device camera authorization…',
    icon: <BureauIcons.Camera className="bureau-icon w-12 h-12 text-nexus-textSubtle animate-pulse" />,
  },
  CAMERA_READY: {
    title: 'OPTICAL INPUT READY',
    description: 'Align the field marker with the acquisition frame.',
    icon: <BureauIcons.Camera className="bureau-icon w-12 h-12 text-nexus-accent" />,
  },
  SCANNING: {
    title: 'ACQUIRING FIELD MARKER',
    description: 'Hold marker steady inside the frame.',
    icon: <BureauIcons.ScanLine className="bureau-icon w-12 h-12 text-nexus-accent animate-pulse" />,
  },
  UNSUPPORTED: {
    title: 'OPTICAL INPUT UNAVAILABLE',
    description: 'This device does not expose the camera interface required for optical acquisition.',
    icon: <BureauIcons.AlertTriangle className="bureau-icon w-16 h-16 text-nexus-danger mx-auto" />,
  },
  OFFLINE: {
    // Deliberately not INSECURE_CONTEXT. `isOffline` is true while the link is
    // still being established on a cold page load, and telling a player on
    // campus Wi-Fi that their camera needs TLS sends them to a problem they do
    // not have while the real one — a link that has not come up yet — resolves
    // itself in under a second.
    title: 'BUREAU LINK UNAVAILABLE',
    description: 'A scan has to be checked with the Bureau, so the reader stays dark until you are back on the network.',
    icon: <BureauIcons.WifiOff className="bureau-icon w-16 h-16 text-nexus-warning mx-auto" />,
  },
  PERMISSION_DENIED: {
    title: 'OPTICAL ACCESS REFUSED',
    description: 'Camera permission was denied. Enable device access or use the manual service port.',
    icon: <BureauIcons.ShieldQuestion className="bureau-icon w-16 h-16 text-nexus-warning mx-auto" />,
  },
  NO_CAMERA: {
    title: 'NO OPTICAL SENSOR FOUND',
    description: 'No camera was detected. Use the manual service port to enter a field code.',
    icon: <BureauIcons.Video className="bureau-icon w-16 h-16 text-nexus-danger mx-auto" />,
  },
  INSECURE_CONTEXT: {
    title: 'SECURE CHANNEL REQUIRED',
    description: 'Optical input requires a secure connection. Manual acquisition remains available.',
    icon: <BureauIcons.Shield className="bureau-icon w-16 h-16 text-nexus-danger mx-auto" />,
  },
  STREAM_FAILED: {
    title: 'OPTICAL CHANNEL FAILED',
    description: 'The camera stream did not initialize. Retry acquisition or use manual entry.',
    icon: <BureauIcons.WifiOff className="bureau-icon w-16 h-16 text-nexus-danger mx-auto" />,
  },
  DETECTION_UNAVAILABLE: {
    title: 'MARKER DECODER UNAVAILABLE',
    description: 'The optical decoder did not initialize. Retry or use manual entry.',
    icon: <BureauIcons.AlertTriangle className="bureau-icon w-16 h-16 text-nexus-warning mx-auto" />,
  },
}

import type { ReactNode } from 'react'

export function PlayerQR() {
  const { scanQR } = useGameEngine()
  const connection = useConnection()
  const isOffline = connection.isOffline
  const qaContext = useContext(QASimulatorContext)
  const isQASimulation = !!qaContext?.isActive

  const [cameraState, setCameraState] = useState<CameraState>('IDLE')
  const [lastResult, setLastResult] = useState<QRScanResult | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualCode, setManualCode] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scanIntervalRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastScannedRef = useRef<{ code: string; at: number } | null>(null)
  const jsQrRef = useRef<JsQrFn | null>(null)
  /** True from the moment arming begins until the camera is released. */
  const armingRef = useRef(false)
  /** True while a marker lookup is in flight. The real duplicate-lookup guard. */
  const inflightRef = useRef(false)
  const isMountedRef = useRef(true)

  /**
   * The single owner of the camera, the decode timer and the decoder.
   *
   * `startScan` is re-entrant in practice: REACQUIRE SIGNAL is painted while the
   * permission prompt is still up, so a second getUserMedia can be issued before
   * the first has resolved. With single-slot refs the newer stream and timer
   * simply overwrite the older ones, and teardown only ever sees the last value.
   * The first stream's video track then keeps running with nothing left holding
   * a reference to stop it: the phone's camera indicator stays lit, the sensor
   * stays held, and the next attempt to arm the reader commonly fails with
   * NotReadableError. On a wall of markers at a live event that is a dead
   * scanner nobody can recover without reloading the page.
   *
   * Every path that gives the camera up goes through here, including unmount.
   */
  const releaseCamera = useCallback(() => {
    if (scanIntervalRef.current !== null) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    jsQrRef.current = null
    armingRef.current = false
  }, [])

  const submitCode = useCallback(
    async (code: string) => {
      // One lookup at a time. The camera keeps decoding frames every 250ms while
      // the Bureau answers, so without this the same marker is re-submitted as
      // soon as the previous round trip ends — and on the fallback path a scan
      // is three sequential PostgREST calls, which on campus Wi-Fi routinely
      // outlasts the dedupe window.
      if (inflightRef.current) return
      inflightRef.current = true
      try {
        if (isOffline) {
          if (isMountedRef.current) {
            setLastResult({
              discovered: false,
              error: 'offline',
              message: 'Cannot scan while offline.',
            })
          }
          return
        }
        setIsResolving(true)
        try {
          const result = await scanQR(code)
          if (isMountedRef.current) setLastResult(result)
        } catch (err) {
          if (isMountedRef.current) {
            setLastResult({
              discovered: false,
              message: err instanceof Error ? err.message : 'Scan failed. Try again.',
              error: 'scan_failed',
            })
          }
        }
        // Stamped after the round trip settles, not at detection. Stamping at
        // detection re-armed the marker while its own request was still open,
        // which is precisely when a duplicate would do the most damage.
        lastScannedRef.current = { code, at: Date.now() }
      } finally {
        inflightRef.current = false
        if (isMountedRef.current) setIsResolving(false)
      }
    },
    [isOffline, scanQR],
  )

  const decodeFrame = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) return

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) return

    const maxSide = 640
    const scale = Math.min(1, maxSide / Math.max(width, height))
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      setCameraState('DETECTION_UNAVAILABLE')
      return
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // jsQR is synchronous, so a decode cannot overlap itself. What must not
    // overlap is the LOOKUP that follows it, which is why the guard lives in
    // submitCode rather than around this call.
    if (!jsQrRef.current) return
    let result: { data: string } | null = null
    try {
      result = jsQrRef.current(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      })
    } catch {
      result = null
    }
    if (!result?.data) return

    const code = result.data.trim()
    if (!code) return

    const last = lastScannedRef.current
    if (last && last.code === code && Date.now() - last.at < SCAN_DEDUPE_MS) return

    await submitCode(code)
  }, [submitCode])

  const startScan = useCallback(async () => {
    if (isOffline) {
      setCameraState('OFFLINE')
      return
    }

    // An armed camera is handed back before a new one is taken, and a second arm
    // while the first is still pending is refused outright. Without this the two
    // races below both end with one of the two cameras unstoppable.
    if (armingRef.current) return
    if (streamRef.current || scanIntervalRef.current !== null) {
      releaseCamera()
    }
    armingRef.current = true

    setCameraState('REQUESTING_CAMERA')
    setLastResult(null)
    lastScannedRef.current = null

    if (isQASimulation) {
      armingRef.current = false
      setCameraState('CAMERA_READY')
      return
    }

    if (typeof window === 'undefined' || !window.isSecureContext) {
      armingRef.current = false
      setCameraState('INSECURE_CONTEXT')
      return
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      armingRef.current = false
      setCameraState('UNSUPPORTED')
      return
    }

    try {
      const loadPromise = loadJsQr()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })

      // The player may have closed the scanner, or unmounted, while the prompt
      // was up. A stream that arrives with nothing waiting for it is released
      // here rather than parked in a ref nobody will read.
      if (!isMountedRef.current || !armingRef.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      const tracks = stream.getVideoTracks()
      if (tracks.length === 0) {
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
        armingRef.current = false
        setCameraState('NO_CAMERA')
        return
      }

      streamRef.current = stream

      try {
        jsQrRef.current = await loadPromise
      } catch {
        releaseCamera()
        setCameraState('DETECTION_UNAVAILABLE')
        return
      }

      setCameraState('CAMERA_READY')

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }

      setCameraState('SCANNING')
      armingRef.current = false

      scanIntervalRef.current = window.setInterval(() => {
        void decodeFrame()
      }, SCAN_INTERVAL_MS)
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : ''

      armingRef.current = false
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null

      if (
        name === 'NotAllowedError' ||
        name === 'PermissionDeniedError' ||
        (err instanceof DOMException && err.name === 'NotAllowedError')
      ) {
        setCameraState('PERMISSION_DENIED')
      } else if (
        name === 'NotFoundError' ||
        (err instanceof DOMException && err.name === 'NotFoundError')
      ) {
        setCameraState('NO_CAMERA')
      } else {
        setCameraState('STREAM_FAILED')
      }
    }
  }, [isOffline, isQASimulation, decodeFrame, releaseCamera])

  const stopScan = useCallback(() => {
    setCameraState('IDLE')
    setLastResult(null)
    setShowManualEntry(false)
    setManualCode('')
    releaseCamera()
  }, [releaseCamera])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      releaseCamera()
    }
  }, [releaseCamera])

  const isScanning = cameraState === 'SCANNING'

  const renderCameraError = () => {
    const stateInfo = CAMERA_STATE_LABELS[cameraState]
    if (cameraState === 'IDLE' || cameraState === 'CAMERA_READY') return null

    // REQUESTING_CAMERA is deliberately absent: arming is now single-flight, so
    // a retry offered while the permission prompt is up would be a button that
    // does nothing. It is a progress state, not a failure.
    const isRetryable = [
      'INSECURE_CONTEXT',
      'STREAM_FAILED',
      'DETECTION_UNAVAILABLE',
      'OFFLINE',
    ].includes(cameraState)

    return (
      <div role="status" className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
        {stateInfo.icon}
        <h3 className="heading-4 mb-2">{stateInfo.title}</h3>
        <p className="text-nexus-textMuted mb-6 max-w-xs">{stateInfo.description}</p>
        {isRetryable && (
          <button
            type="button"
            onClick={startScan}
            className="btn-primary touch-target-comfortable"
          >
            <BureauIcons.Camera className="bureau-icon w-4 h-4" />
            <span>REACQUIRE SIGNAL</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-content max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            to={ROUTES.PLAYER_GAME}
            className="p-2 border border-nexus-borderSubtle text-nexus-textMuted hover:text-nexus-text touch-target-primary"
            aria-label="RETURN TO FIELD"
          >
            <BureauIcons.Back className="bureau-icon w-5 h-5" />
          </Link>
          <div>
            <h1 className="heading-3">FIELD SCANNER</h1>
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textMuted">
              FH-037 / Optical acquisition module
            </p>
          </div>
        </div>

        {/* Scanner View */}
        <div className="relative aspect-square min-h-[320px] overflow-hidden border border-nexus-border bg-nexus-bg" data-device="field-scanner">
          <div className="pointer-events-none absolute inset-3 border border-nexus-borderSubtle/60" aria-hidden="true" />
          {cameraState === 'IDLE' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="relative mb-5 flex h-28 w-28 items-center justify-center border border-nexus-accent/60" aria-hidden="true">
                <span className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-nexus-accent" />
                <span className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-nexus-accent" />
                <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-nexus-accent" />
                <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-nexus-accent" />
                <BureauIcons.QrCode className="bureau-icon h-10 w-10 text-nexus-accent" />
              </div>
              <p className="mb-2 font-mono text-[0.56rem] uppercase tracking-[0.18em] text-nexus-accent">
                {CAMERA_STATE_LABELS[cameraState].title}
              </p>
              <p className="mb-6 max-w-xs text-sm text-nexus-textMuted">
                {CAMERA_STATE_LABELS[cameraState].description}
              </p>
              <button
                type="button"
                onClick={startScan}
                className="nexus-btn-primary min-h-11 w-full max-w-xs font-mono text-xs uppercase tracking-[0.12em]"
                disabled={isOffline}
              >
                <BureauIcons.ScanLine className="bureau-icon h-4 w-4" />
                <span>[ ARM OPTICAL READER ]</span>
              </button>
              {isQASimulation && (
                <p className="mt-4 text-xs text-nexus-textSubtle">
                  Simulation mode: camera is bypassed. Use manual entry below or
                  the QA simulator controls to trigger scans.
                </p>
              )}
              {isOffline && (
                <p className="mt-3 text-sm text-nexus-danger flex items-center justify-center gap-1.5">
                  <BureauIcons.AlertTriangle className="bureau-icon w-4 h-4" />
                  OPTICAL ACQUISITION UNAVAILABLE / OFFLINE
                </p>
              )}
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className={cn(
                  'absolute inset-0 w-full h-full object-cover',
                  isScanning ? 'visible' : 'invisible',
                )}
                playsInline
                muted
                aria-label="Camera viewfinder"
              />
              <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

              {(cameraState === 'REQUESTING_CAMERA' || cameraState === 'CAMERA_READY') && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="text-center text-white/70">
                    <BureauIcons.Camera className="bureau-icon w-12 h-12 mx-auto mb-2 animate-pulse" />
                    <p className="text-sm">
                      {CAMERA_STATE_LABELS[cameraState].description}
                    </p>
                  </div>
                </div>
              )}

              {cameraState === 'SCANNING' && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative h-64 w-64">
                      <div className="absolute inset-0 border-2 border-nexus-accent/50">
                        <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-nexus-accent" />
                        <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-nexus-accent" />
                        <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-nexus-accent" />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-nexus-accent" />
                      </div>
                      <div className="absolute left-4 right-4 top-1/2 h-px bg-nexus-accent animate-scanner-pulse" />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-nexus-accent/80">
                        {isResolving ? 'VERIFY' : 'ACQUIRE'}
                      </span>
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="border border-nexus-border bg-nexus-bg/95 px-4 py-3 text-center">
                      <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-nexus-textMuted" aria-live="polite">
                        {isResolving ? 'VERIFYING MARKER WITH BUREAU' : 'READING OPTICAL FIELD'}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {renderCameraError()}

              {cameraState !== 'SCANNING' && (
                <button
                  type="button"
                  onClick={stopScan}
                  className="absolute top-4 right-4 p-2 bg-nexus-dangerBg border border-nexus-danger/30 text-nexus-danger hover:bg-nexus-danger/20 transition-colors touch-target-primary"
                  aria-label="Exit viewfinder"
                >
                  <BureauIcons.Close className="bureau-icon w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Last Scan Result */}
        {lastResult && (
          <div
            className={cn(
              'border p-4 animate-slide-up',
              lastResult.discovered
                ? 'bg-nexus-accentBg/20 border-nexus-accent/50'
                : 'bg-nexus-dangerBg/20 border-nexus-danger/50',
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-nexus-textSubtle">FIELD MARKER ACQUIRED</p>
                  <Stamp variant={lastResult.discovered ? 'verified' : 'restricted'} impressed>
                    {isResolving ? 'VERIFYING' : lastResult.alreadyClaimed ? 'ALREADY FILED' : lastResult.discovered ? 'IDENTIFIED' : 'UNRESOLVED'}
                  </Stamp>
                </div>

                {lastResult.markerId && (
                  <p className="font-display text-lg font-bold text-nexus-text mb-1">
                    {lastResult.markerId}
                  </p>
                )}

                {lastResult.qrCode && (
                  <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-nexus-textSubtle mb-2">
                    QR: {lastResult.qrCode}
                  </p>
                )}

                {lastResult.manualCode && (
                  <>
                    <p className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
                      MANUAL REFERENCE
                    </p>
                    <p className="font-mono text-base font-bold tracking-[0.08em] text-nexus-text mt-0.5 mb-2 break-all">
                      {lastResult.manualCode}
                    </p>
                  </>
                )}
                {lastResult.qrLabel && !lastResult.manualCode && (
                  <p className="text-sm text-nexus-textMuted font-mono break-all">
                    {lastResult.qrLabel}
                  </p>
                )}
                {lastResult.nodeTitle && (
                  <p className="text-sm text-nexus-textMuted">{lastResult.nodeTitle}</p>
                )}
                <p className="mt-1 text-sm text-nexus-textMuted">
                  {lastResult.message
                    ? lastResult.message
                    : lastResult.alreadyClaimed
                      ? 'ALREADY RECORDED. Your team has used this marker. Nothing further is unlocked here.'
                      : lastResult.discovered
                        ? 'Proceed to the location to continue.'
                        : 'The marker is registered but this lead is still sealed. Return to the case and work the current lead.'}
                </p>
              </div>
            </div>

            {lastResult.discovered && lastResult.nodeCode && (
              <Link
                to={ROUTES.PLAYER_GAME}
                className="btn-primary w-full mt-4 touch-target-comfortable"
              >
                <span>[ RETURN TO ACTIVE NODE ]</span>
              </Link>
            )}
            {lastResult.discovered && !lastResult.nodeCode && (
              <Link
                to={ROUTES.PLAYER_NAVIGATION}
                className="btn-primary w-full mt-4 touch-target-comfortable"
              >
                <BureauIcons.Forward className="bureau-icon w-4 h-4 rotate-180" />
                <span>[ OPEN FIELD CARTOGRAPHY ]</span>
              </Link>
            )}
          </div>
        )}

        {/* Manual entry fallback */}
        <div className="border border-nexus-border bg-nexus-surfaceElevated">
          <button
            type="button"
            onClick={() => setShowManualEntry(v => !v)}
            className="w-full flex items-center justify-between gap-3 text-left touch-target-comfortable"
            aria-expanded={showManualEntry}
          >
            <span className="flex items-center gap-3">
              <BureauIcons.Keyboard className="bureau-icon w-5 h-5 text-nexus-textMuted" />
              <span>
                <span className="block font-mono text-xs font-bold uppercase tracking-[0.12em]">SERVICE PORT / MANUAL ENTRY</span>
                <span className="block text-xs text-nexus-textMuted">
                  Use when optical acquisition is unavailable.
                </span>
              </span>
            </span>
            <span className="text-nexus-textMuted text-sm">
              {showManualEntry ? '[ CLOSE ]' : '[ OPEN ]'}
            </span>
          </button>

           {showManualEntry && (
             <form
               className="mt-4 flex gap-2"
               onSubmit={async (e) => {
                 e.preventDefault()
                 const code = manualCode.trim()
                 if (!code) return
                 void submitCode(code)
                 setManualCode('')
               }}
             >
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                 placeholder="037-A-4821"
                aria-label="Marker code"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="input flex-1 min-w-0 font-mono"
              />
              <button
                type="submit"
                disabled={!manualCode.trim() || isResolving || isOffline}
                className="btn-primary touch-target-comfortable flex-shrink-0"
              >
                Verify Code
              </button>
            </form>
          )}
        </div>

        {/* Scan Help */}
        <div className="panel bg-nexus-infoBg/20 border-nexus-info/30">
          <div className="flex items-start gap-3">
            <BureauIcons.AlertTriangle className="bureau-icon w-5 h-5 text-nexus-info flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h4 className="mb-1 font-mono text-xs font-bold uppercase tracking-[0.14em] text-nexus-info">FIELD MARKER PROCEDURE</h4>
              <p className="text-xs leading-relaxed text-nexus-textMuted">
                Markers are fixed at campus locations. Manual codes use the same verification channel. In simulation, use <code className="font-mono">QR-NODE-02</code> or the manual code format <code className="font-mono">037-A-4821</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
