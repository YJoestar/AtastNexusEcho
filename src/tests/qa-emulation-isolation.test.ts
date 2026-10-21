/**
 * NEXUS — Field Device Emulation: isolation audit.
 *
 * The emulation's whole value is that a tester can walk any case, any role,
 * any state without touching production. That claim is a property of the
 * source, not of a runtime flag, so it is checked here against the real module.
 *
 * What "isolated" means, precisely:
 *
 *  - The simulator writes nothing anywhere. Its only outbound calls are two
 *    read-only admin lookups (`list-puzzle-qa`, `list-qr-codes`); scores,
 *    progress, hints, completions and timing stay in React state.
 *  - Player, team and session identities are synthetic constants, never a real
 *    player or team id.
 *  - No service-role key or privileged client is reachable from this module.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '../..')
const SOURCE = readFileSync(join(ROOT, 'src/contexts/QASimulatorContext.tsx'), 'utf8')

describe('Field Device Emulation — isolation', () => {
  it('performs no writes against any remote surface', () => {
    // Any mutating verb against supabase/gameAPI/adminAPI would break isolation.
    const offenders = [
      /gameAPI\./,
      /supabase\s*\.\s*from\s*\(/,
      /supabase\s*\.\s*rpc\s*\(/,
      /functions\s*\.\s*invoke\s*\(/,
      /adminAPI\s*\.\s*(?!listPuzzleQA|listQRCodes)\w+/,
    ]
    for (const pattern of offenders) {
      expect(SOURCE, `emulation source matches ${pattern}`).not.toMatch(pattern)
    }
  })

  it('only ever reads the two admin catalogs it needs', () => {
    const calls = [...SOURCE.matchAll(/adminAPI\.(\w+)\(/g)].map(m => m[1]).sort()
    expect(calls).toEqual(['listPuzzleQA', 'listQRCodes'])
  })

  it('uses synthetic player and team identities', () => {
    expect(SOURCE).toMatch(/id:\s*'qa-player'/)
    expect(SOURCE).toMatch(/teamId:\s*'qa-team'/)
    // A real uuid leaking in would mean a production id was captured.
    const uuidLiteral = /['"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['"]/i
    expect(SOURCE).not.toMatch(uuidLiteral)
  })

  it('never mentions a service-role key', () => {
    expect(SOURCE).not.toMatch(/service[_-]?role/i)
    expect(SOURCE).not.toMatch(/SERVICE_ROLE_KEY/)
  })
})
