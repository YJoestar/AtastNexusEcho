/**
 * NEXUS ECHO — Access terminal layout
 *
 * The frame around the sign-in screen: a dark monitor, faint CRT texture and
 * nothing else. Everything after authentication lives in the Workstation
 * (`./workstation/Workstation.tsx`), which replaced the old sidebar layout.
 */
import { Outlet } from 'react-router-dom'
import { CRTOverlay } from '@/components/visual/CRTOverlay'
import { GlitchLayer } from '@/components/visual/GlitchLayer'
import { VisualEnvironmentProvider } from '@/components/visual/VisualEnvironment'

export function AdminLayout() {
  return (
    <VisualEnvironmentProvider profile="BUREAU_PC" horrorLevel={0} signalStrength={100} isConnected>
      <div className="relative min-h-screen overflow-hidden bg-nexus-bg font-mono text-nexus-text antialiased">
        <Outlet />
        <div className="pointer-events-none absolute inset-0 z-[80]"><CRTOverlay /></div>
        <GlitchLayer />
      </div>
    </VisualEnvironmentProvider>
  )
}
