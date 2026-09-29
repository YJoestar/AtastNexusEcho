/**
 * NEXUS — Meta Puzzles
 * M01, M02, M03, M04 — Stage-level meta puzzles that synthesize feeder answers.
 */

import type { PuzzleNode } from '../../../types/game-engine'

export const META_PUZZLES: PuzzleNode[] = [
  {
    id: 'M01',
    code: 'M01',
    name: 'The First Lock',
    stage: 1,
    type: 'META',
    difficulty: 4,
    time: '12m',
    location: '[ADMIN BUILDING] — Central Archive',
    feeds: 'P01 P02 P03 P04 P05',
    unlocks: 'P06',
    acceptedAnswer: 'LIGHT',
    validationMethod: 'case_insensitive',
    narrativeObjective: 'Synthesize all Stage 1 answers into the meta solution.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Stage 1 Answer Aggregator',
      dataPayload: 'STAGE 1 ANSWERS: CDFDEFF | 21:47 | 3425 | F | VEY',
      visualType: 'meta',
      interactiveData: {
        answers: ['CDFDEFF', '21:47', '3425', 'F', 'VEY'],
        hint: 'Take the first letter of each answer.',
      },
      whatTheySee:
        'A terminal showing the 5 Stage 1 answers: CDFDEFF, 21:47, 3425, F, VEY.',
      taskPrompt: 'Read all five answers.',
      intermediateOutput: 'First letters: C, 2, 3, F, V',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Meta Key Extractor',
      dataPayload: 'EXTRACTION: First letters: C, (skip non-alpha), F, V. Alphabet positions: C=3, F=6, V=22. Pattern: 3-6-22. Convert to ASCII: 3=L, 6=F, 22=V. Or: use the symbol meanings.',
      whatTheySee:
        'Calculator showing various extraction patterns.',
      taskPrompt:
        'What concept do the Stage 1 answers collectively point to? All relate to illumination, visibility, or light.',
      intermediateOutput: 'LIGHT',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Meta Unlock Terminal',
      dataPayload: 'META KEY: [ _ _ _ _ _ ]',
      whatTheySee: 'Five-letter terminal.',
      taskPrompt: 'Submit the meta concept.',
      intermediateOutput: 'Submit: LIGHT',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows the execution interface for M01.',
      operatorTaskDescription:
        'All Stage 1 answers relate to illumination/visibility. The Observer aggregates the answers. The Analyst extracts the meta concept. The Operator submits.',
      requiredDiscoveries: {
        observerDiscovery: 'Reads all 5 Stage 1 answers.',
        analystDiscovery: 'Recognizes all answers relate to LIGHT.',
      },
    },
    coordinationChain: {
      observerProduces: 'Observer reports all five Stage 1 answers.',
      analystTransforms: 'Analyst recognizes all relate to LIGHT.',
      operatorExecutes: 'Operator submits LIGHT.',
    },
    failurePropagation: {
      wrongStep: 'Team tries letter extraction approaches.',
      consequence: 'Wrong meta.',
      recoveryGuidance: 'What do facades, clocks, PINs, letters, and last names all relate to?',
    },
    hints: [
      'All Stage 1 answers relate to a single concept.',
      'They all involve visibility, illumination, or time-of-day.',
      'Submit LIGHT.',
    ],
    fullSolution:
      'All Stage 1 answers (CDFDEFF, 21:47, 3425, F, VEY) relate to illumination and visibility. The meta concept is LIGHT. Submitting LIGHT unlocks P06.',
    whyTeamworkMatters:
      'Requires the team to step back and synthesize across all feeders — a conceptual leap.',
    storyReveal: 'Terminal: "META LOCK DISENGAGED. STAGE 2 ACCESS GRANTED."',
    locationClue: {
      format: 'Path Instruction',
      clueText: 'LINA\'S NOTE: "The library basement holds the next stage. Descend the east stairwell."',
      solution: 'Library Basement East Stairwell',
      nextPhysicalLocation: '[LIBRARY] — Basement East Stairwell',
      nextQrNode: 'QR-NODE-06',
      explanation: 'Points to the library basement.',
    },
    evidenceUnlocked: {
      id: 'EVID-M01',
      category: 'Document',
      title: 'Stage 1 Meta — Archive Access Record',
      state: 'RECOVERED',
      content:
        'The archive confirms: all Stage 1 paths relate to LIGHT. A new folder labeled "STAGE 2 — MEMORY TRANSFER" has been unlocked.',
      timestamp: 'Stage 1',
      source: 'Central archive terminal',
    },
    prerequisiteNodes: ['P05'],
    nextNodes: ['P06'],
    branchConditions: [],
    points: 80,
  },
  {
    id: 'M02',
    code: 'M02',
    name: 'The Network Meta',
    stage: 2,
    type: 'META',
    difficulty: 4,
    time: '15m',
    location: '[SCIENCE BUILDING] — Memory Lab',
    feeds: 'P06 P07 P08 P09 P10 P11 P12 P13',
    unlocks: 'P14',
    acceptedAnswer: 'CONNECTION',
    validationMethod: 'case_insensitive',
    narrativeObjective:
      'Synthesize all Stage 2 answers. Every answer relates to linking or connecting.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Stage 2 Answer Aggregator',
      dataPayload: 'STAGE 2 ANSWERS: 17 | 17:47 | DELTA | LIGHT | ARCHWAY | B7 | 3425 | FRAGMENTS',
      visualType: 'meta',
      interactiveData: {
        answers: ['17', '17:47', 'DELTA', 'LIGHT', 'ARCHWAY', 'B7', '3425', 'VECTOR'],
        hint: 'Each answer represents a link in a chain.',
      },
      whatTheySee:
        'Terminal showing all Stage 2 answers with connecting lines between them.',
      taskPrompt: 'Read all answers.',
      intermediateOutput: 'Chain: 17 → 17:47 → DELTA → LIGHT → ARCHWAY → B7 → 3425 → VECTOR',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Network Concept Resolver',
      dataPayload:
        'ANALYSIS: Each answer is a link. The connecting concept is CONNECTION (Symbol ⧉). The fragment word was also about networks.',
      whatTheySee:
        'Resolver showing the unifying concept: CONNECTION.',
      taskPrompt: 'What concept links all Stage 2 answers?',
      intermediateOutput: 'CONNECTION',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Meta Network Terminal',
      dataPayload: 'UNIFYING CONCEPT: [ _ _ _ _ _ _ _ _ _ _ ]',
      whatTheySee: 'Ten-letter terminal.',
      taskPrompt: 'Submit the concept.',
      intermediateOutput: 'Submit: CONNECTION',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows the execution interface for M02.',
      operatorTaskDescription:
        'Every Stage 2 answer is a link in a chain. The Observer aggregates. The Analyst finds the unifying concept. The Operator submits.',
      requiredDiscoveries: {
        observerDiscovery: 'Reads all Stage 2 answers with connecting lines.',
        analystDiscovery: 'Recognizes CONNECTION as the unifying concept.',
      },
    },
    coordinationChain: {
      observerProduces: 'Observer reports the answer chain.',
      analystTransforms: 'Analyst identifies CONNECTION as the unifying concept.',
      operatorExecutes: 'Operator submits CONNECTION.',
    },
    failurePropagation: {
      wrongStep: 'Team submits a specific answer instead of the concept.',
      consequence: 'Meta rejected.',
      recoveryGuidance: 'It is the concept of linking, not a specific link.',
    },
    hints: [
      'Every Stage 2 answer is a link in a chain.',
      'What is the concept of linking?',
      'Submit CONNECTION.',
    ],
    fullSolution:
      'All Stage 2 answers form a chain of links. The unifying concept is CONNECTION. Submitting CONNECTION unlocks P14.',
    whyTeamworkMatters:
      'Tests whether the team can step back from individual solutions to find the meta-pattern.',
    storyReveal: 'Terminal: "NETWORK META VERIFIED. MEMORY TRANSFER INITIATED."',
    locationClue: {
      format: 'Path Instruction',
      clueText: 'LINA\'S NOTE: "Enter the memory lab. The transfer chamber is in the basement."',
      solution: 'Memory Transfer Chamber',
      nextPhysicalLocation: '[SCIENCE BUILDING] — Basement Transfer Chamber',
      nextQrNode: 'QR-NODE-16',
      explanation: 'Points to the memory transfer chamber.',
    },
    evidenceUnlocked: {
      id: 'FRAG-04',
      category: 'Symbol Fragment',
      title: 'Fragment 4 — Lattice',
      state: 'RECOVERED',
      content:
        'The fourth fragment. The word LATTICE: "The grid connects. The intersection is the node. Find the lattice."',
      timestamp: 'Stage 2',
      source: 'Memory lab terminal',
    },
    prerequisiteNodes: ['P13'],
    nextNodes: ['P14'],
    branchConditions: [],
    points: 100,
  },
  {
    id: 'M03',
    code: 'M03',
    name: 'The Symbol Meta',
    stage: 3,
    type: 'META',
    difficulty: 5,
    time: '18m',
    location: '[ADMIN BUILDING] — Central Archive',
    feeds: 'P14 P15 P16 P17 P18 P19 P20 P21',
    unlocks: 'P22',
    acceptedAnswer: 'SYMBOL',
    validationMethod: 'case_insensitive',
    narrativeObjective:
      'Synthesize all Stage 3 answers. Every answer relates to the seven symbols.',
    roleDependencyLevel: 'D5',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Stage 3 Symbol Aggregator',
      dataPayload:
        'STAGE 3 ANSWERS: VECTOR | 3425 | 15 | ECHO | 3425 | SUBMERGE | 2147 | ARCHIVE',
      visualType: 'meta',
      interactiveData: {
        symbols: ['⟁', '⧉', '⬡', '⧫', '⌬', '⍟', '⎔'],
        hint: 'Each answer maps to one of the seven symbols you collected.',
      },
      whatTheySee: 'Terminal showing all Stage 3 answers mapped to the seven symbols.',
      taskPrompt: 'Read the symbol-answer mapping.',
      intermediateOutput: '⟁→VECTOR ⧉→3425 ⬡→15 ⧫→ECHO ⌬→3425 ⍟→SUBMERGE ⎔→2147',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Symbol Synthesis Engine',
      dataPayload:
        'SYNTHESIS: All answers derive from and connect to the 7 symbols. The meta is the concept that unifies them: SYMBOL.',
      whatTheySee: 'Engine showing SYMBOL as the unifying concept.',
      taskPrompt: 'What single concept unifies all seven symbols?',
      intermediateOutput: 'SYMBOL',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Symbol Synthesis Terminal',
      dataPayload: 'UNIFYING CONCEPT: [ _ _ _ _ _ _ ]',
      whatTheySee: 'Six-letter terminal.',
      taskPrompt: 'Submit the concept.',
      intermediateOutput: 'Submit: SYMBOL',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows the execution interface for M03.',
      operatorTaskDescription:
        'Every Stage 3 answer maps to a symbol. The Observer reports the mapping. The Analyst finds the unifying concept. The Operator submits.',
      requiredDiscoveries: {
        observerDiscovery: 'Reads the symbol-answer mapping.',
        analystDiscovery: 'Identifies SYMBOL as the unifying concept.',
      },
    },
    coordinationChain: {
      observerProduces: 'Observer reports all symbol-answer mappings.',
      analystTransforms: 'Analyst identifies: SYMBOL unifies everything.',
      operatorExecutes: 'Operator submits SYMBOL.',
    },
    failurePropagation: {
      wrongStep: 'Team submits a specific symbol name instead of the concept.',
      consequence: 'Meta rejected.',
      recoveryGuidance: 'It is the concept, not a specific symbol.',
    },
    hints: [
      'Every Stage 3 answer relates to one of the seven symbols.',
      'What is the overarching concept?',
      'Submit SYMBOL.',
    ],
    fullSolution:
      'All Stage 3 answers map to the seven symbols. The unifying concept is SYMBOL. Submitting SYMBOL unlocks P22.',
    whyTeamworkMatters: 'Culmination of the symbol collection arc across all three stages.',
    storyReveal: 'Terminal: "SYMBOL SYNTHESIS COMPLETE. THE NEXUS CORE IS REVEALED."',
    locationClue: {
      format: 'Symbol',
      clueText: 'LINA\'S NOTE: "Return to the rooftop spire. The final stage begins."',
      solution: 'Rooftop Spire',
      nextPhysicalLocation: '[ROOFTOP] — Transmitter Spire',
      nextQrNode: 'QR-NODE-24',
      explanation: 'Points to the rooftop spire for Stage 5.',
    },
    evidenceUnlocked: {
      id: 'EVID-M03',
      category: 'Document',
      title: 'Stage 3 Meta — Core Activation Protocol',
      state: 'RECOVERED',
      content:
        'The archive reads: "All symbols converge at the Nexus Core. Proceed to the rooftop spire. The 3-hour countdown begins."',
      timestamp: 'Stage 3',
      source: 'Central archive terminal',
    },
    prerequisiteNodes: ['P21'],
    nextNodes: ['P22'],
    branchConditions: [],
    points: 120,
  },
  {
    id: 'M04',
    code: 'M04',
    name: 'The Hidden Layer',
    stage: 4,
    type: 'META',
    difficulty: 5,
    time: '25m',
    location: '[ENGINEERING BLOCK] — Vault Delta Core',
    feeds: 'P22 P23 P24 P25 P26 P27 P28 P29',
    unlocks: 'P30',
    acceptedAnswer: 'FRAGMENT 5',
    validationMethod: 'case_insensitive',
    narrativeObjective:
      'Synthesize Stage 4 feeders to claim Fragment 5 and access the final stage.',
    roleDependencyLevel: 'D5',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Vault Delta Convergence Lock',
      dataPayload:
        'FEEDERS: X, REINTERPRET, CONNECTION, FILTER, REFLECTION, STRUCTURE, FRAGMENT5_AUTH',
      visualType: 'meta',
      whatTheySee:
        'A 7-channel convergence lock showing all Stage 4 feeder outputs.',
      taskPrompt: 'Confirm all Stage 4 locks are green.',
      intermediateOutput: 'All 7 channels confirmed.',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Cryptographic Parity Engine 04',
      dataPayload:
        'PARITY 04: All seven cognitive operations verified. Authorize Fragment 5.',
      whatTheySee: 'Parity verification showing all channels green.',
      taskPrompt: 'Authorize the operator to submit.',
      intermediateOutput: 'Authorization granted',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Vault Delta Actuator',
      dataPayload: 'ACTIVATION DESIGNATION: [ _ _ _ _ _ _ _ _ _ _ ]',
      whatTheySee: 'Terminal awaiting the fragment designation.',
      taskPrompt: 'Submit the designation.',
      intermediateOutput: 'Submit: FRAGMENT 5',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows the execution interface for M04.',
      operatorTaskDescription:
        'All Stage 4 solutions converge here. The Observer confirms channels. The Analyst authorizes. The Operator submits.',
      requiredDiscoveries: {
        observerDiscovery: 'Confirms all 7 Stage 4 channels are green.',
        analystDiscovery: 'Authorizes the convergence: FRAGMENT 5.',
      },
    },
    coordinationChain: {
      observerProduces: 'Observer reports all Stage 4 channels green.',
      analystTransforms: 'Analyst authorizes: FRAGMENT 5.',
      operatorExecutes: 'Operator submits FRAGMENT 5.',
    },
    failurePropagation: {
      wrongStep: 'Operator enters a symbol instead of the fragment name.',
      consequence: 'Vault Delta expects the artifact name.',
      recoveryGuidance: 'Enter FRAGMENT 5.',
    },
    hints: [
      'Meta 04 seals Stage 4 by locking in your 5th fragment.',
      'The required designation is FRAGMENT 5.',
      'Submit FRAGMENT 5.',
    ],
    fullSolution:
      'Submitting FRAGMENT 5 closes Meta M04, unlocks the final Stage 5 progression.',
    whyTeamworkMatters: 'Penultimate milestone: teams enter the endgame.',
    storyReveal:
      'PA System: "SYSTEM PURGE IMMINENT. THE REMAINING TEAMS ARE SUMMONED TO THE CORE."',
    locationClue: {
      format: 'Poetic',
      clueText: 'LINA\'S NOTE: "Ascend to the central transmitter spire on the rooftop. The midnight hour approaches."',
      solution: 'Rooftop Transmitter Spire',
      nextPhysicalLocation: '[ROOFTOP] — Central Transmitter Spire',
      nextQrNode: 'QR-NODE-30',
      explanation: 'Points to the rooftop spire for Stage 5.',
    },
    evidenceUnlocked: {
      id: 'EVID-M04',
      category: 'Document',
      title: 'Stage 4 Meta — Core Activation Protocol',
      state: 'RECOVERED',
      content:
        'The vault reads: "Fragment 5 integrated. Proceed to the rooftop spire. The 3-hour countdown begins now."',
      timestamp: 'Stage 4',
      source: 'Vault Delta terminal',
    },
    prerequisiteNodes: ['P29'],
    nextNodes: ['P30'],
    branchConditions: [],
    points: 150,
  },
]
