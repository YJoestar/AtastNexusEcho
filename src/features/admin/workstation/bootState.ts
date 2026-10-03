/** Boot memory: once per session, and a shorter boot after the first ever. */
export const BOOTED_KEY = 'nexus_booted'
export const SEEN_KEY = 'nexus_boot_seen'

export function bootAlreadyShown(): boolean {
  try { return window.sessionStorage.getItem(BOOTED_KEY) === '1' } catch { return false }
}
