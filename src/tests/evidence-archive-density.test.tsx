/**
 * The evidence archive is the one screen that can silently go wrong: every
 * control added per row is multiplied by however much material the team has
 * recovered. With a full CASE NX-037 archive that is 66 rows, so two extra
 * buttons per row is a hundred and thirty controls that were never asked for.
 *
 * This budget is measured against the real dev archive rather than asserted by
 * hand, so it fails the moment a row grows a second target again.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppProvider, AccessibilityProvider } from '@/app/providers'
import { QASimulatorProvider } from '@/contexts/QASimulatorContext'
import { PlayerEvidenceArchive } from '@/features/player/evidence/EvidenceArchive'
import { showcaseCatalog } from '@/lib/evidence/showcaseCatalog'

function renderArchive() {
  return render(
    <MemoryRouter>
      <AccessibilityProvider>
        <AppProvider>
          <QASimulatorProvider>
            <PlayerEvidenceArchive />
          </QASimulatorProvider>
        </AppProvider>
      </AccessibilityProvider>
    </MemoryRouter>,
  )
}

/** Every control a player can actually reach with pointer or keyboard. */
function interactiveCount(): number {
  return document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]').length
}

describe('evidence archive density', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('ships a full dev archive to measure against', () => {
    expect(showcaseCatalog().length).toBeGreaterThan(50)
  })

  it('keeps one target per row instead of three', async () => {
    renderArchive()

    const heading = await screen.findByRole('heading', { name: /Recovered material/i })

    const rows = document.querySelectorAll('.file-row')
    expect(rows.length).toBeGreaterThan(50)

    // The archive should cost barely more than one control per record, plus a
    // small fixed toolbar. Two hundred controls was the old behaviour.
    const interactive = interactiveCount()
    expect(interactive).toBeLessThan(rows.length + 30)

    // Sanity: the toolbar is still reachable, including comparison.
    expect(screen.getByRole('button', { name: /Compare two records/i })).toBeTruthy()
    expect(heading).toBeTruthy()
  })

  it('does not repeat a per-row placement or comparison control', async () => {
    renderArchive()
    await screen.findByRole('heading', { name: /Recovered material/i })

    // Placement and comparison now live in the record and in one tray.
    expect(screen.queryAllByRole('button', { name: /Place on table/i })).toHaveLength(0)
    expect(screen.queryAllByRole('button', { name: /^COMPARE$/i })).toHaveLength(0)
  })

  it('keeps the archive title at a readable page-heading size', async () => {
    renderArchive()
    const heading = await screen.findByRole('heading', { name: /Recovered material/i })

    // A page heading must not be styled smaller than ordinary body text.
    expect(heading.className).not.toMatch(/text-\[(0\.[0-7]\d*rem)\]/)
  })
})