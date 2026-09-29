export const LOGIN_CODE_LENGTH = 8

export const LOGIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' as const

export function generateLoginCode(length: number = LOGIN_CODE_LENGTH): string {
  let result = ''
  const chars = LOGIN_CODE_CHARS
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length]
  }
  return result
}

export function validateLoginCodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') return false
  if (code.length !== LOGIN_CODE_LENGTH) return false
  return /^[A-Z2-9]+$/.test(code) && !/[IO01]/.test(code)
}
