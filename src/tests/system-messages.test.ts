import { describe, expect, it } from 'vitest'
import { diffSnapshots, type StationSnapshot } from '@/features/admin/workstation/messages'

const base: StationSnapshot = { online: true, units: [{ code: 'A1', status: 'ACTIVE', node: 'P01' }, { code: 'B2', status: 'PAUSED', node: null }] }

describe('system messages come only from real changes', () => {
  it('says nothing about the first snapshot or an unchanged one', () => {
    expect(diffSnapshots(null, base)).toEqual([])
    expect(diffSnapshots(base, { ...base, units: base.units.map(unit => ({ ...unit })) })).toEqual([])
  })

  it('reports link loss and restoration', () => {
    expect(diffSnapshots(base, { ...base, online: false })).toEqual([{ tag: 'LINK', text: 'Carrier lost. Telemetry is stale.', tone: 'warn' }])
    expect(diffSnapshots({ ...base, online: false }, base)[0]).toMatchObject({ tag: 'LINK', tone: 'ok' })
  })

  it('reports a unit changing status or reaching a node, once', () => {
    const next: StationSnapshot = { online: true, units: [{ code: 'A1', status: 'ACTIVE', node: 'P02' }, { code: 'B2', status: 'ACTIVE', node: null }] }
    const messages = diffSnapshots(base, next).map(message => message.text)
    expect(messages).toEqual(['A1 at node P02.', 'B2 PAUSED → ACTIVE.'])
  })

  it('reports units appearing and disappearing', () => {
    const next: StationSnapshot = { online: true, units: [base.units[0], { code: 'C3', status: 'ACTIVE', node: null }] }
    expect(diffSnapshots(base, next).map(message => message.text)).toEqual(['Field unit C3 registered.', 'Field unit B2 removed.'])
  })
})
