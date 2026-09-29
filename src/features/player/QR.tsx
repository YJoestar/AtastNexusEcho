/**
 * NEXUS — Player QR Scanner
 * Camera-based QR scanning with narrative failure states.
 * When a QR marker is scanned too early, shows a clinical
 * "ACCESS DENIED" message instead of revealing spoilers.
 */

import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, QrCode, Camera, CheckCircle, XCircle, AlertTriangle, ScanLine } from 'lucide-react'
import { useGameEngine } from '@/hooks/useGameEngine'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'

export function PlayerQR() {
  const { isOffline } = useGameEngine()
  const [isScanning, setIsScanning] = useState(false)
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  const [lastResult] = useState<{
    discovered: boolean
    qrLabel?: string
    message?: string
    error?: string
  } | null>(null)
  const [scanningText, setScanningText] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scanIntervalRef = useRef<number | null>(null)

  const startScan = async () => {
    setPermission('prompt')
    try {
      setScanningText('Requesting camera access…')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      setPermission('granted')
      setIsScanning(true)
      setScanningText('Position QR code within frame')

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }

      scanIntervalRef.current = window.setInterval(() => {
        if (isOffline) {
          setScanningText('Cannot scan while offline')
          clearInterval(scanIntervalRef.current!)
          setIsScanning(false)
          return
        }
      }, 500)
    } catch {
      setPermission('denied')
      setScanningText('Camera access denied')
    }
  }

  const stopScan = () => {
    setIsScanning(false)
    setScanningText('')
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream | null
      stream?.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }

  useEffect(() => {
    return stopScan
  }, [])

  return (
    <div className="page pb-[72px] md:pb-0">
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
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  lastResult.discovered ? 'bg-nexus-accentBg' : 'bg-nexus-warningBg',
                )}
              >
                {lastResult.discovered ? (
                  <CheckCircle className="w-5 h-5 text-nexus-accent" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-nexus-warning" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={cn(
                    'font-medium',
                    lastResult.discovered ? 'text-nexus-accent' : 'text-nexus-warning',
                  )}
                >
                  {lastResult.discovered ? 'Marker Recognized' : 'Access Denied'}
                </p>
                {lastResult.qrLabel && (
                  <p className="text-sm text-nexus-textMuted font-mono">
                    {lastResult.qrLabel}
                  </p>
                )}
                {lastResult.message && (
                  <p className="text-sm text-nexus-textMuted mt-1">
                    {lastResult.message}
                  </p>
                )}
              </div>
            </div>

            {lastResult.discovered && lastResult.qrLabel && (
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
