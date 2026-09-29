/**
 * NEXUS — Admin API Tests
 *
 * Tests the formatting, error handling, and data transformation
 * of the adminAPI client.
 */

import { describe, it, expect } from 'vitest'
import { AdminAPIError } from '@/lib/admin'

describe('AdminAPIError', () => {
  it('creates error with status and message', () => {
    const err = new AdminAPIError(403, 'Forbidden')
    expect(err.status).toBe(403)
    expect(err.message).toBe('Forbidden')
    expect(err.name).toBe('AdminAPIError')
  })

  it('inherits from Error', () => {
    const err = new AdminAPIError(500, 'Server error')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AdminAPIError)
  })
})
