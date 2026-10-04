import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEV_ADMIN_FLAG, DEV_ADMIN_USER, devAdminBypassActive } from '@/lib/devAdminBypass'

describe('development-only admin bypass', () => {
  beforeEach(() => window.localStorage.removeItem(DEV_ADMIN_FLAG))
  afterEach(() => {
    window.localStorage.removeItem(DEV_ADMIN_FLAG)
    vi.unstubAllEnvs()
  })

  it('is off without the local flag, even in a dev build', () => {
    expect(devAdminBypassActive(true)).toBe(false)
  })

  it('is on only with DEV and the flag together', () => {
    window.localStorage.setItem(DEV_ADMIN_FLAG, '1')
    expect(devAdminBypassActive(true)).toBe(true)
  })

  it('is off when DEV is false, flag or not (production builds)', () => {
    window.localStorage.setItem(DEV_ADMIN_FLAG, '1')
    expect(devAdminBypassActive(false)).toBe(false)
    vi.stubEnv('DEV', false)
    expect(devAdminBypassActive()).toBe(false)
  })

  it('never yields a super admin', () => {
    expect(DEV_ADMIN_USER.role).toBe('ADMIN')
  })
})
