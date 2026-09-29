/**
 * NEXUS — Vite Environment Type Declarations
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_ENV: string
  readonly VITE_ENABLE_DEV_TOOLS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}