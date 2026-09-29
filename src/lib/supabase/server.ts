/**
 * NEXUS — Supabase Server Client
 * For server-side/Edge function operations with service role
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    '[NEXUS] Supabase service role key not configured. ' +
    'Server-side operations will not work.'
  )
}

export const supabaseAdmin = createClient<Database>(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseServiceKey ?? 'placeholder-service-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export function getSupabaseAdmin() {
  return supabaseAdmin
}