/**
 * NEXUS — Device identity
 *
 * A player's device identity is created automatically the first time the app
 * runs on that device, stored in the browser, and reused on every later visit.
 * Nobody types it, nobody sees it, and it never changes underneath the player:
 * it is not a credential the Bureau hands out, it is the phone proving it is the
 * same phone.
 *
 * Two problems this file has to solve at once:
 *
 * 1. Uniqueness. Fingerprint attributes alone (model, screen size, browser) are
 *    not unique — two identical tablets in kiosk mode report the same values. So
 *    a random secret is generated once, kept in localStorage, and mixed into the
 *    hash. Each device is then distinct even when its attributes are not.
 *
 * 2. Stability. Deriving the identity only from attributes would break the
 *    binding after a browser update, since the user-agent string changes. The
 *    stored secret is what keeps the identity stable, which is exactly what
 *    device binding needs to survive a refresh, a navigation, or a re-login.
 *
 * At the event the phones are on the venue LAN over plain HTTP, where
 * `crypto.subtle` and `crypto.randomUUID` do not exist. Neither path may throw:
 * this file degrades to a documented non-cryptographic fallback rather than
 * leaving a player staring at a crashed login screen. The fallback is a
 * convenience for an unencrypted LAN, not a security boundary.
 */

export interface DeviceFingerprint {
  /** Stable per-device secret, generated once and then reused. */
  deviceId: string
  userAgent: string
  platform: string
  language: string
  cookieEnabled: boolean
  screenWidth: number
  screenHeight: number
  colorDepth: number
  timezoneOffset: number
  hasTouch: boolean
}

const DEVICE_ID_STORAGE_KEY = 'nexus.device-id.v1'

function hasSecureRandom(): boolean {
  return typeof globalThis.crypto?.getRandomValues === 'function'
}

/**
 * A random v4 UUID using the platform CSPRNG. Preferred path: `randomUUID` when
 * the browser has it, otherwise the same thing assembled from `getRandomValues`.
 */
function randomUuid(): string {
  const webCrypto = globalThis.crypto

  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID()
  }

  if (hasSecureRandom()) {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  // Insecure context with no Web Crypto at all. There is no way to make a
  // cryptographic secret here, and pretending otherwise would be worse than
  // saying so: this only has to be unique per device and stable afterwards.
  const entropy = [
    Date.now().toString(36),
    typeof performance !== 'undefined' ? performance.now().toString(36) : '',
    String(navigator?.hardwareConcurrency ?? 0),
    String(navigator?.userAgent ?? ''),
    String(navigator?.language ?? ''),
    String(Math.floor(new Date().getTimezoneOffset())),
  ].join('|')

  let hash = 0x811c9dc5
  for (let i = 0; i < entropy.length; i++) {
    hash ^= entropy.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  return `lan-${hash.toString(36)}-${Date.now().toString(36)}`
}

function readStoredDeviceId(): string | null {
  try {
    const stored = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY)
    return stored && stored.length > 0 ? stored : null
  } catch {
    // Private mode or a blocked store: the id is regenerated per load, which
    // costs a re-bind but never breaks the app.
    return null
  }
}

/**
 * The device's own id: generated once, then read back on every later visit.
 * Falls back to a per-session id when storage is unavailable, so login always
 * has something valid to send.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return randomUuid()
  }

  const stored = readStoredDeviceId()
  if (stored) return stored

  const deviceId = randomUuid()
  try {
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId)
  } catch {
    // Unusable storage: keep the freshly generated id for this session.
  }
  return deviceId
}

export function collectDeviceFingerprint(): DeviceFingerprint {
  if (typeof window === 'undefined') {
    return {
      deviceId: randomUuid(),
      userAgent: 'unknown',
      platform: 'unknown',
      language: 'en',
      cookieEnabled: false,
      screenWidth: 0,
      screenHeight: 0,
      colorDepth: 0,
      timezoneOffset: 0,
      hasTouch: false,
    }
  }

  return {
    deviceId: getOrCreateDeviceId(),
    userAgent: navigator.userAgent || 'unknown',
    platform: navigator.platform || 'unknown',
    language: navigator.language || 'en',
    cookieEnabled: navigator.cookieEnabled,
    screenWidth: window.screen?.width ?? 0,
    screenHeight: window.screen?.height ?? 0,
    colorDepth: window.screen?.colorDepth ?? 0,
    timezoneOffset: new Date().getTimezoneOffset(),
    hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  }
}

/**
 * FNV-1a, used only when `crypto.subtle` is missing (plain-HTTP LAN). It is
 * not a security primitive; it exists so that a phone on the venue network can
 * still log in instead of crashing.
 */
function weakHash(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return `lan${hash.toString(16).padStart(8, '0')}${input.length.toString(16)}`
}

export async function hashDeviceFingerprint(fingerprint: DeviceFingerprint): Promise<string> {
  const serialized = JSON.stringify(fingerprint)

  if (typeof globalThis.crypto?.subtle?.digest !== 'function') {
    return weakHash(serialized)
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(serialized)
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function createDeviceBinding(): Promise<{ fingerprint: DeviceFingerprint; fingerprintHash: string }> {
  const fingerprint = collectDeviceFingerprint()
  const hash = await hashDeviceFingerprint(fingerprint)
  return { fingerprint, fingerprintHash: hash }
}
