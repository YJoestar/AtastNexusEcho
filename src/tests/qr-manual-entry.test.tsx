/**
 * The manual service port must not discard what the player typed.
 *
 * `submitCode` refuses a second lookup while one is in flight - correct, because
 * a camera held on one marker re-decodes it every 250ms and would otherwise spend
 * a Bureau round trip per frame. But the manual form fired the call and cleared
 * the field unconditionally, so a code typed while the camera's own lookup was
 * still open was thrown away: no lookup, no result, no message. The player
 * retyped the reference and watched it vanish again, which reads as "this code is
 * being rejected" rather than "the form is busy".
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PlayerQR } from '@/features/player/QR'

const scanQR = vi.fn()

vi.mock('@/hooks/useGameEngine', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useGameEngine')>('@/hooks/useGameEngine')
  return { ...actual, useGameEngine: () => ({ scanQR }) }
})

const connectionState = { isOffline: false }
vi.mock('@/hooks/useConnection', () => ({ useConnection: () => connectionState }))

vi.mock('@/contexts/QASimulatorContext', () => ({ QASimulatorContext: { isActive: false } }))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => { resolve = res })
  return { promise, resolve }
}

function renderScanner() {
  return render(<MemoryRouter><PlayerQR /></MemoryRouter>)
}

/** No jest-dom matchers in this suite, so read the controlled value directly. */
const manualValue = () => (screen.getByLabelText('Marker code') as HTMLInputElement).value

/** Open the collapsible manual-entry panel. */
async function openManualEntry() {
  fireEvent.click(screen.getByRole('button', { name: /SERVICE PORT \/ MANUAL ENTRY/i }))
}

async function submitManual(value: string) {
  const input = screen.getByLabelText('Marker code')
  await act(async () => {
    fireEvent.change(input, { target: { value } })
  })
  const form = input.closest('form')!
  await act(async () => {
    fireEvent.submit(form)
  })
}

beforeEach(() => {
  scanQR.mockReset()
  scanQR.mockResolvedValue({ discovered: true, nodeCode: 'P02' })
  connectionState.isOffline = false
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true, writable: true, value: { getUserMedia: vi.fn() },
  })
  Object.defineProperty(window, 'isSecureContext', { configurable: true, writable: true, value: true })
})

describe('manual entry', () => {
  it('clears the field once the code has actually been looked up', async () => {
    renderScanner()
    await openManualEntry()
    await submitManual('037-A-4821')

    await waitFor(() => expect(scanQR).toHaveBeenCalledWith('037-A-4821'))
    await waitFor(() => expect(manualValue()).toBe(''))
  })

  it('keeps the code and does not look it up while another lookup is open', async () => {
    const slow = deferred<{ discovered: boolean; nodeCode?: string }>()
    scanQR.mockReturnValueOnce(slow.promise)

    renderScanner()
    await openManualEntry()

    // The camera's own lookup is now open.
    await submitManual('FIRST-CODE')
    await waitFor(() => expect(scanQR).toHaveBeenCalledTimes(1))

    // A second manual submission arrives while it is still open.
    await submitManual('SECOND-CODE')
    expect(scanQR).toHaveBeenCalledTimes(1)
    // ...and the text the player typed is still there to try again.
    expect(manualValue()).toBe('SECOND-CODE')

    await act(async () => { slow.resolve({ discovered: true, nodeCode: 'P02' }) })
    await waitFor(() => expect(manualValue()).toBe(''))
    expect(scanQR).toHaveBeenCalledTimes(1)
  })
})
