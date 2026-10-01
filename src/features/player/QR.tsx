/**
 * NEXUS — Player QR Scanner
 *
 * Camera-based QR scanning with narrative failure states and a unified
 * validation pipeline. All codes (QR payloads, manual codes, test codes)
 * resolve through the same canonical ScanLocation registry, ensuring
 * client and QA simulator always agree.
 */

import { useState, useRef, useEffect, useCallback, useContext } from 'react'
import { Link } from 'react-router-dom'
import { BureauIcons } from '@/components/bureau'
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

type CameraState =
  | 'IDLE'
  | 'REQUESTING_CAMERA'
  | 'CAMERA_READY'
  | 'SCANNING'
  | 'UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'NO_CAMERA'
  | 'INSECURE_CONTEXT'
  | 'STREAM_FAILED'
  | 'DETECTION_UNAVAILABLE'

const CAMERA_STATE_LABELS: Record<CameraState, { title: string; description: string; icon: ReactNode }> = {
  IDLE: {
    title: 'Ready to Scan',
    description: 'Point your camera at a NEXUS QR marker to unlock puzzles, evidence, or navigation points.',
    icon: <BureauIcons.QrCode className="bureau-icon w-12 h-12 text-nexus-accent" />,
  },
  REQUESTING_CAMERA: {
    title: 'Requesting Camera',
    description: 'Waiting for camera access…',
    icon: <BureauIcons.Camera className="bureau-icon w-12 h-12 text-nexus-textSubtle animate-pulse" />,
  },
  CAMERA_READY: {
    title: 'Camera Ready',
    description: 'Position a QR marker within the frame.',
    icon: <BureauIcons.Camera className="bureau-icon w-12 h-12 text-nexus-accent" />,
  },
  SCANNING: {
    title: 'Scanning…',
    description: 'Position QR code within frame',
    icon: <BureauIcons.ScanLine className="bureau-icon w-12 h-12 text-nexus-accent animate-pulse" />,
  },
  UNSUPPORTED: {
    title: 'Camera Not Supported',
    description: 'Your browser does not support the APIs required for camera-based scanning.',
    icon: <BureauIcons.AlertTriangle className="bureau-icon w-16 h-16 text-nexus-danger mx-auto" />,
  },
  PERMISSION_DENIED: {
    title: 'Camera Access Denied',
    description: 'Please enable camera permissions in your browser settings to scan QR codes.',
    icon: <BureauIcons.ShieldQuestion className="bureau-icon w-16 h-16 text-nexus-warning mx-auto" />,
  },
  NO_CAMERA: {
    title: 'No Camera Found',
    description: 'No camera device was detected. Try connecting a webcam or use manual entry.',
    icon: <BureauIcons.Video className="bureau-icon w-16 h-16 text-nexus-danger mx-auto" />,
  },
  INSECURE_CONTEXT: {
    title: 'Insecure Context',
    description: 'Camera access requires an HTTPS connection. Manual entry is available below.',
    icon: <BureauIcons.Shield className="bureau-icon w-16 h-16 text-nexus-danger mx-auto" />,
  },
  STREAM_FAILED: {
    title: 'Camera Stream Failed',
    description: 'The camera stream could not be started. Try again or use manual entry.',
    icon: <BureauIcons.WifiOff className="bureau-icon w-16 h-16 text-nexus-danger mx-auto" />,
  },
  DETECTION_UNAVAILABLE: {
    title: 'Decoder Unavailable',
    description: 'The QR decoder failed to load. Try again or use manual entry.',
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
  const decodingRef = useRef(false)

  const submitCode = useCallback(
    async (code: string) => {
      if (isOffline) {
        setLastResult({
          discovered: false,
          error: 'offline',
          message: 'Cannot scan while offline.',
        })
        return
      }
      setIsResolving(true)
      try {
        const result = await scanQR(code)
        setLastResult(result)
      } catch (err) {
        setLastResult({
          discovered: false,
          message: err instanceof Error ? err.message : 'Scan failed. Try again.',
          error: 'scan_failed',
        })
      } finally {
        setIsResolving(false)
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

    if (!jsQrRef.current || decodingRef.current) return
    decodingRef.current = true
    let result: { data: string } | null = null
    try {
      result = jsQrRef.current(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      })
    } catch {
      result = null
    } finally {
      decodingRef.current = false
    }
    if (!result?.data) return

    const code = result.data.trim()
    if (!code) return

    const now = Date.now()
    const last = lastScannedRef.current
    if (last && last.code === code && now - last.at < 3000) return
    lastScannedRef.current = { code, at: now }

    void submitCode(code)
  }, [submitCode])

  const startScan = useCallback(async () => {
    if (isOffline) {
      setCameraState('INSECURE_CONTEXT')
      return
    }

    setCameraState('REQUESTING_CAMERA')
    setLastResult(null)
    lastScannedRef.current = null

    if (isQASimulation) {
      setCameraState('CAMERA_READY')
      return
    }

    if (typeof window === 'undefined' || !window.isSecureContext) {
      setCameraState('INSECURE_CONTEXT')
      return
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraState('UNSUPPORTED')
      return
    }

    try {
      const loadPromise = loadJsQr()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })

      const tracks = stream.getVideoTracks()
      if (tracks.length === 0) {
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
        setCameraState('NO_CAMERA')
        return
      }

      streamRef.current = stream

      try {
        jsQrRef.current = await loadPromise
      } catch {
        jsQrRef.current = null
        setCameraState('DETECTION_UNAVAILABLE')
        streamRef.current?.getTracks().forEach(track => track.stop())
        streamRef.current = null
        return
      }

      setCameraState('CAMERA_READY')

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }

      if (!streamRef.current) {
        setCameraState('STREAM_FAILED')
        return
      }

      setCameraState('SCANNING')

      scanIntervalRef.current = window.setInterval(() => {
        void decodeFrame()
      }, SCAN_INTERVAL_MS)
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : ''

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
  }, [isOffline, isQASimulation, decodeFrame])

  const stopScan = useCallback(() => {
    setCameraState('IDLE')
    setLastResult(null)
    setShowManualEntry(false)
    setManualCode('')

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    jsQrRef.current = null
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  const isScanning = cameraState === 'SCANNING'

  const renderCameraError = () => {
    const stateInfo = CAMERA_STATE_LABELS[cameraState]
    if (cameraState === 'IDLE' || cameraState === 'CAMERA_READY') return null

    const isRetryable = [
      'REQUESTING_CAMERA',
      'INSECURE_CONTEXT',
      'STREAM_FAILED',
      'DETECTION_UNAVAILABLE',
    ].includes(cameraState)

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
        {stateInfo.icon}
        <h3 className="heading-4 mb-2">{stateInfo.title}</h3>
        <p className="text-nexus-textMuted mb-6 max-w-xs">{stateInfo.description}</p>
        {isRetryable && (
          <button
            onClick={startScan}
            className="btn-primary touch-target-comfortable"
          >
            <BureauIcons.Camera className="bureau-icon w-4 h-4" />
            <span>Retry Camera</span>
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
            aria-label="Back to game"
          >
            <BureauIcons.Back className="bureau-icon w-5 h-5" />
          </Link>
          <div>
            <h1 className="heading-3">QR Scanner</h1>
            <p className="text-nexus-textMuted text-sm">
              Scan markers to unlock puzzles and locations
            </p>
          </div>
        </div>

        {/* Scanner View */}
        <div className="nexus-document-sm relative aspect-square min-h-[320px] overflow-hidden">
          {cameraState === 'IDLE' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-24 h-24 rounded-2xl bg-nexus-accentBg flex items-center justify-center mb-6">
                <BureauIcons.QrCode className="bureau-icon w-12 h-12 text-nexus-accent" />
              </div>
              <h3 className="heading-4 mb-2">Ready to Scan</h3>
              <p className="text-nexus-textMuted mb-6 max-w-xs">
                Point your camera at a NEXUS QR marker to unlock puzzles,
                evidence, or navigation points.
              </p>
              <button
                onClick={startScan}
                className="btn-primary touch-target-comfortable w-full max-w-xs"
                disabled={isOffline}
              >
                <BureauIcons.ScanLine className="bureau-icon w-5 h-5" />
                <span>Start Scanning</span>
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
                  Camera unavailable while offline
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
                    <div className="relative w-64 h-64">
                      <div className="absolute inset-0 border-2 border-nexus-accent/50">
                        <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-nexus-accent" />
                        <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-nexus-accent" />
                        <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-nexus-accent" />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-nexus-accent" />
                      </div>
                      <div className="absolute left-4 right-4 h-1 bg-nexus-accent" />
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-nexus-bg/90 rounded border border-nexus-border px-4 py-3 text-center">
                      <p className="text-sm text-nexus-textMuted">
                        {isResolving ? 'Verifying marker…' : 'Scanning…'}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {renderCameraError()}

              {cameraState !== 'SCANNING' && (
                <button
                  onClick={stopScan}
                  className="absolute top-4 right-4 p-2 bg-nexus-dangerBg border border-nexus-danger/30 text-nexus-danger hover:bg-nexus-danger/20 transition-colors touch-target-primary"
                  aria-label="Cancel scan"
                >
                  <BureauIcons.Close className="bureau-icon w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Camera Controls (below scanner) */}
        {cameraState === 'IDLE' && (
          <div className="flex gap-2">
            <button
              onClick={startScan}
              className="btn-primary flex-1 touch-target-comfortable"
              disabled={isOffline}
            >
              <BureauIcons.ScanLine className="bureau-icon w-5 h-5" />
              <span>Start Scanning</span>
            </button>
          </div>
        )}

        {/* Last Scan Result */}
        {lastResult && (
          <div
            className={cn(
              'panel animate-slide-up',
              lastResult.discovered
                ? 'bg-nexus-accentBg/30 border-nexus-accent/30'
                : 'bg-nexus-dangerBg/30 border-nexus-danger/30',
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  lastResult.discovered ? 'bg-nexus-accentBg' : 'bg-nexus-warningBg',
                )}
              >
                {lastResult.discovered ? (
                  <BureauIcons.Success className="bureau-icon w-5 h-5 text-nexus-accent" />
                ) : (
                  <BureauIcons.AlertTriangle className="bureau-icon w-5 h-5 text-nexus-warning" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'font-medium',
                    lastResult.discovered ? 'text-nexus-accent' : 'text-nexus-warning',
                  )}
                >
                  {isResolving
                    ? 'Contacting bureau…'
                    : lastResult.alreadyClaimed
                      ? 'Already Claimed'
                      : lastResult.discovered
                        ? 'Marker Recognized'
                        : lastResult.error
                          ? 'Access Denied'
                          : 'Access Denied'}
                </p>
                {lastResult.qrLabel && (
                  <p className="text-sm text-nexus-textMuted font-mono break-all">
                    {lastResult.qrLabel}
                  </p>
                )}
                {lastResult.nodeTitle && (
                  <p className="text-sm text-nexus-textMuted">{lastResult.nodeTitle}</p>
                )}
                <p className="text-sm text-nexus-textMuted mt-1">
                  {lastResult.error
                    ? lastResult.error
                    : lastResult.alreadyClaimed
                      ? 'This marker has already been claimed by your team.'
                      : lastResult.discovered
                        ? 'Proceed to the location to continue.'
                        : 'The system recognizes the marker, but whatever it points to remains sealed.'}
                </p>
              </div>
            </div>

            {lastResult.discovered && lastResult.nodeCode && (
              <Link
                to={ROUTES.PLAYER_GAME}
                className="btn-primary w-full mt-4 touch-target-comfortable"
              >
                <span>Return to current puzzle</span>
              </Link>
            )}
            {lastResult.discovered && !lastResult.nodeCode && (
              <Link
                to={ROUTES.PLAYER_NAVIGATION}
                className="btn-primary w-full mt-4 touch-target-comfortable"
              >
                <BureauIcons.Forward className="bureau-icon w-4 h-4 rotate-180" />
                <span>Go to Location</span>
              </Link>
            )}
          </div>
        )}

        {/* Manual entry fallback */}
        <div className="panel">
          <button
            type="button"
            onClick={() => setShowManualEntry(v => !v)}
            className="w-full flex items-center justify-between gap-3 text-left touch-target-comfortable"
            aria-expanded={showManualEntry}
          >
            <span className="flex items-center gap-3">
              <BureauIcons.Keyboard className="bureau-icon w-5 h-5 text-nexus-textMuted" />
              <span>
                <span className="block font-medium">Enter marker code manually</span>
                <span className="block text-sm text-nexus-textMuted">
                  Use this if the camera cannot read the marker
                </span>
              </span>
            </span>
            <span className="text-nexus-textMuted text-sm">
              {showManualEntry ? 'Hide' : 'Show'}
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
                placeholder="NX-Loc-001-XXXX-XX"
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
                Submit
              </button>
            </form>
          )}
        </div>

        {/* Scan Help */}
        <div className="panel bg-nexus-infoBg/20 border-nexus-info/30">
          <div className="flex items-start gap-3">
            <BureauIcons.AlertTriangle className="bureau-icon w-5 h-5 text-nexus-info flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h4 className="font-medium text-nexus-info mb-1">Scanner Guide</h4>
              <p className="text-sm text-nexus-textMuted">
                NEXUS markers appear at physical locations throughout the campus.
                Enter a manual code if the camera cannot read the marker, or use
                the test code <code className="font-mono">NX-TEST-ENTRY</code> if
                you do not have access to physical markers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
