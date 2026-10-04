/**
 * NEXUS — Admin Provider
 *
 * Manages Bureau/admin authentication state.
 * Tracks whether the current Supabase Auth user has admin privileges
 * and provides the admin-check edge function integration.
 *
 * SECURITY: Admin status is always verified server-side via the
 * admin-check Edge Function. The browser is untrusted.
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { AdminUser } from '@/types'
import { DEV_ADMIN_USER, devAdminBypassActive } from '@/lib/devAdminBypass'

interface AdminContextValue {
  admin: AdminUser | null
  isAdmin: boolean
  isInitialized: boolean
  isLoading: boolean
  checkAdmin: () => Promise<boolean>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const AdminContext = createContext<AdminContextValue | null>(null)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const isAdmin = !!admin

  const mountedRef = useRef(true)
  // Only the newest admin check may write state: a slow response for an old
  // session must not overwrite the result for the current one.
  const checkSeqRef = useRef(0)
  const loginInFlightRef = useRef<Promise<{ success: boolean; error?: string }> | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const checkAdmin = useCallback(async (): Promise<boolean> => {
    const seq = ++checkSeqRef.current
    const isCurrent = () => mountedRef.current && seq === checkSeqRef.current
    if (mountedRef.current) setIsLoading(true)
    try {
      // Development builds only, and only with the local flag set (see the module).
      if (devAdminBypassActive()) {
        if (isCurrent()) setAdmin(DEV_ADMIN_USER)
        return true
      }
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        if (isCurrent()) setAdmin(null)
        return false
      }

      const { data, error } = await supabase.functions.invoke('admin-check', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (error || !data) {
        if (isCurrent()) setAdmin(null)
        return false
      }

      const result = data as { authenticated: boolean; isAdmin: boolean; adminRole: string; username: string; userId: string }

      if (result.authenticated && result.isAdmin) {
        const adminData: AdminUser = {
          id: result.userId ?? '',
          authUserId: result.userId ?? '',
          username: result.username ?? '',
          role: (result.adminRole ?? 'ADMIN') as 'ADMIN' | 'SUPER_ADMIN',
          createdAt: '',
          lastLoginAt: null,
        }
        if (isCurrent()) setAdmin(adminData)
        return true
      } else {
        if (isCurrent()) setAdmin(null)
        return false
      }
    } catch (error) {
      console.error('Admin check failed:', error)
      if (isCurrent()) setAdmin(null)
      return false
    } finally {
      if (isCurrent()) {
        setIsLoading(false)
        setIsInitialized(true)
      }
    }
  }, [])

  useEffect(() => {
    void checkAdmin()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // INITIAL_SESSION duplicates the check above. TOKEN_REFRESHED does not
      // change who the user is, and re-checking on every refresh would flash
      // the guard (unmounting the workstation) or sign an admin out on a blip.
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return
      // Deferred: supabase-js holds its auth lock during this callback.
      setTimeout(() => {
        if (!mountedRef.current) return
        if (event === 'SIGNED_OUT') {
          // Signed out here or in another tab, or the refresh token was rejected.
          checkSeqRef.current++
          setAdmin(null)
          setIsLoading(false)
          setIsInitialized(true)
          return
        }
        void checkAdmin()
      }, 0)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [checkAdmin])

  const performLogin = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error || !data.session) {
        return { success: false, error: error?.message ?? 'Login failed' }
      }

      const isAuthorized = await checkAdmin()

      if (!isAuthorized) {
        await supabase.auth.signOut().catch(() => undefined)
        return { success: false, error: 'Not authorized as admin. Contact Bureau command.' }
      }

      return { success: true }
    } catch (error) {
      console.error('Admin login error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }, [checkAdmin])

  // Double-submit joins the attempt already in flight.
  const login = useCallback((email: string, password: string) => {
    if (loginInFlightRef.current) return loginInFlightRef.current
    const attempt = performLogin(email, password).finally(() => {
      loginInFlightRef.current = null
    })
    loginInFlightRef.current = attempt
    return attempt
  }, [performLogin])

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.warn('Admin sign out failed:', error)
    } finally {
      checkSeqRef.current++
      if (mountedRef.current) {
        setAdmin(null)
        setIsInitialized(true)
      }
    }
  }, [])

  const value: AdminContextValue = {
    admin,
    isAdmin,
    isInitialized,
    isLoading,
    checkAdmin,
    login,
    logout,
  }

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
