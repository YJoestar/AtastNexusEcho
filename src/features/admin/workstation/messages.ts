/**
 * NEXUS ECHO — System messages
 *
 * Messages exist only when something real changed between two snapshots of
 * state the workstation already holds. No timers invent activity.
 */
export interface UnitSnapshot {
  code: string
  status: string
  node: string | null
}

export interface StationSnapshot {
  online: boolean
  units: UnitSnapshot[]
}

export interface SystemMessage {
  id: string
  tag: 'LINK' | 'FIELD' | 'ARCHIVE'
  text: string
  tone: 'ok' | 'warn' | 'info'
}

let counter = 0

export function diffSnapshots(prev: StationSnapshot | null, next: StationSnapshot): Array<Omit<SystemMessage, 'id'>> {
  if (!prev) return []
  const messages: Array<Omit<SystemMessage, 'id'>> = []
  if (prev.online !== next.online) {
    messages.push(next.online
      ? { tag: 'LINK', text: 'Carrier restored.', tone: 'ok' }
      : { tag: 'LINK', text: 'Carrier lost. Telemetry is stale.', tone: 'warn' })
  }
  const before = new Map(prev.units.map(unit => [unit.code, unit]))
  for (const unit of next.units) {
    const old = before.get(unit.code)
    if (!old) {
      messages.push({ tag: 'ARCHIVE', text: `Field unit ${unit.code} registered.`, tone: 'info' })
    } else if (old.status !== unit.status) {
      messages.push({ tag: 'FIELD', text: `${unit.code} ${old.status} → ${unit.status}.`, tone: unit.status === 'ACTIVE' ? 'ok' : 'info' })
    } else if (old.node !== unit.node && unit.node) {
      messages.push({ tag: 'FIELD', text: `${unit.code} at node ${unit.node}.`, tone: 'info' })
    }
  }
  const after = new Set(next.units.map(unit => unit.code))
  for (const unit of prev.units) {
    if (!after.has(unit.code)) messages.push({ tag: 'ARCHIVE', text: `Field unit ${unit.code} removed.`, tone: 'warn' })
  }
  return messages
}

export function withIds(messages: Array<Omit<SystemMessage, 'id'>>): SystemMessage[] {
  return messages.map(message => ({ ...message, id: `m${++counter}` }))
}
