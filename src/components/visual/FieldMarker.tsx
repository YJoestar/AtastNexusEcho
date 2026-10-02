/**
 * NEXUS ECHO — Field Marker
 *
 * A self-contained, printable field marker unit. Each marker is a complete
 * physical identification label containing:
 *   1. NEXUS header
 *   2. Marker ID (e.g. NX-037-B)
 *   3. QR code (the encoded machine-readable identifier)
 *   4. Manual fallback code (human-typed alternative)
 *   5. Location
 *   6. Case reference
 *   7. Deployment status
 *
 * Used in both the admin preview and the generated PDF.
 */

import { useEffect, useState, type FC } from 'react'
import { cn } from '@/lib/utils'
import type { QRCodeEntry } from '@/lib/admin'

export interface FieldMarkerProps {
  qrCode: QRCodeEntry
  variant?: 'preview' | 'print'
  className?: string
}

const STATUS_LABEL: Record<string, string> = {
  GENERATED: 'GENERATED',
  ACTIVE: 'ACTIVE',
  DEPLOYED: 'DEPLOYED',
  VERIFIED: 'VERIFIED',
  ARCHIVED: 'ARCHIVED',
  DISABLED: 'DISABLED',
}

export const FieldMarker: FC<FieldMarkerProps> = ({
  qrCode,
  variant = 'preview',
  className,
}) => {
  const [qrSvg, setQrSvg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void import('qrcode').then(module => {
      const QRCode = module.default ?? module
      void QRCode.toString(qrCode.code, {
        type: 'svg',
        margin: 0,
        errorCorrectionLevel: 'Q',
      }, (err: Error | null | undefined, svg: string) => {
        if (!err && !cancelled && svg) {
          setQrSvg(svg)
        }
      })
    })

    return () => { cancelled = true }
  }, [qrCode.code])

  const markerId = qrCode.markerId ?? qrCode.code
  const manualCode = qrCode.manualCode ?? 'N/A'
  const caseNumber = qrCode.caseNumber ?? '037'
  const building = qrCode.building ?? qrCode.puzzleNodeLocation
  const status = STATUS_LABEL[qrCode.deploymentStatus ?? 'GENERATED'] ?? qrCode.deploymentStatus ?? 'GENERATED'

  const isPrint = variant === 'print'

  return (
    <div
      className={cn(
        'field-marker relative box-border font-mono',
        'border border-nexus-border bg-nexus-paper text-nexus-text',
        isPrint ? 'print-marker' : 'preview-marker',
        className,
      )}
    >
      {/* Header */}
      <div className="field-marker-header flex items-center justify-between border-b border-nexus-borderSubtle px-3 py-1.5">
        <span className="text-[0.625rem] uppercase tracking-[0.18em] text-nexus-textSubtle">
          NEXUS ECHO
        </span>
        <span className="text-[0.56rem] uppercase tracking-[0.12em] text-nexus-textMuted">
          FIELD MARKER
        </span>
      </div>

      {/* Marker ID */}
      <div className="field-marker-id px-3 py-2 border-b border-nexus-borderSubtle">
        <div className="text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
          MARKER ID
        </div>
        <div className="font-display text-xl font-bold tracking-tight text-nexus-text mt-0.5">
          {markerId}
        </div>
      </div>

      {/* QR + Manual Code */}
      <div className="field-marker-qr flex items-start gap-3 px-3 py-3 border-b border-nexus-borderSubtle">
        <div className="qr-container relative flex-shrink-0">
          {qrSvg ? (
            <div
              className="qr-svg w-24 h-24"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
              aria-label={`QR code for ${markerId}`}
            />
          ) : (
            <div className="qr-placeholder w-24 h-24 border border-nexus-border bg-nexus-bg flex items-center justify-center">
              <span className="text-[0.5rem] text-nexus-textSubtle">QR</span>
            </div>
          )}
          {/* Quiet zone: empty border around QR */}
          <div className="absolute inset-0 border border-transparent" aria-hidden="true" />
        </div>
        <div className="qr-manual flex-1 min-w-0">
          <div className="text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
            MANUAL CODE
          </div>
          <div
            className="font-mono text-xl font-bold tracking-[0.08em] text-nexus-text mt-0.5"
            style={{ wordBreak: 'break-all' }}
          >
            {manualCode}
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="field-marker-location px-3 py-2 border-b border-nexus-borderSubtle">
        <div className="text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
          LOCATION
        </div>
        <div className="text-xs text-nexus-text mt-0.5 truncate">
          {building}
        </div>
      </div>

      {/* Case + Stage */}
      <div className="field-marker-context px-3 py-2 border-b border-nexus-borderSubtle">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
              CASE
            </div>
            <div className="text-xs text-nexus-text mt-0.5">
              INCIDENT {caseNumber}
            </div>
          </div>
          <div>
            <div className="text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
              NODE
            </div>
            <div className="text-xs text-nexus-text mt-0.5">
              {qrCode.puzzleNodeCode}
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="field-marker-status flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-block h-1.5 w-1.5',
              qrCode.deploymentStatus === 'DEPLOYED' || qrCode.deploymentStatus === 'VERIFIED'
                ? 'bg-nexus-accent'
                : qrCode.deploymentStatus === 'DISABLED'
                ? 'bg-nexus-danger'
                : 'bg-nexus-warning',
            )}
          />
          <span className="text-[0.56rem] uppercase tracking-[0.12em] text-nexus-textMuted">
            {status}
          </span>
        </div>
        <span className="text-[0.52rem] font-mono tracking-[0.12em] text-nexus-textSubtle">
          {qrCode.puzzleNodeStage !== undefined && `STAGE ${qrCode.puzzleNodeStage}`}
        </span>
      </div>

      {/* Cut guide — subtle, only visible in print */}
      {isPrint && (
        <div
          className="print-cut-guide absolute -inset-px border-2 border-dashed border-transparent pointer-events-none"
          style={{
            borderTopColor: 'rgba(0,0,0,0.05)',
            borderLeftColor: 'rgba(0,0,0,0.05)',
          }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
