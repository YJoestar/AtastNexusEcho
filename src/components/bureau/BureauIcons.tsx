/**
 * NEXUS ECHO — Bureau: Icons
 *
 * Institutional glyph set. Every mark is a measured form: a stamp, a
 * signal reading, a filing mark. No icon here is "decoration"; each
 * stands in for a word on a bureau form and inherits `currentColor` so
 * it darkens under anomaly overrides the same way text does.
 *
 * Stroke weight is 1.5px across the set for a technical, measured feel.
 * Components forward `className` and accept the standard SVG props.
 */

import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

const base = 'bureau-icon'
type Props = SVGProps<SVGSVGElement> & { className?: string }

function Icon({ className, ...props }: Props) {
  return (
    <svg
      data-bureau-icon="true"
      className={cn(base, className)}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      {...props}
    />
  )
}

/* ── Navigation & directional ────────────────────────── */

export function BackIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6 12h12M6 12l4-4m-4 4l4 4" />
    </Icon>
  )
}

export function ForwardIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6 12h12M18 12l-4-4m4 4l-4 4" />
    </Icon>
  )
}

export function ChevronLeftIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M8 5l-6 7 6 7" />
      <path d="M14 5l-6 7 6 7" />
    </Icon>
  )
}

/* ── Actions ─────────────────────────────────────────── */

export function CloseIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  )
}

export function ConfirmIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M5 12l5 5 9-9" />
    </Icon>
  )
}

export function AddIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 6v12M6 12h12" />
    </Icon>
  )
}

export function SendIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6 12h12M6 12l4-4m-4 4l4 4" />
      <path d="M18 12h2" />
    </Icon>
  )
}

export function CopyIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="6" y="6" width="12" height="12" rx="0" />
      <path d="M9 3h6" />
      <path d="M9 21h6" />
    </Icon>
  )
}

export function DownloadIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 6v12" />
      <path d="M8 14l4 4 4-4" />
      <path d="M6 20h12" />
    </Icon>
  )
}

export function EditIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 19h-9v-9l9-9 5 5-9 9z" />
      <path d="M17 7l5 5" />
      <path d="M15 3l6 6-6 6-6-6z" />
    </Icon>
  )
}

export function SaveIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6 2h12v12H6z" />
      <path d="M9 8h6v8H9z" />
      <path d="M6 22h12v4H6z" />
    </Icon>
  )
}

export function RefreshIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 9 9" />
      <path d="M12 3v6l3 3" />
    </Icon>
  )
}

export function ShareIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 19V5" />
      <path d="M8 11l4-4 4 4" />
      <path d="M6 21h12" />
    </Icon>
  )
}

export function EraserIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6l-6 6-6-6z" />
      <path d="M6 18l6-6" />
      <path d="M0 22h8" />
    </Icon>
  )
}

/* ── Status & state ──────────────────────────────────── */

export function AlertIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5" />
      <path d="M12 16h.01" />
    </Icon>
  )
}

export function AlertTriangleIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 3l9 15H3z" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </Icon>
  )
}

export function SpinnerIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v6" />
    </Icon>
  )
}

export function SuccessIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12l2 2 4-4" />
    </Icon>
  )
}

export function ErrorIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </Icon>
  )
}

export function CircleIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
    </Icon>
  )
}

/* ── Security & access ───────────────────────────────── */

export function LockIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="0" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
  )
}

export function UnlockIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="0" />
      <path d="M8 11V7a4 4 0 0 1 8 0v2" />
      <circle cx="12" cy="15" r="1.5" />
    </Icon>
  )
}

export function ShieldIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Icon>
  )
}

export function ShieldQuestionIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 13v-2" />
      <path d="M12 16h.01" />
    </Icon>
  )
}

export function EyeIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  )
}

export function EyeOffIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8" />
      <path d="M1 1l22 22" />
    </Icon>
  )
}

/* ── People ──────────────────────────────────────────── */

export function UsersIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M4 20v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
      <circle cx="8" cy="10" r="3" />
      <circle cx="16" cy="10" r="3" />
    </Icon>
  )
}

export function UserIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v2" />
    </Icon>
  )
}

/* ── Achievement & awards ─────────────────────────────── */

export function TrophyIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="14" r="6" />
      <path d="M12 2v4M8 6h8" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </Icon>
  )
}

export function StarIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 2l3 7h7l-5.5 4 2.5 7L12 17l-6 5 2.5-7L5 9h7z" />
    </Icon>
  )
}

export function FlagIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M4 22V4h2v18z" />
      <path d="M6 6l14-2v2" />
      <path d="M6 12l14-2v2" />
      <path d="M6 18l14-2v2" />
    </Icon>
  )
}

export function TrendingUpIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M4 18l6-6 4 4 6-6" />
      <path d="M16 6h4v4" />
      <path d="M20 6l-6 6-4-4-6 6" />
    </Icon>
  )
}

export function LogOutIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M9 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H9" />
      <path d="M15 12H3" />
      <path d="M10 8l5 4-5 4" />
    </Icon>
  )
}

/* ── Location & orientation ──────────────────────────── */

export function MapPinIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M21 10c0-6-6-10-9-10S3 4 3 10s6 10 9 10 9-4 9-10z" />
      <circle cx="12" cy="10" r="2.5" />
    </Icon>
  )
}

export function NavigationIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l3 3" />
    </Icon>
  )
}

export function CompassIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 6l3 6-3 3-3-6z" />
    </Icon>
  )
}

/* ── Search & filtering ─────────────────────────────── */

export function SearchIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="10" r="6" />
      <path d="M15 15l4 4" />
    </Icon>
  )
}

export function FilterIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M3 6h18v2.5L12 18l-9-9.5z" />
      <path d="M8 14v6l4 3 4-3v-6" />
    </Icon>
  )
}

export function InfoIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </Icon>
  )
}

export function HelpIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v2a3 3 0 1 0 0 6" />
    </Icon>
  )
}

/* ── Document & content types ───────────────────────── */

export function FileIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6 2h12v2H6z" />
      <path d="M4 4v20h16V4h-2" />
      <path d="M8 8h8v2H8z" />
      <path d="M8 12h8v2H8z" />
      <path d="M8 16h4v2H8z" />
    </Icon>
  )
}

export function ImageIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="0" />
      <circle cx="10" cy="10" r="2" />
      <path d="M4 18l6-6 4 4 6-6v6H4z" />
    </Icon>
  )
}

export function MusicIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M9 18V5l9-2v13" />
      <circle cx="9" cy="18" r="3" />
      <circle cx="18" cy="18" r="3" />
    </Icon>
  )
}

export function VideoIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="4" y="6" width="16" height="12" rx="0" />
      <path d="M4 18l4-4h4l4 4v2a2 2 0 0 0 2 2H4a2 2 0 0 1-2-2v-2z" />
    </Icon>
  )
}

export function DatabaseIcon(props: Props) {
  return (
    <Icon {...props}>
      <ellipse cx="12" cy="12" rx="8" ry="4" />
      <path d="M20 12v8a8 8 0 0 1-16 0V12" />
      <path d="M4 8v8a8 8 0 0 0 16 0V8" />
    </Icon>
  )
}

export function BoxIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6 8h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
      <path d="M6 8l6-6 6 6" />
    </Icon>
  )
}

export function PackageIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M8 5a4 4 0 0 1 8 0c0 1.5-.5 3-2 4s-3 2.5-4 4v3a2 2 0 0 1-4 0v-3c-1-1.5-2-3-2-4S5 10.5 6 9 6 7.5 6 6V5z" />
    </Icon>
  )
}

export function KeyIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M13 7V3a4 4 0 0 1 8 0v4" />
      <path d="M8 7V3a4 4 0 0 0-4 4v4" />
      <circle cx="8" cy="14" r="3" />
      <circle cx="16" cy="14" r="3" />
    </Icon>
  )
}

export function HashIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M4 9h2M4 15h2" />
      <path d="M10 9h8M10 15h8" />
      <path d="M6 6l2 0M6 18l2 0" />
      <path d="M8 6l2 0M8 18l2 0" />
    </Icon>
  )
}

export function CpuIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M8 8h8v8H8z" />
      <path d="M6 6h12v12H6z" />
      <path d="M6 6V2h2v4M16 6V2h2v4" />
      <path d="M6 18v4h2v-4M16 18v4h2v-4" />
    </Icon>
  )
}

export function PillIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M7 17l5-5 5 5-5 5z" />
      <path d="M17 7l5-5 0 10-5 5z" />
      <path d="M7 7l0 10-5 0 5-5z" />
    </Icon>
  )
}

export function GemIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 3l6 6-6 12L3 9z" />
      <path d="M12 9l3 3-3 3-3-3z" />
    </Icon>
  )
}

/* ── Notifications & communication ──────────────────── */

export function BellIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z" />
      <path d="M8 8a4 4 0 0 1 8 0c0 2.5-2 4.5-8 4.5v-4.5z" />
    </Icon>
  )
}

export function BellOffIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M1 1l22 22" />
      <path d="M8 8a4 4 0 0 1 8 0c0 2.5-2 4.5-8 4.5v-4.5z" />
      <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z" />
    </Icon>
  )
}

export function KeyboardIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="3" y="6" width="18" height="12" rx="0" />
      <path d="M7 11h2M11 11h2M15 11h2M7 15h2M11 15h2M15 15h2" />
    </Icon>
  )
}

/* ── Scanning & capture ───────────────────────────────── */

export function QrCodeIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="5" height="5" rx="0" />
      <rect x="3" y="16" width="5" height="5" rx="0" />
      <rect x="16" y="3" width="5" height="5" rx="0" />
      <rect x="16" y="16" width="5" height="5" rx="0" />
      <path d="M8 8h2v2h-2zM8 14h2v2h-2zM14 8h2v2h-2zM14 14h2v2h-2z" />
    </Icon>
  )
}

export function CameraIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6 6h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="10" r="3" />
      <path d="M8 6l4-4 4 4" />
    </Icon>
  )
}

export function ScanLineIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M3 6h18" />
      <path d="M3 18h18" />
      <path d="M8 10h8" />
    </Icon>
  )
}

/* ── Playback ────────────────────────────────────────── */

export function PlayIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6 6v12l10-6z" />
    </Icon>
  )
}

export function PauseIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6 6h4v12H6zM14 6h4v12h-4z" />
    </Icon>
  )
}

export function SquareIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6 6h12v12H6z" />
    </Icon>
  )
}

export function RotateIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 9 9" />
      <path d="M12 3v6l3 3" />
    </Icon>
  )
}

export function RadioIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M4 12h16M4 12a8 8 0 0 1 16 0" />
      <path d="M12 12v8" />
      <circle cx="12" cy="6" r="2" />
    </Icon>
  )
}

/* ── Layout ──────────────────────────────────────────── */

export function LayoutDashboardIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M4 4h16v4H4zM4 10h6v10H4zM12 10h8v4h-8zM12 16h8v4h-8z" />
    </Icon>
  )
}

export function GamepadIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="4" y="6" width="16" height="12" rx="0" />
      <circle cx="9" cy="11" r="1.5" />
      <circle cx="15" cy="11" r="1.5" />
      <path d="M8 14h2v2H8z" />
    </Icon>
  )
}

export function MaximizeIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M4 4h4v4M16 4h4v4M4 20v-4h-4M20 20v-4h-4" />
      <path d="M4 4l2 2M16 4l2 2M4 20l2-2M16 20l2-2" />
    </Icon>
  )
}

export function MinimizeIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M8 8h8v8H8z" />
      <path d="M4 4l4 4M16 4l4 4M4 20l4-4M16 20l4-4" />
    </Icon>
  )
}

/* ── Network & connectivity ──────────────────────────── */

export function WifiIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M2 14l10-8 10 8" />
      <path d="M6 18h12a2 2 0 0 1 2 2H4a2 2 0 0 1 2-2z" />
    </Icon>
  )
}

export function WifiOffIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M2 14l10-8 10 8" />
      <path d="M1 1l22 22" />
      <path d="M6 18h12a2 2 0 0 1 2 2H4a2 2 0 0 1 2-2z" />
    </Icon>
  )
}

export function CloudOffIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M20 16a4 4 0 0 0-3-7 3 3 0 0 0-6 0 4 4 0 0 0-3 7H4v4h12v-4z" />
      <path d="M1 1l22 22" />
    </Icon>
  )
}

export function ServerIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="4" y="6" width="16" height="8" rx="0" />
      <path d="M4 14h16" />
      <circle cx="10" cy="10" r="1.5" />
      <rect x="6" y="2" width="12" height="4" rx="0" />
    </Icon>
  )
}

export function ServerCrashIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="4" y="6" width="16" height="8" rx="0" />
      <path d="M4 14h16" />
      <circle cx="10" cy="10" r="1.5" />
      <path d="M10 16v4M14 16v4" />
      <path d="M6 22h12" />
    </Icon>
  )
}

/* ── Time ────────────────────────────────────────────── */

export function ClockIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </Icon>
  )
}

/* ── Charts & data ───────────────────────────────────── */

export function BarChartIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M4 18h4v-6H4zM10 18h4v-10h-4zM16 18h4v-14h-4z" />
    </Icon>
  )
}

export function BrainIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M8 10a4 4 0 1 0 8 0 4 4 0 0 0-8 0z" />
      <path d="M6 14a6 6 0 0 0 12 0" />
      <path d="M10 6a2 2 0 0 0 4 0" />
      <path d="M2 14a10 10 0 0 1 20 0" />
    </Icon>
  )
}

/* ── Target ──────────────────────────────────────────── */

export function TargetIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v6M12 15v6" />
    </Icon>
  )
}

/* ── Trash ───────────────────────────────────────────── */

export function TrashIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M4 6h16" />
      <path d="M6 6l2 14h8l2-14" />
      <path d="M9 3h6v2H9z" />
    </Icon>
  )
}

/* ── Lightbulb ───────────────────────────────────────── */

export function LightbulbIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 2a6 6 0 0 0-6 6 6 6 0 0 0 12 0 6 6 0 0 0-6-6z" />
      <path d="M12 14v6" />
      <path d="M9 18h6" />
      <path d="M9 20h6" />
    </Icon>
  )
}

/* ── RotateCcw ───────────────────────────────────────── */

export function RotateCcwIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M3 12a9 9 0 0 1 5-8.465M12 3v6m0 0H9l3 3m-3-3l3-3" />
      <path d="M12 21a9 9 0 0 0 9-9" />
      <path d="M9 12h6" />
    </Icon>
  )
}

/* ── SkipForward ─────────────────────────────────────── */

export function SkipForwardIcon(props: Props) {
  return (
    <Icon {...props}>
      <polygon points="14 12 22 6 22 18 14 12" />
      <line x1="6" y1="4" x2="6" y2="20" />
    </Icon>
  )
}

/* ── BarChart3 ───────────────────────────────────────── */

export function BarChart3Icon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M4 18V6a2 2 0 0 1 2-2h2" />
      <path d="M10 18V3a2 2 0 0 1 2-2h2" />
      <path d="M16 18V9a2 2 0 0 1 2-2h2" />
      <path d="M4 18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" />
      <path d="M4 6v12" />
      <path d="M10 3v15" />
      <path d="M16 9v9" />
    </Icon>
  )
}

/* ── Smartphone ──────────────────────────────────────── */

export function SmartphoneIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8" />
      <path d="M12 16h.01" />
    </Icon>
  )
}

/* ── Tablet ──────────────────────────────────────────── */

export function TabletIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8" />
      <path d="M8 13h8" />
      <path d="M12 17h.01" />
    </Icon>
  )
}

/* ── Monitor ─────────────────────────────────────────── */

export function MonitorIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M8 18h8" />
      <path d="M12 18v4" />
    </Icon>
  )
}

/* ── Wrench ──────────────────────────────────────────── */

export function WrenchIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 2l2.6 8.4h8.4l-6.8 5 2.6 8.4-6.8-5-6.8 5 2.6-8.4L3 10.4h8.4z" />
    </Icon>
  )
}

/* ── Microphone ──────────────────────────────────────── */

export function MicrophoneIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
      <path d="M4 11a8 8 0 0 0 16 0" />
      <path d="M8 19v2a4 4 0 0 0 8 0v-2" />
    </Icon>
  )
}

/* ── Export registry ──────────────────────────────────── */

export const BureauIcons = {
  Back: BackIcon,
  Forward: ForwardIcon,
  ChevronLeft: ChevronLeftIcon,
  Close: CloseIcon,
  Confirm: ConfirmIcon,
  Check: ConfirmIcon,
  Add: AddIcon,
  Send: SendIcon,
  Copy: CopyIcon,
  Download: DownloadIcon,
  Edit: EditIcon,
  Save: SaveIcon,
  Refresh: RefreshIcon,
  Share: ShareIcon,
  Eraser: EraserIcon,
  Alert: AlertIcon,
  AlertTriangle: AlertTriangleIcon,
  Spinner: SpinnerIcon,
  Success: SuccessIcon,
  Error: ErrorIcon,
  Circle: CircleIcon,
  Lock: LockIcon,
  Unlock: UnlockIcon,
  Shield: ShieldIcon,
  ShieldQuestion: ShieldQuestionIcon,
  Eye: EyeIcon,
  EyeOff: EyeOffIcon,
  Users: UsersIcon,
  User: UserIcon,
  Trophy: TrophyIcon,
  Star: StarIcon,
  Flag: FlagIcon,
  TrendingUp: TrendingUpIcon,
  Target: TargetIcon,
  LogOut: LogOutIcon,
  MapPin: MapPinIcon,
  Navigation: NavigationIcon,
  Compass: CompassIcon,
  Search: SearchIcon,
  Filter: FilterIcon,
  Info: InfoIcon,
  Help: HelpIcon,
  File: FileIcon,
  Image: ImageIcon,
  Music: MusicIcon,
  Video: VideoIcon,
  Database: DatabaseIcon,
  Box: BoxIcon,
  Package: PackageIcon,
  Key: KeyIcon,
  Hash: HashIcon,
  Cpu: CpuIcon,
  Pill: PillIcon,
  Gem: GemIcon,
  Bell: BellIcon,
  BellOff: BellOffIcon,
  Keyboard: KeyboardIcon,
  QrCode: QrCodeIcon,
  Camera: CameraIcon,
  ScanLine: ScanLineIcon,
  Play: PlayIcon,
  Pause: PauseIcon,
  Square: SquareIcon,
  Rotate: RotateIcon,
  Radio: RadioIcon,
  LayoutDashboard: LayoutDashboardIcon,
  Gamepad: GamepadIcon,
  Maximize: MaximizeIcon,
  Minimize: MinimizeIcon,
  Wifi: WifiIcon,
  WifiOff: WifiOffIcon,
  CloudOff: CloudOffIcon,
  Server: ServerIcon,
  ServerCrash: ServerCrashIcon,
  Clock: ClockIcon,
  BarChart: BarChartIcon,
  BarChart3: BarChart3Icon,
  Brain: BrainIcon,
  Lightbulb: LightbulbIcon,
  RotateCcw: RotateCcwIcon,
  RotateCcwIcon: RotateCcwIcon,
  SkipForward: SkipForwardIcon,
  Smartphone: SmartphoneIcon,
  Tablet: TabletIcon,
  Monitor: MonitorIcon,
  Wrench: WrenchIcon,
  Microphone: MicrophoneIcon,
  Trash: TrashIcon,
}
