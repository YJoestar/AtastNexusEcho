/**
 * NEXUS — Logic Code cipher (edge functions)
 *
 * A player's Logic Code has to be readable on the admin PC every time it is
 * looked at, but it must never exist in the database in the clear: it is both
 * a credential and that player's Supabase Auth password.
 *
 * So the code is stored encrypted with AES-GCM, and the key never leaves the
 * edge function's environment. The database only ever holds ciphertext, and
 * only an admin-authenticated bureau-operations call can turn it back into a
 * readable code.
 *
 * The key is derived from a server-only secret rather than being hard-coded, so
 * it is never in the repository. If the secret is ever rotated, previously
 * issued ciphers stop decrypting and the honest response is to re-issue that
 * player's code — never to fall back to storing it in the clear.
 *
 * Envelope: v1.<base64 iv>.<base64 ciphertext+tag>
 */

const CIPHER_VERSION = 'v1'
const IV_BYTES = 12
const KEY_CONTEXT = 'nexus:login-code-cipher:v1:'

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

// The return type is inferred on purpose. Annotating it as `Uint8Array` widens
// the buffer to ArrayBufferLike, which is not assignable to WebCrypto's
// BufferSource (ArrayBufferView<ArrayBuffer>) and so failed the type check at
// the decrypt call site. A locally allocated ArrayBuffer infers as
// Uint8Array<ArrayBuffer>, which WebCrypto accepts.
function fromBase64(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function deriveCipherKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!secret) {
    throw new Error('No server secret available to derive the Logic Code cipher key')
  }
  const material = new TextEncoder().encode(KEY_CONTEXT + secret)
  const digest = await crypto.subtle.digest('SHA-256', material)
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

/** Encrypt a code for storage. Never returns plaintext-containing output. */
export async function encryptLoginCode(code: string): Promise<string> {
  const key = await deriveCipherKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(code),
  )
  return `${CIPHER_VERSION}.${toBase64(iv)}.${toBase64(new Uint8Array(sealed))}`
}

/** Decrypt a stored code, or return null if it cannot be trusted. */
export async function decryptLoginCode(envelope: string | null): Promise<string | null> {
  if (!envelope) return null

  const parts = envelope.split('.')
  if (parts.length !== 3 || parts[0] !== CIPHER_VERSION) return null

  try {
    const key = await deriveCipherKey()
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(parts[1]) },
      key,
      fromBase64(parts[2]),
    )
    return new TextDecoder().decode(plain)
  } catch {
    // Wrong key version, tampered ciphertext, or a rotated secret. Callers
    // report "needs re-issue" rather than guessing.
    return null
  }
}
