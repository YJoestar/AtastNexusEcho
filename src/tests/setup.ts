/**
 * NEXUS — Test Setup
 * Global test configuration
 */

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock crypto.randomUUID with proper UUID v4 format
// Also preserve crypto.subtle for Web Crypto API (used by hashDeviceFingerprint)
const originalCrypto = globalThis.crypto

function mockUUID(): string {
  const bytes = new Array(16)
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256)
  }
  // Set version (4) and variant bits per RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.map(b => b.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
}

Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: mockUUID,
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
    subtle: originalCrypto?.subtle ?? {
      async digest(algorithm: string, data: Uint8Array | ArrayBuffer): Promise<ArrayBuffer> {
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
        const nodeCrypto = (await import('crypto')).createHash(algorithm.toLowerCase())
        nodeCrypto.update(Buffer.from(bytes))
        const buf = nodeCrypto.digest()
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
      },
    },
  },
  writable: true,
  configurable: true,
})