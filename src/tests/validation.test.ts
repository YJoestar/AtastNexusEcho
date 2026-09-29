/**
 * NEXUS — Validation Schema Tests
 */

import { describe, it, expect } from 'vitest'
import {
  roleSchema,
  teamStatusSchema,
  gameStatusSchema,
  puzzleTypeSchema,
  puzzleStageSchema,
  submissionResultSchema,
  teamSchema,
  playerSchema,
  puzzleNodeSchema,
  submissionSchema,
  evidenceSchema,
  inventoryItemSchema,
  fragmentSchema,
  qrNodeSchema,
  teamProgressSchema,
  notificationSchema,
  gameEventSchema,
  adminActionSchema,
} from '@/lib/validation'

describe('Validation Schemas', () => {
  describe('roleSchema', () => {
    it('accepts valid roles', () => {
      expect(roleSchema.parse('OBSERVER')).toBe('OBSERVER')
      expect(roleSchema.parse('ANALYST')).toBe('ANALYST')
      expect(roleSchema.parse('OPERATOR')).toBe('OPERATOR')
    })

    it('rejects invalid roles', () => {
      expect(() => roleSchema.parse('INVALID')).toThrow()
      expect(() => roleSchema.parse('observer')).toThrow()
    })
  })

  describe('teamStatusSchema', () => {
    it('accepts valid statuses', () => {
      expect(teamStatusSchema.parse('REGISTERED')).toBe('REGISTERED')
      expect(teamStatusSchema.parse('ACTIVE')).toBe('ACTIVE')
      expect(teamStatusSchema.parse('COMPLETED')).toBe('COMPLETED')
    })

    it('rejects invalid statuses', () => {
      expect(() => teamStatusSchema.parse('INVALID')).toThrow()
    })
  })

  describe('gameStatusSchema', () => {
    it('accepts valid statuses', () => {
      expect(gameStatusSchema.parse('NOT_STARTED')).toBe('NOT_STARTED')
      expect(gameStatusSchema.parse('RUNNING')).toBe('RUNNING')
      expect(gameStatusSchema.parse('ENDED')).toBe('ENDED')
    })
  })

  describe('puzzleTypeSchema', () => {
    it('accepts all puzzle types', () => {
      expect(puzzleTypeSchema.parse('OBSERVATION')).toBe('OBSERVATION')
      expect(puzzleTypeSchema.parse('META')).toBe('META')
      expect(puzzleTypeSchema.parse('FINAL')).toBe('FINAL')
    })
  })

  describe('puzzleStageSchema', () => {
    it('accepts all stages', () => {
      expect(puzzleStageSchema.parse('LOCKED')).toBe('LOCKED')
      expect(puzzleStageSchema.parse('SOLVED')).toBe('SOLVED')
      expect(puzzleStageSchema.parse('SKIPPED')).toBe('SKIPPED')
    })
  })

  describe('submissionResultSchema', () => {
    it('accepts all results', () => {
      expect(submissionResultSchema.parse('CORRECT')).toBe('CORRECT')
      expect(submissionResultSchema.parse('INCORRECT')).toBe('INCORRECT')
      expect(submissionResultSchema.parse('RATE_LIMITED')).toBe('RATE_LIMITED')
    })
  })

  describe('teamSchema', () => {
    const validTeam = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'ALPHA SQUAD',
      code: 'ALP123',
      status: 'ACTIVE',
      createdAt: '2026-09-29T12:00:00.000Z',
      startedAt: '2026-09-29T12:15:00.000Z',
      completedAt: null,
      currentNodeId: '550e8400-e29b-41d4-a716-446655440001',
      score: 2500,
      metadata: {
        registeredBy: 'PLAYER',
        assignedRoles: true,
      },
    }

    it('accepts valid team', () => {
      expect(teamSchema.parse(validTeam)).toEqual(validTeam)
    })

    it('rejects invalid code format', () => {
      expect(() => teamSchema.parse({ ...validTeam, code: 'abc123' })).toThrow()
      expect(() => teamSchema.parse({ ...validTeam, code: 'TOOLONG' })).toThrow()
    })

    it('rejects invalid UUID', () => {
      expect(() => teamSchema.parse({ ...validTeam, id: 'not-a-uuid' })).toThrow()
    })
  })

  describe('playerSchema', () => {
    const validPlayer = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      teamId: '550e8400-e29b-41d4-a716-446655440001',
      role: 'OBSERVER',
      displayName: 'Alex Chen',
      joinedAt: '2026-09-29T12:00:00.000Z',
      isConnected: true,
      lastSeenAt: '2026-09-29T12:30:00.000Z',
    }

    it('accepts valid player', () => {
      expect(playerSchema.parse(validPlayer)).toEqual(validPlayer)
    })

    it('rejects invalid role', () => {
      expect(() => playerSchema.parse({ ...validPlayer, role: 'INVALID' })).toThrow()
    })

    it('rejects empty display name', () => {
      expect(() => playerSchema.parse({ ...validPlayer, displayName: '' })).toThrow()
    })

    it('rejects too long display name', () => {
      expect(() => playerSchema.parse({ ...validPlayer, displayName: 'a'.repeat(31) })).toThrow()
    })
  })

  describe('puzzleNodeSchema', () => {
    const validNode = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      code: 'NODE-01',
      title: 'First Puzzle',
      type: 'OBSERVATION',
      difficulty: 2,
      estimatedMinutes: 15,
      position: { x: 100, y: 200, layer: 0 },
      prerequisites: [],
      branches: [],
      content: {
        shared: {
          title: 'First Puzzle',
          description: 'Find the hidden code',
          assets: [],
        },
      },
      rewards: {
        score: 100,
        evidence: [],
        inventory: [],
        fragments: [],
        unlocks: ['550e8400-e29b-41d4-a716-446655440001'],
        storyEvents: [],
      },
      metadata: {
        author: 'System',
        createdAt: '2026-09-29T12:00:00.000Z',
        updatedAt: '2026-09-29T12:00:00.000Z',
        version: 1,
        tags: ['tutorial'],
        isMeta: false,
        isFinal: false,
      },
    }

    it('accepts valid puzzle node', () => {
      expect(puzzleNodeSchema.parse(validNode)).toEqual(validNode)
    })

    it('rejects difficulty out of range', () => {
      expect(() => puzzleNodeSchema.parse({ ...validNode, difficulty: 0 })).toThrow()
      expect(() => puzzleNodeSchema.parse({ ...validNode, difficulty: 6 })).toThrow()
    })

    it('rejects invalid type', () => {
      expect(() => puzzleNodeSchema.parse({ ...validNode, type: 'INVALID' })).toThrow()
    })
  })

  describe('submissionSchema', () => {
    const validSubmission = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      teamId: '550e8400-e29b-41d4-a716-446655440001',
      playerId: '550e8400-e29b-41d4-a716-446655440002',
      nodeId: '550e8400-e29b-41d4-a716-446655440003',
      role: 'OBSERVER',
      answer: 'SECRET123',
      result: 'CORRECT',
      submittedAt: '2026-09-29T12:30:00.000Z',
      validatedAt: '2026-09-29T12:30:05.000Z',
      attempts: 1,
      timeSpentSeconds: 180,
    }

    it('accepts valid submission', () => {
      expect(submissionSchema.parse(validSubmission)).toEqual(validSubmission)
    })

    it('rejects answer too long', () => {
      expect(() => submissionSchema.parse({ ...validSubmission, answer: 'a'.repeat(501) })).toThrow()
    })

    it('rejects invalid result', () => {
      expect(() => submissionSchema.parse({ ...validSubmission, result: 'INVALID' })).toThrow()
    })
  })

  describe('evidenceSchema', () => {
    const validEvidence = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      code: 'EVD-001',
      title: 'Classified Document',
      description: 'A secret document found in the archive',
      type: 'DOCUMENT',
      classification: 'CLASSIFIED',
      content: {
        primaryAsset: {
          id: 'asset-1',
          type: 'DOCUMENT',
          url: 'https://example.com/doc.pdf',
        },
        supportingAssets: [],
      },
      metadata: {
        sourceNodeId: '550e8400-e29b-41d4-a716-446655440001',
        discoveredAt: '2026-09-29T12:30:00.000Z',
        discoveredByRole: 'OBSERVER',
        tags: ['document', 'archive'],
        isShareable: true,
      },
    }

    it('accepts valid evidence', () => {
      expect(evidenceSchema.parse(validEvidence)).toEqual(validEvidence)
    })

    it('rejects invalid classification', () => {
      expect(() => evidenceSchema.parse({ ...validEvidence, classification: 'INVALID' })).toThrow()
    })
  })

  describe('inventoryItemSchema', () => {
    const validItem = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      code: 'ITEM-001',
      name: 'Master Key',
      description: 'Opens any standard lock',
      type: 'KEY',
      rarity: 'RARE',
      properties: { material: 'titanium' },
      uses: [{
        action: 'unlock',
        targetType: 'NODE',
        targetId: 'node-1',
        consumesItem: false,
      }],
      metadata: {
        acquiredAt: '2026-09-29T12:30:00.000Z',
        acquiredByRole: 'OPERATOR',
        isTransferable: true,
        maxStack: 1,
      },
    }

    it('accepts valid inventory item', () => {
      expect(inventoryItemSchema.parse(validItem)).toEqual(validItem)
    })

    it('rejects invalid rarity', () => {
      expect(() => inventoryItemSchema.parse({ ...validItem, rarity: 'INVALID' })).toThrow()
    })
  })

  describe('fragmentSchema', () => {
    const validFragment = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      code: 'FRG-001',
      label: 'Fragment Alpha',
      content: 'X7K9',
      type: 'CIPHER',
      puzzleNodeId: '550e8400-e29b-41d4-a716-446655440001',
      role: 'ANALYST',
      position: 0,
      metadata: {
        isRevealed: true,
        revealedAt: '2026-09-29T12:30:00.000Z',
        revealedByRole: 'ANALYST',
        dependencies: [],
      },
    }

    it('accepts valid fragment', () => {
      expect(fragmentSchema.parse(validFragment)).toEqual(validFragment)
    })

    it('rejects invalid type', () => {
      expect(() => fragmentSchema.parse({ ...validFragment, type: 'INVALID' })).toThrow()
    })
  })

  describe('qrNodeSchema', () => {
    const validQR = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      code: 'QR-START',
      label: 'Starting Point',
      type: 'START',
      puzzleNodeId: null,
      position: { x: 100, y: 200, floor: 0 },
      metadata: {
        isActive: true,
        scannedBy: [],
        firstScannedAt: null,
        lastScannedAt: null,
      },
    }

    it('accepts valid QR node', () => {
      expect(qrNodeSchema.parse(validQR)).toEqual(validQR)
    })

    it('rejects invalid type', () => {
      expect(() => qrNodeSchema.parse({ ...validQR, type: 'INVALID' })).toThrow()
    })
  })

  describe('teamProgressSchema', () => {
    const validProgress = {
      teamId: '550e8400-e29b-41d4-a716-446655440000',
      solvedNodes: {},
      currentNodeId: '550e8400-e29b-41d4-a716-446655440001',
      availableNodeIds: ['550e8400-e29b-41d4-a716-446655440001'],
      evidenceOwned: ['EVD-001'],
      inventoryOwned: { 'ITEM-001': 1 },
      fragmentsOwned: ['FRG-001'],
      score: 100,
      hintsUsed: 0,
      hintsAvailable: 3,
      timeElapsedMinutes: 30,
      timeRemainingMinutes: 150,
      startedAt: '2026-09-29T12:00:00.000Z',
      lastActivityAt: '2026-09-29T12:30:00.000Z',
      metadata: {
        branchPath: [],
        skippedNodes: [],
        roleActions: { OBSERVER: 5, ANALYST: 3, OPERATOR: 2 },
        specialAchievements: [],
      },
    }

    it('accepts valid team progress', () => {
      expect(teamProgressSchema.parse(validProgress)).toEqual(validProgress)
    })
  })

  describe('notificationSchema', () => {
    const validNotification = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      teamId: '550e8400-e29b-41d4-a716-446655440001',
      targetRoles: ['OBSERVER', 'ANALYST'],
      type: 'PUZZLE_SOLVED',
      title: 'Puzzle Solved!',
      message: 'NODE-01 has been completed',
      priority: 'NORMAL',
      isRead: false,
      createdAt: '2026-09-29T12:30:00.000Z',
      readAt: null,
    }

    it('accepts valid notification', () => {
      expect(notificationSchema.parse(validNotification)).toEqual(validNotification)
    })

    it('accepts ALL target', () => {
      expect(notificationSchema.parse({ ...validNotification, targetRoles: 'ALL' })).toEqual({
        ...validNotification,
        targetRoles: 'ALL',
      })
    })
  })

  describe('gameEventSchema', () => {
    const validEvent = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'TEAM_STARTED',
      timestamp: '2026-09-29T12:00:00.000Z',
      teamId: '550e8400-e29b-41d4-a716-446655440001',
      playerId: '550e8400-e29b-41d4-a716-446655440002',
      nodeId: null,
      payload: { teamCode: 'ALP123' },
    }

    it('accepts valid game event', () => {
      expect(gameEventSchema.parse(validEvent)).toEqual(validEvent)
    })

    it('rejects invalid event type', () => {
      expect(() => gameEventSchema.parse({ ...validEvent, type: 'INVALID' })).toThrow()
    })
  })

  describe('adminActionSchema', () => {
    const validAction = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      adminId: 'bureau',
      type: 'TEAM_START',
      targetTeamId: '550e8400-e29b-41d4-a716-446655440001',
      targetPlayerId: null,
      targetNodeId: null,
      payload: { teamCode: 'ALP123' },
      reason: 'Starting game for team',
      createdAt: '2026-09-29T12:00:00.000Z',
      revertedAt: null,
      revertedBy: null,
    }

    it('accepts valid admin action', () => {
      expect(adminActionSchema.parse(validAction)).toEqual(validAction)
    })

    it('rejects empty reason', () => {
      expect(() => adminActionSchema.parse({ ...validAction, reason: '' })).toThrow()
    })

    it('rejects reason too long', () => {
      expect(() => adminActionSchema.parse({ ...validAction, reason: 'a'.repeat(501) })).toThrow()
    })
  })
})