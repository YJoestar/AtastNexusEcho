/**
 * Device settings are a player-facing contract, not a styling detail: the
 * values here change what every other screen renders, and they have to
 * survive a reload. These tests pin the publication of those values to the
 * document, the persistence of an explicit choice, and the fact that a
 * screen player who cannot see can still operate the controls.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AccessibilityProvider, useAccessibility } from '@/app/providers'
import { PlayerAccessibility } from '@/features/player/Accessibility'
import { QASimulatorProvider } from '@/contexts/QASimulatorContext'
import { AppProvider } from '@/app/providers'

const STORAGE_KEY = 'nexus_accessibility'

function renderSettings(options: { withPlayer?: boolean } = {}) {
  const { withPlayer = true } = options
  return render(
    <MemoryRouter>
      <AccessibilityProvider>
        <AppProvider>{withPlayer ? <QASimulatorProvider><PlayerAccessibility /></QASimulatorProvider> : <PlayerAccessibility />}</AppProvider>
      </AccessibilityProvider>
    </MemoryRouter>,
  )
}

/** Reads the attributes the stylesheet actually keys off. */
function published() {
  return {
    scale: document.documentElement.dataset.uiScale,
    contrast: document.documentElement.dataset.contrast,
    motion: document.documentElement.dataset.motion,
    transparency: document.documentElement.dataset.transparency,
  }
}

describe('device settings', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-ui-scale')
    document.documentElement.removeAttribute('data-contrast')
    document.documentElement.removeAttribute('data-motion')
    document.documentElement.removeAttribute('data-transparency')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('publishes defaults to the document so CSS can act on them', () => {
    renderSettings()
    expect(published()).toEqual({
      scale: 'standard',
      contrast: 'standard',
      motion: 'full',
      transparency: 'full',
    })
  })

  it('re-scales the whole interface when a larger text size is chosen', () => {
    renderSettings()

    fireEvent.click(screen.getByRole('radio', { name: 'Largest' }))

    // The scale itself lives in the stylesheet, keyed off this attribute.
    expect(published().scale).toBe('xlarge')
  })

  it('re-points the palette for high contrast', () => {
    renderSettings()

    fireEvent.click(screen.getByRole('radio', { name: /High contrast/ }))

    expect(published().contrast).toBe('boost')
  })

  it('collapses motion without dropping any state change', () => {
    renderSettings()

    fireEvent.click(screen.getByRole('radio', { name: /Reduced motion/ }))

    expect(published().motion).toBe('reduced')
  })

  it('remembers an explicit choice across a reload', () => {
    const { unmount } = renderSettings()
    fireEvent.click(screen.getByRole('radio', { name: /High contrast/ }))
    fireEvent.click(screen.getByRole('radio', { name: 'Large' }))
    unmount()

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      contrast: 'boost',
      scale: 'large',
    })

    renderSettings()
    expect(published()).toMatchObject({ contrast: 'boost', scale: 'large' })
  })

  it('groups every control under a named group a player can navigate', () => {
    renderSettings()

    for (const name of ['Text size', 'Contrast', 'Motion', 'Transparency']) {
      const group = screen.getByRole('radiogroup', { name })
      expect(within(group).getAllByRole('radio').length).toBeGreaterThan(1)
    }
  })

  it('restores defaults without discarding the chosen text size', () => {
    renderSettings()

    fireEvent.click(screen.getByRole('radio', { name: 'Largest' }))
    fireEvent.click(screen.getByRole('radio', { name: /High contrast/ }))
    fireEvent.click(screen.getByRole('radio', { name: /Reduced motion/ }))
    fireEvent.click(screen.getByRole('button', { name: /Restore defaults/ }))

    expect(published()).toMatchObject({ scale: 'xlarge', contrast: 'standard', motion: 'full' })
  })

  it('reaches settings before sign-in, so legibility never requires an account', () => {
    // No simulator, no session: the screen must still be fully operable.
    renderSettings({ withPlayer: false })

    expect(screen.getByRole('heading', { name: /Display/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Back to sign in/ })).toBeTruthy()

    // And the controls still work with no account behind them.
    fireEvent.click(screen.getByRole('radio', { name: /High contrast/ }))
    expect(published().contrast).toBe('boost')
  })
})

describe('accessibility hook', () => {
  it('fails loudly when used outside the provider', () => {
    const Consumer = () => {
      useAccessibility()
      return null
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow(/AccessibilityProvider/)
    spy.mockRestore()
  })
})
