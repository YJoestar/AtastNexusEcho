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
import { Link } from 'react-router-dom'
import { BureauIcons } from '@/components/bureau'
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLES, ROUTES } from '@/app/config'
import { ALL_PUZZLES, PUZZLES_BY_CODE } from '@/content/puzzles'
import { cn } from '@/lib/utils'
import { QASimulatorProvider, useQA } from '@/contexts/QASimulatorContext'
import type { Role, SimulationType } from '@/contexts/QASimulatorContext'
import type { NodeDetailPlayerView } from '@/types/game-engine'
import { QAPlayerShell, DUMMY_APP_CONTEXT } from '@/features/admin/QAPlayerShell'
import { SCAN_LOCATIONS, TEST_CODE, type ScanLocation } from '@/lib/qr'
import { PlayerEvidenceArchive } from '@/features/player/evidence/EvidenceArchive'
import { AppContext } from '@/app/providers/AppProvider'
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
  const [activeTab, setActiveTab] = useState<'evidence' | 'players' | 'qr' | 'nodes' | 'controls' | 'inspector'>('controls')
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
    qa.setCustomProgress({ simulationType: qa.simulationType })
    if (qa.simulationType === 'FRESH') {
      qa.jumpToNode('P01')
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
          <div>
            <p className="nx-eyebrow">Isolated memory / no production state</p>
            {/* The page title already belongs to the simulator header above;
                this is the section heading for the device under test. */}
            <h2 className="nx-title mt-1">Field device emulation</h2>
          </div>
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
              aria-label={isFullscreen ? 'EXIT DISPLAY OVERLAY' : 'ENGAGE DISPLAY OVERLAY'}
            >
              {isFullscreen ? <BureauIcons.Minimize className="bureau-icon w-5 h-5" /> : <BureauIcons.Maximize className="bureau-icon w-5 h-5" />}
            </button>
            <button
              onClick={handleStop}
              className="nexus-btn-secondary min-h-10 touch-target-primary"
            >
              [ TERMINATE SIMULATION ]
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
              CONTROL INTERLOCKS
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
              STATE INSPECTOR
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
              NODE REGISTER ({solvedCount}/{totalNodes})
            </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'qr'
                    ? 'border-nexus-accent text-nexus-accent'
                    : 'border-transparent text-nexus-textMuted hover:text-nexus-text',
                )}
              >
                 QR Inventory
              </button>
              <button
                onClick={() => setActiveTab('players')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'players'
                    ? 'border-nexus-accent text-nexus-accent'
                    : 'border-transparent text-nexus-textMuted hover:text-nexus-text',
                )}
              >
                PLAYERS
              </button>
              <button
                onClick={() => setActiveTab('evidence')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'evidence'
                    ? 'border-nexus-accent text-nexus-accent'
                    : 'border-transparent text-nexus-textMuted hover:text-nexus-text',
                )}
              >
                EVIDENCE REGISTER
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
                      placeholder="FIELD NODE CODE (E.G. P15)"
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

                {qa.currentNodeId && (
                  <PuzzleDetailViewer
                    nodeId={qa.currentNodeId}
                    role={qa.role}
                    getNode={qa.getNode}
                  />
                )}
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

            {activeTab === 'qr' && (
              <div className="space-y-4">
                <h3 className="font-medium text-nexus-text">
                  QR Code Inventory ({SCAN_LOCATIONS.length} total)
                </h3>
                <div className="text-sm text-nexus-textMuted mb-2">
                  All codes resolve through the unified validation pipeline.
                  Test code: <code className="font-mono">{TEST_CODE}</code> — always resolves to LOC-000 (maps to P01).
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-nexus-borderSubtle">
                        <th className="text-left py-2 px-3 font-medium text-nexus-textMuted">Loc ID</th>
                        <th className="text-left py-2 px-3 font-medium text-nexus-textMuted">Node</th>
                        <th className="text-left py-2 px-3 font-medium text-nexus-textMuted">Name</th>
                        <th className="text-center py-2 px-3 font-medium text-nexus-textMuted">Stage</th>
                        <th className="text-left py-2 px-3 font-medium text-nexus-textMuted">Building</th>
                        <th className="text-left py-2 px-3 font-medium text-nexus-textMuted">QR Payload</th>
                        <th className="text-left py-2 px-3 font-medium text-nexus-textMuted">Manual Code</th>
                        <th className="text-center py-2 px-3 font-medium text-nexus-textMuted">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SCAN_LOCATIONS.map((loc: ScanLocation) => (
                        <tr
                          key={loc.locationId}
                          className="border-b border-nexus-borderSubtle/30 hover:bg-nexus-surfaceElevated/30"
                        >
                          <td className="py-2 px-3">
                            <code className="font-mono text-xs text-nexus-accent">{loc.locationId}</code>
                          </td>
                          <td className="py-2 px-3">
                            <code className="font-mono text-xs">{loc.scanNodeId}</code>
                          </td>
                          <td className="py-2 px-3 text-nexus-textMuted">{loc.nodeName}</td>
                          <td className="py-2 px-3 text-center">{loc.nodeStage}</td>
                          <td className="py-2 px-3 text-nexus-textMuted">{loc.building}</td>
                          <td className="py-2 px-3">
                            <code className="font-mono text-xs text-nexus-textSubtle break-all">
                              {loc.qrPayload}
                            </code>
                          </td>
                          <td className="py-2 px-3">
                            <code className="font-mono text-xs text-nexus-textSubtle break-all">
                              {loc.manualCode}
                            </code>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded',
                              loc.resultType === 'TEST'
                                ? 'bg-nexus-infoBg/20 text-nexus-info'
                                : 'bg-nexus-accentBg/20 text-nexus-accent',
                            )}>
                              {loc.resultType}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'players' && (
              <div className="panel space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-nexus-text">Team Roster — QA Simulation Team</h3>
                  <span className="font-mono text-xs text-nexus-textSubtle">{qa.simulatedPlayers.length} players</span>
                </div>
                <div className="space-y-2">
                  {qa.simulatedPlayers.map((p, idx) => {
                    const Icon = ROLE_ICONS[p.role]
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-nexus-border bg-nexus-surfaceElevated">
                        <div className="flex-shrink-0">
                          <Icon className="bureau-icon w-5 h-5 text-nexus-accent" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-nexus-text">{p.displayName}</div>
                          <div className="text-xs text-nexus-textSubtle">ID: {p.id} — Joined: {new Date(p.joinedAt).toLocaleTimeString()}</div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded',
                            p.status === 'ACTIVE'
                              ? 'bg-nexus-accentBg/20 text-nexus-accent'
                              : 'bg-nexus-textMuted/20 text-nexus-textMuted',
                          )}>
                            {p.status}
                          </span>
                        </div>
                        {idx === 0 && p.role === qa.role && (
                          <div className="text-[0.8125rem] uppercase tracking-[0.14em] text-nexus-info">YOU</div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="border-t border-nexus-border pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-nexus-textMuted">Current Role:</span>
                    <span className="text-nexus-text font-medium">{ROLE_LABELS[qa.role]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nexus-textMuted">Current Node:</span>
                    <span className="text-nexus-text font-mono">{qa.currentNodeId ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nexus-textMuted">Available Nodes:</span>
                    <span className="text-nexus-text font-mono">{qa.availableNodeIds.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nexus-textMuted">Solved:</span>
                    <span className="text-nexus-text font-mono">{solvedCount}/{totalNodes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nexus-textMuted">Score:</span>
                    <span className="text-nexus-text font-mono">{qa.score.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'evidence' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-nexus-text">EVIDENCE REGISTER</h3>
                    <p className="mt-1 font-mono text-[0.75rem] uppercase text-nexus-textSubtle">
                      {qa.evidenceLabMode
                        ? 'SANDBOX MODE / ALL CATALOGED EVIDENCE VISIBLE'
                        : 'SIMULATION LAB / PROGRESSION-LIMITED EVIDENCE'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => qa.setEvidenceLabMode(!qa.evidenceLabMode)}
                      className={cn(
                        'min-h-9 border px-2 font-mono text-[0.75rem] uppercase transition-colors',
                        qa.evidenceLabMode
                          ? 'border-nexus-accent bg-nexus-accentBg/20 text-nexus-accent'
                          : 'border-nexus-border bg-nexus-surfaceElevated text-nexus-textSubtle hover:text-nexus-text',
                      )}
                    >
                      {qa.evidenceLabMode ? '[ SANDBOX: ON ]' : '[ SANDBOX: OFF ]'}
                    </button>
                    <Link to={ROUTES.ADMIN_EVIDENCE_REGISTER} className="min-h-9 border border-nexus-accent px-2 py-2 font-mono text-[0.75rem] uppercase text-nexus-accent">
                      [ OPEN FULL EVIDENCE LAB ]
                    </Link>
                  </div>
                </div>

                <div className="border border-nexus-borderSubtle bg-nexus-bg px-3 py-2 font-mono text-[0.75rem] uppercase text-nexus-textSubtle">
                  CASE {qa.team?.code ?? 'QA001'} / SIMULATION — {qa.inventory?.evidence.length ?? 0} EVIDENCE ITEMS / {qa.inventory?.fragments.length ?? 0} FRAGMENTS / {qa.inventory?.inventory.length ?? 0} INVENTORY
                </div>

                <AppContext.Provider value={{ ...DUMMY_APP_CONTEXT, team: qa.team ?? null }}>
                  <div className="-mx-2 -mb-2 max-h-[500px] overflow-y-auto">
                    <PlayerEvidenceArchive />
                  </div>
                </AppContext.Provider>
              </div>
            )}
          </div>
        </div>

        <div className="border border-nexus-border bg-nexus-surfaceElevated p-1">
          <div className="border border-nexus-borderSubtle">
          <div className="flex items-center justify-between gap-3 border-b border-nexus-border px-3 py-2">
            <div className="min-w-0 font-mono">
              <p className="text-[0.8125rem] uppercase tracking-[0.16em] text-nexus-textSubtle">PLAYER VIEW / FH-037 FIELD DEVICE EMULATION</p>
              <p className="mt-1 truncate text-xs font-bold text-nexus-text">{ROLE_LABELS[qa.role]} / {DEVICE_PRESETS.find(d => d.key === devicePreset)?.label ?? 'Desktop'} VIEWPORT</p>
            </div>
            <div className="shrink-0 text-right font-mono text-[0.8125rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
              <span className="block">LOCAL SIMULATION</span>
              <span className="mt-1 block text-nexus-accent">{solvedCount.toString().padStart(2, '0')} / {totalNodes} VERIFIED</span>
            </div>
          </div>
          <div className={cn('mx-auto border-x border-nexus-border bg-nexus-bg transition-all duration-300', DEVICE_PRESETS.find(d => d.key === devicePreset)?.width)}>
            <QAPlayerShell />
          </div>
          <div className="flex items-center justify-between border-t border-nexus-border px-3 py-1.5 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
            <span>PRODUCTION PLAYER SCREENS / ISOLATED GAME STATE</span>
            <span>NO LIVE TEAM DATA</span>
          </div>
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

interface PuzzleDetailViewerProps {
  nodeId: string
  role: Role
  getNode: (nodeId: string, role?: Role) => Promise<NodeDetailPlayerView | null>
}

function PuzzleDetailViewer({ nodeId, role, getNode }: PuzzleDetailViewerProps) {
  const [detail, setDetail] = useState<NodeDetailPlayerView | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      const result = await getNode(nodeId, role)
      if (!cancelled) setDetail(result)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [nodeId, role, getNode])

  const puzzle = PUZZLES_BY_CODE[nodeId]

  return (
    <div className="border-t border-nexus-border pt-4 space-y-3">
      <h4 className="font-mono text-xs uppercase tracking-[0.14em] text-nexus-textSubtle">
        CURRENT NODE DETAIL — {puzzle?.code ?? nodeId}
      </h4>
      {puzzle && (
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-nexus-textMuted">Title:</span>
            <span className="text-nexus-text">{puzzle.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-nexus-textMuted">Location:</span>
            <span className="text-nexus-text">{puzzle.location}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-nexus-textMuted">Type:</span>
            <span className="text-nexus-text">{puzzle.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-nexus-textMuted">Stage:</span>
            <span className="text-nexus-text">{puzzle.stage}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-nexus-textMuted">Prerequisites:</span>
            <span className="text-nexus-text font-mono">{puzzle.prerequisiteNodes.length > 0 ? puzzle.prerequisiteNodes.join(', ') : 'None'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-nexus-textMuted">Next Nodes:</span>
            <span className="text-nexus-text font-mono">{puzzle.nextNodes?.length ? puzzle.nextNodes.join(', ') : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-nexus-textMuted">Points:</span>
            <span className="text-nexus-text">{puzzle.points}</span>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-xs text-nexus-textSubtle">Loading puzzle content...</div>
      )}

      {detail && detail.roleContent && (
        <div className="space-y-3">
          <h5 className="font-mono text-[0.8125rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
            {role} ROLE CONTENT
          </h5>
          <div className="bg-nexus-surfaceElevated p-3 rounded border border-nexus-borderSubtle space-y-2 text-sm">
            <div>
              <span className="text-nexus-textMuted">Screen Title:</span>
              <span className="text-nexus-text ml-2">{detail.roleContent.screenTitle}</span>
            </div>
            <div>
              <span className="text-nexus-textMuted">Data Payload:</span>
              <div className="mt-1 text-nexus-text bg-nexus-bg p-2 rounded font-mono text-xs overflow-x-auto">
                {detail.roleContent.dataPayload}
              </div>
            </div>
            <div>
              <span className="text-nexus-textMuted">Task Prompt:</span>
              <div className="mt-1 text-nexus-text">{detail.roleContent.taskPrompt}</div>
            </div>
            {detail.roleContent.intermediateOutput && (
              <div>
                <span className="text-nexus-textMuted">Intermediate Output:</span>
                <div className="mt-1 text-nexus-text font-mono text-xs">
                  {detail.roleContent.intermediateOutput}
                </div>
              </div>
            )}
            {detail.roleContent.interactiveData && (
              <div>
                <span className="text-nexus-textMuted">Interactive Data:</span>
                <div className="mt-1 text-nexus-text font-mono text-xs bg-nexus-bg p-2 rounded overflow-x-auto">
                  {JSON.stringify(detail.roleContent.interactiveData)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {detail && detail.narrativeObjective && (
        <div>
          <h5 className="font-mono text-[0.8125rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
            Narrative Objective
          </h5>
          <p className="text-sm text-nexus-text mt-1">{detail.narrativeObjective}</p>
        </div>
      )}

      {detail && detail.coordinationChain && (
        <div>
          <h5 className="font-mono text-[0.8125rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
            Coordination Chain
          </h5>
          <div className="grid grid-cols-3 gap-2 text-xs mt-1">
            <div className="bg-nexus-surfaceElevated p-2 rounded border border-nexus-borderSubtle">
              <span className="text-nexus-textMuted">Observer:</span>
              <div className="text-nexus-text mt-1">{detail.coordinationChain.observerProduces}</div>
            </div>
            <div className="bg-nexus-surfaceElevated p-2 rounded border border-nexus-borderSubtle">
              <span className="text-nexus-textMuted">Analyst:</span>
              <div className="text-nexus-text mt-1">{detail.coordinationChain.analystTransforms}</div>
            </div>
            <div className="bg-nexus-surfaceElevated p-2 rounded border border-nexus-borderSubtle">
              <span className="text-nexus-textMuted">Operator:</span>
              <div className="text-nexus-text mt-1">{detail.coordinationChain.operatorExecutes}</div>
            </div>
          </div>
        </div>
      )}

      {detail && detail.failurePropagation && (
        <div>
          <h5 className="font-mono text-[0.8125rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
            Failure Propagation
          </h5>
          <div className="text-xs bg-nexus-surfaceElevated p-2 rounded border border-nexus-borderSubtle space-y-1">
            <div><span className="text-nexus-textMuted">Wrong Step:</span> {detail.failurePropagation.wrongStep}</div>
            <div><span className="text-nexus-textMuted">Consequence:</span> {detail.failurePropagation.consequence}</div>
            <div><span className="text-nexus-textMuted">Recovery:</span> {detail.failurePropagation.recoveryGuidance}</div>
          </div>
        </div>
      )}

      {detail && detail.locationClue && (
        <div>
          <h5 className="font-mono text-[0.8125rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
            Location Clue
          </h5>
          <div className="text-xs bg-nexus-surfaceElevated p-2 rounded border border-nexus-borderSubtle space-y-1">
            <div><span className="text-nexus-textMuted">Clue:</span> {detail.locationClue.clueText}</div>
            {detail.locationClue.solution && <div><span className="text-nexus-textMuted">Solution:</span> {detail.locationClue.solution}</div>}
            {detail.locationClue.nextPhysicalLocation && <div><span className="text-nexus-textMuted">Next Location:</span> {detail.locationClue.nextPhysicalLocation}</div>}
            {detail.locationClue.nextQrNode && <div><span className="text-nexus-textMuted">Next QR Node:</span> <span className="text-nexus-accent">{detail.locationClue.nextQrNode}</span></div>}
          </div>
        </div>
      )}

      {detail && detail.evidenceUnlocked && (
        <div>
          <h5 className="font-mono text-[0.8125rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
            Evidence Unlocked
          </h5>
          <div className="text-xs bg-nexus-surfaceElevated p-2 rounded border border-nexus-borderSubtle">
            <div className="font-medium text-nexus-text">{detail.evidenceUnlocked.title}</div>
            <div className="text-nexus-textMuted mt-1">{detail.evidenceUnlocked.content ? String(detail.evidenceUnlocked.content).substring(0, 200) + '...' : ''}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export function QAHub() {
  return (
    <QASimulatorProvider>
      <QAHubInner />
    </QASimulatorProvider>
  )
}


