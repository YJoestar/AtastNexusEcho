/**
 * NEXUS — Player QR Scanner
 * Camera-based QR scanning with narrative failure states.
 * When a QR marker is scanned too early, shows a clinical
 * "ACCESS DENIED" message instead of revealing spoilers.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, QrCode, Camera, CheckCircle, XCircle, AlertTriangle, ScanLine, Keyboard } from 'lucide-react'
import { useGameEngine, type QRScanResult } from '@/hooks/useGameEngine'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'

/**
 * jsQR is ~120 kB of decoder that only matters once a player opens the
 * scanner, so it is loaded on demand rather than shipped in the entry chunk.
 * It is only ever imported from decodeFrame, which cannot run before startScan.
 */
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

type ScanResult = QRScanResult

/** How often the video frame is sampled and decoded. */
const SCAN_INTERVAL_MS = 250

export function PlayerQR() {
  const { isOffline, scanQR } = useGameEngine()
  const [isScanning, setIsScanning] = useState(false)
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [scanningText, setScanningText] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scanIntervalRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // Guards against submitting the same marker repeatedly while the camera
  // keeps decoding it at 4 fps.
  const lastScannedRef = useRef<{ code: string; at: number } | null>(null)
  const jsQrRef = useRef<JsQrFn | null>(null)
  const decodingRef = useRef(false)

  const submitCode = useCallback(
    async (code: string) => {
      if (isOffline) {
        setLastResult({ discovered: false, error: 'Cannot scan while offline.' })
        return
      }
      setIsResolving(true)
      try {
        const result = await scanQR(code)
        setLastResult(result)
      } catch (err) {
        setLastResult({
          discovered: false,
          error: err instanceof Error ? err.message : 'Scan failed. Try again.',
        })
      } finally {
        setIsResolving(false)
      }
    },
    [isOffline, scanQR],
  )

  /**
   * Pull the current video frame into an offscreen canvas and decode it.
   * jsQR needs raw RGBA pixels, which only the canvas provides, so the video
   * element alone is not enough.
   */
  const decodeFrame = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) return

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) return

    // Cap the working size: decoding a 1080p frame on every tick is enough to
    // drop frames on mid-range phones, and QR codes stay readable much smaller.
    const maxSide = 640
    const scale = Math.min(1, maxSide / Math.max(width, height))
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Drop the frame if the decoder has not finished loading or the previous
    // decode is still running, so slow devices skip rather than queue.
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

    setScanningText('Marker recognized')
    void submitCode(code)
  }, [submitCode])

  const startScan = async () => {
    setPermission('prompt')
    setLastResult(null)
    lastScannedRef.current = null
    try {
      setScanningText('Requesting camera access…')
      // Warm the decoder while the permission prompt and first frames resolve,
      // so the first decodable frame is not wasted waiting on the import.
      const loadPromise = loadJsQr()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      jsQrRef.current = await loadPromise
      setPermission('granted')
      setIsScanning(true)
      setScanningText('Position QR code within frame')

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }

      scanIntervalRef.current = window.setInterval(() => {
        if (isOffline) {
          setScanningText('Cannot scan while offline')
          stopScan()
          return
        }
        decodeFrame()
      }, SCAN_INTERVAL_MS)
    } catch {
      setPermission('denied')
      setScanningText('Camera access denied')
    }
  }

  const stopScan = useCallback(() => {
    setIsScanning(false)
    setScanningText('')
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }, [])
  // Release the camera on unmount, otherwise the indicator stays lit and the
  // next scan has to wait for the browser to reclaim the device.
  useEffect(() => stopScan, [stopScan])

  return (
    <div className="page">
      <div className="page-content max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            to={ROUTES.PLAYER_GAME}
            className="p-2 rounded-xl text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors touch-target-primary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="heading-3">QR Scanner</h1>
            <p className="text-nexus-textMuted text-sm">
              Scan markers to unlock puzzles and locations
            </p>
          </div>
        </div>

        {/* Scanner View */}
        <div className="panel relative aspect-square min-h-[320px] overflow-hidden">
          {permission === 'granted' && isScanning ? (
            <>
              {/* Camera Feed Placeholder */}
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Decoding surface. Kept out of layout: it is a pixel buffer,
                  not something the player should see. */}
              <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="text-center text-white/70">
                  <Camera className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">{scanningText || 'Position QR code within frame'}</p>
                </div>
              </div>

              {/* Scanner Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64">
                  <div className="absolute inset-0 border-2 border-nexus-accent/50 rounded-2xl">
                    <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-nexus-accent rounded-tl-2xl" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-nexus-accent rounded-tr-2xl" />
                    <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-nexus-accent rounded-bl-2xl" />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-nexus-accent rounded-br-2xl" />
                  </div>
                  <div className="absolute left-4 right-4 h-1 bg-nexus-accent animate-pulse-glow rounded-full" />
                </div>
              </div>

              {/* Status Bar */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-nexus-bg/90 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
                  <p className="text-sm text-nexus-textMuted">
                    {scanningText || 'Scanning…'}
                  </p>
                </div>
              </div>

              {/* Cancel Button */}
              <button
                onClick={stopScan}
                className="absolute top-4 right-4 p-2 rounded-xl bg-nexus-dangerBg/90 backdrop-blur-sm border border-nexus-danger/30 text-nexus-danger hover:bg-nexus-danger/20 transition-colors touch-target-primary"
                aria-label="Cancel scan"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </>
          ) : permission === 'denied' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <AlertTriangle className="w-16 h-16 text-nexus-warning mx-auto mb-4" />
              <h3 className="heading-4 mb-2">Camera Access Denied</h3>
              <p className="text-nexus-textMuted mb-6 max-w-xs">
                Please enable camera permissions in your browser settings
                to scan QR codes.
              </p>
              <button
                onClick={startScan}
                className="btn-primary touch-target-comfortable"
              >
                <Camera className="w-4 h-4" />
                <span>Retry Camera Access</span>
              </button>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-24 h-24 rounded-2xl bg-nexus-accentBg flex items-center justify-center mb-6">
                <QrCode className="w-12 h-12 text-nexus-accent" />
              </div>
              <h3 className="heading-4 mb-2">Ready to Scan</h3>
              <p className="text-nexus-textMuted mb-6 max-w-xs">
                Point your camera at a NEXUS QR marker to unlock puzzles,
                evidence, or navigation points.
              </p>
              <button
                onClick={startScan}
                className="btn-primary touch-target-comfortable w-full max-w-xs"
              >
                <ScanLine className="w-5 h-5" />
                <span>Start Scanning</span>
              </button>
              {isOffline && (
                <p className="mt-3 text-sm text-nexus-danger flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Camera unavailable while offline
                </p>
              )}
            </div>
          )}
        </div>

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
                  <CheckCircle className="w-5 h-5 text-nexus-accent" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-nexus-warning" />
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
                <ArrowLeft className="w-4 h-4 rotate-180" />
                <span>Go to Location</span>
              </Link>
            )}
          </div>
        )}

        {/* Manual entry fallback: a physical marker may be damaged, printed at
            an angle, or read in poor light. Camera failure must not strand a
            team, and the server still validates whatever code is entered. */}
        <div className="panel">
          <button
            type="button"
            onClick={() => setShowManualEntry(v => !v)}
            className="w-full flex items-center justify-between gap-3 text-left touch-target-comfortable"
            aria-expanded={showManualEntry}
          >
            <span className="flex items-center gap-3">
              <Keyboard className="w-5 h-5 text-nexus-textMuted" />
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
              onSubmit={(e) => {
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
                placeholder="QR-NODE-02"
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
            <AlertTriangle className="w-5 h-5 text-nexus-info flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-nexus-info mb-1">Scanner Guide</h4>
              <p className="text-sm text-nexus-textMuted">
                NEXUS markers appear at physical locations throughout the campus.
                Scanning too early will return an access denial — return after
                solving the required prerequisite puzzles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
