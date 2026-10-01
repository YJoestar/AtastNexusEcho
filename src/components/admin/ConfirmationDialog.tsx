/**
 * NEXUS — Confirmation Dialog
 *
 * Reusable modal for dangerous/confirmatory actions.
 * Visual distinction between danger, warning, and primary actions.
 */

import { ReactNode } from 'react'
import { BureauIcons } from '@/components/bureau'
import { cn } from '@/lib/utils'

export type ConfirmVariant = 'danger' | 'warning' | 'primary'

interface ConfirmAction {
  label: string
  variant?: ConfirmVariant
  loading?: boolean
}

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  confirmAction: ConfirmAction
  onConfirm: () => void | Promise<void>
  cancelAction?: { label: string }
  size?: 'sm' | 'md' | 'lg'
  danger?: boolean
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  title,
  children,
  confirmAction,
  onConfirm,
  cancelAction = { label: 'CANCEL' },
  size = 'md',
  danger = false,
}: ConfirmationDialogProps) {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }

  const variantClasses = {
    danger: 'btn-danger',
    warning: 'btn-warning',
    primary: 'btn-primary',
  }

  const IconMap = {
    danger: BureauIcons.AlertTriangle,
    warning: BureauIcons.AlertTriangle,
    primary: BureauIcons.Shield,
  }

  const Icon = IconMap[confirmAction.variant ?? (danger ? 'danger' : 'primary')]

  const handleConfirm = async () => {
    if (confirmAction.loading) return
    await onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nexus-bg/80 backdrop-blur-sm">
      <div className={cn(
        'bg-nexus-surface border border-nexus-border rounded-2xl shadow-panel w-full',
        sizeClasses[size],
      )}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
              danger
                ? 'bg-nexus-dangerBg text-nexus-danger'
                : confirmAction.variant === 'warning'
                ? 'bg-nexus-warningBg text-nexus-warning'
                : 'bg-nexus-infoBg text-nexus-info',
            )}>
              <Icon className="bureau-icon w-6 h-6" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h2 className={cn(
                'heading-3',
                danger ? 'text-nexus-danger' : '',
              )}>
                {title}
              </h2>
              <div className="mt-3 text-nexus-textMuted text-sm space-y-2">
                {children}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-nexus-textSubtle hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <BureauIcons.Close className="bureau-icon w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-nexus-borderSubtle bg-nexus-bg/30 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={confirmAction.loading}
            className="btn-secondary"
          >
            {cancelAction.label}
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmAction.loading}
            className={cn(variantClasses[confirmAction.variant ?? (danger ? 'danger' : 'primary')])}
          >
            {confirmAction.loading
              ? (confirmAction.loading ? '...' : confirmAction.label)
              : confirmAction.label}
          </button>
        </div>
      </div>
    </div>
  )
}

export function TeamIdentity({
  teamName,
  teamCode,
  teamStatus,
  currentNode,
}: {
  teamName: string
  teamCode: string
  teamStatus: string
  currentNode?: string
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-nexus-bg rounded-xl border border-nexus-border">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-display font-bold text-lg text-nexus-text">{teamName}</span>
          <span className="text-xs font-mono text-nexus-textSubtle bg-nexus-borderSubtle/30 px-2 py-0.5 rounded">
            {teamCode}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="text-nexus-textSubtle">Status:</span>
            <span className="font-medium text-nexus-text">{teamStatus}</span>
          </span>
          {currentNode && (
            <span className="flex items-center gap-1">
              <span className="text-nexus-textSubtle">Current Node:</span>
              <span className="font-medium text-nexus-text font-mono">{currentNode}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
