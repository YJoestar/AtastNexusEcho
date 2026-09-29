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

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { AdminUser } from '@/types'

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

  const checkAdmin = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setAdmin(null)
        setIsInitialized(true)
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
        setAdmin(null)
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
        setAdmin(adminData)
        return true
      } else {
        setAdmin(null)
        return false
      }
    } catch (error) {
      console.error('Admin check failed:', error)
      setAdmin(null)
      return false
    } finally {
      setIsLoading(false)
      setIsInitialized(true)
    }
  }, [])

  useEffect(() => {
    checkAdmin()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void checkAdmin()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [checkAdmin])

  const login = useCallback(async (email: string, password: string) => {
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
        await supabase.auth.signOut()
        return { success: false, error: 'Not authorized as admin. Contact Bureau command.' }
      }

      return { success: true }
    } catch (error) {
      console.error('Admin login error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }, [checkAdmin])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setAdmin(null)
    setIsInitialized(false)
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
