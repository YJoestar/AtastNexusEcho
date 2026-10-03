/**
 * NEXUS — Main Entry Point
 * Application bootstrap
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AppProvider, AdminProvider } from '@/app/providers'
import { router } from '@/app/router'
import '@/styles/fonts.css'
import '@/styles/tokens.css'
import '@/styles/globals.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Failed to find root element')
}

const root = createRoot(rootElement)

root.render(
  <StrictMode>
    <AppProvider>
      <AdminProvider>
        <RouterProvider router={router} />
      </AdminProvider>
    </AppProvider>
  </StrictMode>,
)
