/**
 * NEXUS — Device identity
 *
 * Device IDs used to be typed by the Bureau into the provisioning wizard: a
 * field nobody could know, that was never shown again, and that had nothing
 * stopping two players from being registered against the same string.
 *
 * These tests pin the properties the server now relies on:
 *   * one id per device, generated automatically
 *   * the same id on every later visit, so a binding survives a refresh
 *   * different devices never collide, even when they look identical
 *   * a plain-HTTP phone on the venue LAN can still log in instead of crashing
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  collectDeviceFingerprint,
  createDeviceBinding,
  getOrCreateDeviceId,
  hashDeviceFingerprint,
} from '@/lib/auth/device-fingerprint'

const STORAGE_KEY = 'nexus.device-id.v1'

describe('Device identity', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getOrCreateDeviceId', () => {
    it('creates an id on first use without anyone asking for one', () => {
      const id = getOrCreateDeviceId()

      expect(id).toBeTruthy()
      expect(id.length).toBeGreaterThan(8)
      expect(id).not.toMatch(/^DEVICE-\d+$/)
    })

    it('returns the same id afterwards, so the binding survives a refresh', () => {
      const first = getOrCreateDeviceId()

      expect(getOrCreateDeviceId()).toBe(first)
      expect(getOrCreateDeviceId()).toBe(first)
    })

    it('reads the id back from storage rather than minting a new one', () => {
      window.localStorage.setItem(STORAGE_KEY, 'preexisting-device-id')
      expect(getOrCreateDeviceId()).toBe('preexisting-device-id')
    })

    it('produces a different id for a different device', () => {
      const first = getOrCreateDeviceId()
      window.localStorage.clear()
      const second = getOrCreateDeviceId()

      expect(second).not.toBe(first)
    })

    it('uses the platform CSPRNG rather than Math.random', () => {
      const randomUUID = vi.spyOn(globalThis.crypto, 'randomUUID')
      getOrCreateDeviceId()

      expect(randomUUID).toHaveBeenCalled()
    })

    it('still produces a usable id when crypto.randomUUID is missing', () => {
      const original = globalThis.crypto.randomUUID
      // Older browsers, and plain-HTTP origins, expose no randomUUID.
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        value: undefined,
        configurable: true,
      })

      const id = getOrCreateDeviceId()
      expect(id).toMatch(/^[0-9a-f-]{36}$/)

      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        value: original,
        configurable: true,
      })
    })

    it('does not crash when localStorage is unavailable', () => {
      const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked')
      })

      expect(() => getOrCreateDeviceId()).not.toThrow()
      expect(getItem).toHaveBeenCalled()
      expect(setItem).toHaveBeenCalled()
    })
  })

  describe('collectDeviceFingerprint', () => {
    it('carries the device id, so two identical phones differ', () => {
      const fp = collectDeviceFingerprint()
      expect(fp.deviceId).toBe(getOrCreateDeviceId())
    })

    it('is stable across calls on the same device', () => {
      expect(collectDeviceFingerprint().deviceId)
        .toBe(collectDeviceFingerprint().deviceId)
    })

    it('differs from a device that has its own id', async () => {
      const thisPhone = collectDeviceFingerprint()
      window.localStorage.clear()
      const otherPhone = collectDeviceFingerprint()

      // Same browser attributes, different device identity — exactly the case
      // where a real fingerprint alone would let one phone impersonate another.
      expect(thisPhone.screenWidth).toBe(otherPhone.screenWidth)
      expect(thisPhone.deviceId).not.toBe(otherPhone.deviceId)
      expect(await hashDeviceFingerprint(thisPhone))
        .not.toBe(await hashDeviceFingerprint(otherPhone))
    })
  })

  describe('hashDeviceFingerprint', () => {
    it('produces a 64-character hex digest on a secure origin', async () => {
      const hash = await hashDeviceFingerprint(collectDeviceFingerprint())
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('does not throw on a plain-HTTP LAN where crypto.subtle is absent', async () => {
      const subtle = globalThis.crypto.subtle
      Object.defineProperty(globalThis.crypto, 'subtle', {
        value: undefined,
        configurable: true,
      })

      const hash = await hashDeviceFingerprint(collectDeviceFingerprint())
      expect(hash).toMatch(/^lan[0-9a-f]+/)
      expect(hash.length).toBeGreaterThan(0)

      Object.defineProperty(globalThis.crypto, 'subtle', {
        value: subtle,
        configurable: true,
      })
    })

    it('is deterministic on a plain-HTTP LAN, so the binding still holds', async () => {
      const subtle = globalThis.crypto.subtle
      Object.defineProperty(globalThis.crypto, 'subtle', {
        value: undefined,
        configurable: true,
      })

      const fingerprint = collectDeviceFingerprint()
      expect(await hashDeviceFingerprint(fingerprint))
        .toBe(await hashDeviceFingerprint(fingerprint))

      Object.defineProperty(globalThis.crypto, 'subtle', {
        value: subtle,
        configurable: true,
      })
    })
  })

  describe('createDeviceBinding', () => {
    it('returns a hash that matches the fingerprint it came from', async () => {
      const { fingerprint, fingerprintHash } = await createDeviceBinding()
      expect(fingerprintHash).toBe(await hashDeviceFingerprint(fingerprint))
    })

    it('gives a phone the same binding on its second login attempt', async () => {
      const first = await createDeviceBinding()
      const second = await createDeviceBinding()

      expect(second.fingerprintHash).toBe(first.fingerprintHash)
    })
  })
})
