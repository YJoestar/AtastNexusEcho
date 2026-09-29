export interface DeviceFingerprint {
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

export function collectDeviceFingerprint(): DeviceFingerprint {
  if (typeof window === 'undefined') {
    return {
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

export async function hashDeviceFingerprint(fingerprint: DeviceFingerprint): Promise<string> {
  const serialized = JSON.stringify(fingerprint)
  const encoder = new TextEncoder()
  const data = encoder.encode(serialized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function createDeviceBinding(): Promise<{ fingerprint: DeviceFingerprint; fingerprintHash: string }> {
  const fingerprint = collectDeviceFingerprint()
  const hash = await hashDeviceFingerprint(fingerprint)
  return { fingerprint, fingerprintHash: hash }
}
