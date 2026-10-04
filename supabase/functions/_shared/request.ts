/**
 * NEXUS — request parsing and validation for edge functions
 *
 * Every function used `await req.json()` inside its try block, so a body that
 * was not JSON (or was `null`, or an array) surfaced as HTTP 500 "Internal
 * server error", and field types were never checked before reaching the
 * database. These helpers turn bad input into a 400 with a clear message.
 * Pure TypeScript, no Deno APIs, so it is unit-tested from the app's suite.
 */

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BadRequestError'
  }
}

/** The JSON body as a plain object. Anything else is the caller's mistake. */
export async function readJsonObject(req: Request): Promise<Record<string, unknown>> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    throw new BadRequestError('Request body must be valid JSON')
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestError('Request body must be a JSON object')
  }
  return body as Record<string, unknown>
}

export function requireString(value: unknown, field: string, max = 500): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestError(`${field} is required`)
  }
  if (value.length > max) {
    throw new BadRequestError(`${field} is too long`)
  }
  return value
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function requireUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw new BadRequestError(`${field} must be a valid id`)
  }
  return value
}

export function requireInteger(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new BadRequestError(`${field} must be a whole number from ${min} to ${max}`)
  }
  return value
}

export function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new BadRequestError(`${field} must be true or false`)
  }
  return value
}
