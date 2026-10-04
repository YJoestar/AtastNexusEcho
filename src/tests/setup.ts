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

// Mock canvas context for jsdom (used by map/minimap components)
const mockCanvasContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  rect: vi.fn(),
  setLineDash: vi.fn(),
  scale: vi.fn(),
  setTransform: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  measureText: vi.fn(() => ({ width: 0 })),
  canvas: { width: 0, height: 0 },
  font: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  textAlign: 'left',
  textBaseline: 'alphabetic',
  globalAlpha: 1,
}

HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext) as unknown as HTMLCanvasElement['getContext']
HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  toJSON: () => ({}),
}))

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