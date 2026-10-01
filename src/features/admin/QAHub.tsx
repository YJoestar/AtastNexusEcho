/**
 * NEXUS — QA Simulator Hub
 *
 * Admin-only control panel for walking the full player experience end-to-end
 * in a safe, isolated in-memory simulation. No production teams, players,
 * scores, or progress are touched.
 *
 * When "Start Simulation" is pressed the hub launches an embedded player
 * viewport that reuses the unmodified production player screens. Role selection,
 * solve shortcuts, node jumping, and QA overrides are handled through the
 * QASimulatorContext, which the player screens consume transparently via
 * useApp() and useGameEngine().
 */

import { useState, useEffect, useRef } from 'react'
import { BureauIcons } from '@/components/bureau'
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLES } from '@/app/config'
import { ALL_PUZZLES } from '@/content/puzzles'
import { cn } from '@/lib/utils'
import { QASimulatorProvider, useQA } from '@/contexts/QASimulatorContext'
import type { Role, SimulationType } from '@/contexts/QASimulatorContext'
import { QAPlayerShell } from '@/features/admin/QAPlayerShell'

const SIMULATION_TYPES: { value: SimulationType; label: string; description: string }[] = [
  { value: 'FRESH', label: 'Fresh Start', description: 'No nodes solved — walk the progression from scratch' },
  { value: 'PARTIAL', label: 'Partial Progress', description: 'First 5 nodes solved — mid-game flow' },
  { value: 'COMPLETE', label: 'Near Complete', description: 'All nodes solved except final boss — both endings' },
  { value: 'CUSTOM', label: 'Custom State', description: 'Set your own starting progress' },
]

const DEVICE_PRESETS = [
  { key: 'desktop', label: 'Desktop', icon: BureauIcons.Monitor, width: 'w-full max-w-5xl' },
  { key: 'tablet', label: 'Tablet', icon: BureauIcons.Tablet, width: 'w-full max-w-2xl' },
  { key: 'mobile', label: 'Mobile', icon: BureauIcons.Smartphone, width: 'w-full max-w-sm' },
]

const ROLE_ICONS = {
  OBSERVER: BureauIcons.Eye,
  ANALYST: BureauIcons.Brain,
  OPERATOR: BureauIcons.Wrench,
}

function QAHubInner() {
  const qa = useQA()
  const [isStarted, setIsStarted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState<'controls' | 'inspector' | 'nodes'>('controls')
  const [devicePreset, setDevicePreset] = useState('desktop')
  const [nodeJumpInput, setNodeJumpInput] = useState('')

  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      qa.resetSimulation()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const solvedCount = qa.solvedNodes.size
  const totalNodes = ALL_PUZZLES.length

  const handleStart = () => {
    qa.setSimulationType(qa.simulationType)
    if (qa.simulationType === 'FRESH') {
      qa.resetSimulation()
    }
    setIsStarted(true)
  }

  const handleStop = () => {
    setIsStarted(false)
    qa.resetSimulation()
  }

  const handleSolveCurrent = () => {
    if (qa.currentNodeId && !qa.solvedNodes.has(qa.currentNodeId)) {
      qa.submitAnswer(qa.currentNodeId, 'simulation_answer').catch(() => {})
    }
  }

  const handleJumpToNode = () => {
    const code = nodeJumpInput.toUpperCase().trim()
    if (ALL_PUZZLES.some(p => p.code === code)) {
      qa.jumpToNode(code)
    }
    setNodeJumpInput('')
  }

  const handleRoleChange = (newRole: Role) => {
    qa.setRole(newRole)
  }

  const handleSimTypeChange = (type: SimulationType) => {
    qa.setSimulationType(type)
  }

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (!isStarted) {
    return (
      <div className="page">
        <div className="page-content max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="heading-2 text-nexus-text">Player Experience Simulator</h1>
              <p className="text-nexus-textMuted mt-1">
                QA harness for walking the full player flow in an isolated in-memory simulation.
                No production data is affected.
              </p>
            </div>
            <div className="text-xs text-nexus-textSubtle bg-nexus-surface px-3 py-1 rounded-lg">
              BETA
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="panel space-y-4">
                <h2 className="heading-4">Simulation Settings</h2>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-nexus-textMuted">Role</span>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {ROLES.map(r => {
                        const Icon = ROLE_ICONS[r]
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleRoleChange(r)}
                            className={cn(
                              'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                              qa.role === r
                                ? 'border-nexus-accent bg-nexus-accentBg/30 text-nexus-accent'
                                : 'border-nexus-border hover:border-nexus-borderHover bg-nexus-surfaceElevated',
                            )}
                          >
                            <Icon className="bureau-icon w-6 h-6" />
                            <span className="font-medium">{ROLE_LABELS[r]}</span>
                            <span className="text-xs text-nexus-textSubtle text-center">
                              {ROLE_DESCRIPTIONS[r]}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-nexus-textMuted">Starting State</span>
                    <div className="mt-2 space-y-2">
                      {SIMULATION_TYPES.map(type => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => handleSimTypeChange(type.value)}
                          className={cn(
                            'w-full text-left p-4 rounded-xl border transition-all',
                            qa.simulationType === type.value
                              ? 'border-nexus-accent bg-nexus-accentBg/30'
                              : 'border-nexus-border hover:border-nexus-borderHover bg-nexus-surfaceElevated',
                          )}
                        >
                          <div className="font-medium text-nexus-text">{type.label}</div>
                          <div className="text-sm text-nexus-textMuted mt-1">{type.description}</div>
                        </button>
                      ))}
                    </div>
                  </label>
                </div>
              </div>

              <button
                onClick={handleStart}
                className="btn-primary w-full py-4 text-lg gap-3"
              >
                <BureauIcons.Play className="bureau-icon w-5 h-5" />
                Start Simulation
              </button>
            </div>

            <div className="panel space-y-4">
              <h2 className="heading-4">QA Controls</h2>
              <p className="text-sm text-nexus-textMuted">
                These controls are available once simulation starts:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <BureauIcons.SkipForward className="bureau-icon w-4 h-4 text-nexus-accent mt-0.5" />
                  <span><strong>Advance Progression</strong> — Solve the next sequential node</span>
                </li>
                <li className="flex items-start gap-2">
                  <BureauIcons.Flag className="bureau-icon w-4 h-4 text-nexus-accent mt-0.5" />
                  <span><strong>Solve Current</strong> — Mark the active node as solved</span>
                </li>
                <li className="flex items-start gap-2">
                  <BureauIcons.Target className="bureau-icon w-4 h-4 text-nexus-accent mt-0.5" />
                  <span><strong>Jump to Node</strong> — Navigate to any node by code</span>
                </li>
                <li className="flex items-start gap-2">
                  <BureauIcons.RotateCcw className="bureau-icon w-4 h-4 text-nexus-accent mt-0.5" />
                  <span><strong>Reset Simulation</strong> — Clear all progress</span>
                </li>
                <li className="flex items-start gap-2">
                  <BureauIcons.WifiOff className="bureau-icon w-4 h-4 text-nexus-accent mt-0.5" />
                  <span><strong>Toggle Offline</strong> — Simulate connection loss</span>
                </li>
                <li className="flex items-start gap-2">
                  <BureauIcons.Lock className="bureau-icon w-4 h-4 text-nexus-accent mt-0.5" />
                  <span><strong>Toggle Lock</strong> — Simulate game lock state</span>
                </li>
              </ul>

              <div className="border-t border-nexus-border pt-4">
                <h3 className="font-medium text-nexus-text mb-2">Keyboard Shortcuts</h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-nexus-textMuted">Space</dt>
                    <dd className="text-nexus-text">Solve current node</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-nexus-textMuted">J</dt>
                    <dd className="text-nexus-text">Jump to node</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-nexus-textMuted">Ctrl+R</dt>
                    <dd className="text-nexus-text">Reset simulation</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-content max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="heading-2 text-nexus-text">Player Experience Simulator</h1>
          <div className="flex items-center gap-2">
            <select
              value={devicePreset}
              onChange={e => setDevicePreset(e.target.value)}
              className="form-select text-sm"
            >
              {DEVICE_PRESETS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
            <button
              onClick={handleFullscreen}
              className="btn-ghost touch-target-primary"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <BureauIcons.Minimize className="bureau-icon w-5 h-5" /> : <BureauIcons.Maximize className="bureau-icon w-5 h-5" />}
            </button>
            <button
              onClick={handleStop}
              className="btn-secondary touch-target-primary"
            >
              Stop Simulation
            </button>
          </div>
        </div>

        <div className="border-t border-nexus-border">
          <nav className="flex gap-4" role="tablist">
            <button
              onClick={() => setActiveTab('controls')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'controls'
                  ? 'border-nexus-accent text-nexus-accent'
                  : 'border-transparent text-nexus-textMuted hover:text-nexus-text',
              )}
            >
              QA Controls
            </button>
            <button
              onClick={() => setActiveTab('inspector')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'inspector'
                  ? 'border-nexus-accent text-nexus-accent'
                  : 'border-transparent text-nexus-textMuted hover:text-nexus-text',
              )}
            >
              Inspector
            </button>
            <button
              onClick={() => setActiveTab('nodes')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'nodes'
                  ? 'border-nexus-accent text-nexus-accent'
                  : 'border-transparent text-nexus-textMuted hover:text-nexus-text',
              )}
            >
              Node Index ({solvedCount}/{totalNodes})
            </button>
          </nav>

          <div className="p-4">
            {activeTab === 'controls' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <button
                  onClick={handleSolveCurrent}
                  disabled={!qa.currentNodeId || qa.solvedNodes.has(qa.currentNodeId!)}
                  className="btn-primary"
                >
                  <BureauIcons.Flag className="bureau-icon w-4 h-4" />
                  Solve Current
                </button>
                <button
                  onClick={qa.advanceProgression}
                  className="btn-secondary"
                >
                  <BureauIcons.SkipForward className="bureau-icon w-4 h-4" />
                  Advance Progression
                </button>
                <button
                  onClick={qa.toggleOffline}
                  className={cn(
                    'btn-ghost',
                    qa.isOffline && 'text-nexus-danger hover:bg-nexus-dangerBg/30',
                  )}
                >
                  {qa.isOffline ? <BureauIcons.WifiOff className="bureau-icon w-4 h-4" /> : <BureauIcons.Wifi className="bureau-icon w-4 h-4" />}
                  {qa.isOffline ? 'Online' : 'Offline Mode'}
                </button>
                <button
                  onClick={qa.toggleLock}
                  className={cn(
                    'btn-ghost',
                    qa.isLocked && 'text-nexus-warning hover:bg-nexus-warningBg/30',
                  )}
                >
                  {qa.isLocked ? <BureauIcons.Unlock className="bureau-icon w-4 h-4" /> : <BureauIcons.Lock className="bureau-icon w-4 h-4" />}
                  {qa.isLocked ? 'Unlock' : 'Lock Game'}
                </button>
              </div>
            )}

            {activeTab === 'controls' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="panel space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-nexus-textMuted">Role</span>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {ROLES.map(r => {
                        const Icon = ROLE_ICONS[r]
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleRoleChange(r)}
                            className={cn(
                              'flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                              qa.role === r
                                ? 'border-nexus-accent bg-nexus-accentBg/30 text-nexus-accent'
                                : 'border-nexus-border hover:border-nexus-borderHover',
                            )}
                          >
                            <Icon className="bureau-icon w-4 h-4" />
                            {ROLE_LABELS[r]}
                          </button>
                        )
                      })}
                    </div>
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nodeJumpInput}
                      onChange={e => setNodeJumpInput(e.target.value)}
                      placeholder="Node code (e.g. P15)"
                      className="flex-1 form-input text-sm"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleJumpToNode()
                        }
                      }}
                    />
                    <button
                      onClick={handleJumpToNode}
                      disabled={!nodeJumpInput.trim()}
                      className="btn-secondary"
                    >
                      <BureauIcons.Search className="bureau-icon w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={qa.resetSimulation}
                    className="btn-ghost w-full text-nexus-danger hover:bg-nexus-dangerBg/30"
                  >
                    <BureauIcons.RotateCcw className="bureau-icon w-4 h-4" />
                    Reset Simulation
                  </button>
                </div>

                <div className="panel space-y-3">
                  <h3 className="font-medium text-nexus-text">Status</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-nexus-textMuted">Role:</span>
                      <span className="text-nexus-text">{ROLE_LABELS[qa.role]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nexus-textMuted">Progress:</span>
                      <span className="text-nexus-text">{solvedCount}/{totalNodes} solved</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nexus-textMuted">Score:</span>
                      <span className="text-nexus-text font-mono">{qa.score.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nexus-textMuted">Current Node:</span>
                      <span className="text-nexus-text font-mono">{qa.currentNodeId ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nexus-textMuted">Connection:</span>
                      <span className={cn(qa.isOffline ? 'text-nexus-danger' : 'text-nexus-accent')}>
                        {qa.isOffline ? 'Offline' : 'Online'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nexus-textMuted">Game State:</span>
                      <span className={cn(qa.isLocked ? 'text-nexus-warning' : 'text-nexus-accent')}>
                        {qa.isLocked ? 'Locked' : 'Active'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'inspector' && (
              <div className="panel space-y-4">
                <h3 className="font-medium text-nexus-text">QASimulator Context Inspector</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <label className="text-nexus-textMuted">role</label>
                    <code className="block bg-nexus-surfaceElevated px-3 py-2 rounded text-xs mt-1 overflow-x-auto">
                      "{qa.role}"
                    </code>
                  </div>
                  <div>
                    <label className="text-nexus-textMuted">simulationType</label>
                    <code className="block bg-nexus-surfaceElevated px-3 py-2 rounded text-xs mt-1 overflow-x-auto">
                      "{qa.simulationType}"
                    </code>
                  </div>
                  <div>
                    <label className="text-nexus-textMuted">solvedNodes</label>
                    <code className="block bg-nexus-surfaceElevated px-3 py-2 rounded text-xs mt-1 overflow-x-auto">
                      [{Array.from(qa.solvedNodes).map(s => `"${s}"`).join(', ')}]
                    </code>
                  </div>
                  <div>
                    <label className="text-nexus-textMuted">currentNodeId</label>
                    <code className="block bg-nexus-surfaceElevated px-3 py-2 rounded text-xs mt-1">
                      {qa.currentNodeId ? `"${qa.currentNodeId}"` : 'null'}
                    </code>
                  </div>
                  <div>
                    <label className="text-nexus-textMuted">availableNodeIds</label>
                    <code className="block bg-nexus-surfaceElevated px-3 py-2 rounded text-xs mt-1 overflow-x-auto">
                      [{qa.availableNodeIds.map(s => `"${s}"`).join(', ')}]
                    </code>
                  </div>
                  <div>
                    <label className="text-nexus-textMuted">nodeProgress.length</label>
                    <code className="block bg-nexus-surfaceElevated px-3 py-2 rounded text-xs mt-1">
                      {qa.nodeProgress.length}
                    </code>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'nodes' && (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {ALL_PUZZLES.map(puzzle => {
                  const solved = qa.solvedNodes.has(puzzle.code)
                  const isCurrent = puzzle.code === qa.currentNodeId
                  return (
                    <div
                      key={puzzle.code}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border text-sm',
                        solved
                          ? 'border-nexus-accent bg-nexus-accentBg/20'
                          : isCurrent
                            ? 'border-nexus-info bg-nexus-infoBg/20'
                            : 'border-nexus-border bg-nexus-surfaceElevated',
                      )}
                    >
                      <div>
                        <span className="font-mono font-medium text-nexus-text">{puzzle.code}</span>
                        <span className="text-nexus-textMuted ml-2">— {puzzle.name}</span>
                        <span className="text-xs text-nexus-textSubtle">[{puzzle.type}]</span>
                      </div>
                      <button
                        onClick={() => qa.jumpToNode(puzzle.code)}
                        className="btn-ghost text-xs py-1"
                      >
                        Jump
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="border border-nexus-border rounded-xl overflow-hidden">
          <div className="bg-nexus-surfaceElevated px-4 py-2 border-b border-nexus-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-nexus-textMuted">
              <BureauIcons.Monitor className="bureau-icon w-4 h-4" />
              <span>Player View — {ROLE_LABELS[qa.role]} — {DEVICE_PRESETS.find(d => d.key === devicePreset)?.label ?? 'Desktop'}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-nexus-textSubtle">
              <BureauIcons.BarChart3 className="bureau-icon w-4 h-4" />
              <span>{solvedCount}/{totalNodes}</span>
            </div>
          </div>
          <div className={cn('mx-auto transition-all duration-300', DEVICE_PRESETS.find(d => d.key === devicePreset)?.width)}>
            <QAPlayerShell />
          </div>
        </div>

        {/* Global keyboard shortcuts */}
        <KeyboardShortcuts onSolve={handleSolveCurrent} onReset={qa.resetSimulation} />
      </div>
    </div>
  )
}

function KeyboardShortcuts({
  onSolve,
  onReset,
}: {
  onSolve: () => void
  onReset: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        onSolve()
      }
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault()
        onReset()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSolve, onReset])

  return null
}

export function QAHub() {
  return (
    <QASimulatorProvider>
      <QAHubInner />
    </QASimulatorProvider>
  )
}


