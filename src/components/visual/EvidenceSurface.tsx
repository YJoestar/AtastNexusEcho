/**
 * NEXUS ECHO — Evidence Surface
 *
 * A physical evidence inspection surface that layers PaperTexture for tactile
 * paper feel, adds a subtle border with edge wear, and supports an optional
 * fold-crease effect. Used to wrap individual evidence items so they feel
 * like recovered physical documents rather than bare digital cards.
 */

import { forwardRef } from 'react'
import { PaperTexture } from '@/components/visual/PaperTexture'
import { cn } from '@/lib/utils'
import type { ComponentPropsWithoutRef } from 'react'

export interface EvidenceSurfaceProps extends ComponentPropsWithoutRef<'div'> {
  variant?: 'document' | 'photograph' | 'report' | 'memo'
  folded?: boolean
}

const VARIANT_CLASSES: Record<string, string> = {
  document: 'evidence-document',
  photograph: 'evidence-photograph',
  report: 'evidence-report',
  memo: 'evidence-memo',
}

export const EvidenceSurface = forwardRef<HTMLDivElement, EvidenceSurfaceProps>(
  ({ className, variant = 'document', folded = false, children, ...props }, ref) => {
    const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.document

    return (
      <div
        ref={ref}
        className={cn('evidence-surface-wrapper', className)}
        {...props}
      >
        <PaperTexture
          className={cn(
            'evidence-surface relative rounded-sm border border-nexus-border bg-nexus-paper',
            'shadow-evidence',
            folded && 'paper-folded',
            variantClass,
          )}
        >
          {folded && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(135deg, transparent 48%, rgba(0, 0, 0, 0.03) 50%, transparent 52%)',
              }}
              aria-hidden="true"
            />
          )}
          {children}
        </PaperTexture>
      </div>
    )
  },
)

EvidenceSurface.displayName = 'EvidenceSurface'
