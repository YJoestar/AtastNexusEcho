/**
 * NEXUS ECHO — development-only admin bypass
 *
 * Lets local tooling (scripts/screenshots/capture.mjs) open the admin
 * workstation without a Supabase session. It is active only when ALL hold:
 *   1. the app is a Vite development build (`import.meta.env.DEV === true`;
 *      Vite replaces this with `false` in `vite build`, so the branch is dead
 *      code in production bundles), and
 *   2. the browser already holds `localStorage["nexus_dev_admin"] === "1"`.
 * There is no URL switch. The identity it yields is a plain ADMIN (never
 * SUPER_ADMIN) and the server-side admin-check is untouched, so no real data
 * or privileged API call is unlocked: every request still carries no session.
 */
import type { AdminUser } from '@/types'

export const DEV_ADMIN_FLAG = 'nexus_dev_admin'

export const DEV_ADMIN_USER: AdminUser = {
  id: 'dev-admin',
  authUserId: 'dev-admin',
  username: 'DEV OPERATOR',
  role: 'ADMIN',
  createdAt: '',
  lastLoginAt: null,
}

export function devAdminBypassActive(isDev: boolean = import.meta.env.DEV === true): boolean {
  if (isDev !== true) return false
  try {
    return window.localStorage.getItem(DEV_ADMIN_FLAG) === '1'
  } catch {
    return false
  }
}
