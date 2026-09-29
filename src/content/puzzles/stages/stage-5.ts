/**
 * NEXUS — Stage 5 Puzzles (P30-P37, M01, FB)
 * Finale stage with GM role and Final Boss.
 */

import type { PuzzleNode } from '../../../types/game-engine'

export const STAGE_5_PUZZLES: PuzzleNode[] = [
  {
    id: 'P30',
    code: 'P30',
    name: 'The Transmitter Spire',
    stage: 5,
    type: 'MEMORY',
    difficulty: 4,
    time: '9m',
    location: '[NEXUS CORE] — Transmitter Spire',
    feeds: 'M04',
    unlocks: 'P31',
    acceptedAnswer: 'PULSE',
    validationMethod: 'case_insensitive',
    narrativeObjective:
      'Synchronize all 28 previously-solved answers into a memory echo to activate the spire.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Spire Activation Console',
      dataPayload:
        'CONSOLE: 28 slots awaiting answers. Missing: Pulse of consciousness.',
      visualType: 'timeline-investigation',
      interactiveData: {
        requiresPuzzle: 'M04',
        recallPrompt: 'Recall the M04 key.',
        entries: [
          { source: 'M04', text: 'MEMORY PULSE', flag: true },
          { source: 'Other 27', text: 'All Stage 1-3 answers', flag: false },
        ],
      },
      whatTheySee:
        'Control panel with 28 answer slots, one pulsing red: PULSE.',
      taskPrompt: 'Read the missing activation key.',
      intermediateOutput: 'Observer: PULSE',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Consciousness Key Validator',
      dataPayload:
        'VERIFICATION: PULSE (5 letters). Semantic: rate of alive rhythm.',
      whatTheySee: 'Validator showing PULSE.',
      taskPrompt: 'Verify the 5-letter word.',
      intermediateOutput: 'PULSE',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Spire Power Coupler',
      dataPayload: 'ENERGY FEED: [ _ _ _ _ _ ]',
      whatTheySee: '5-letter input terminal.',
      taskPrompt: 'Submit the pulse word.',
      intermediateOutput: 'Submit: PULSE',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows execution interface for P30.',
      operatorTaskDescription:
        'Observer reads missing key. Analyst validates word. Operator submits.',
      requiredDiscoveries: {
        observerDiscovery: 'Reads missing activation key: PULSE.',
        analystDiscovery: 'Validates PULSE as 5-letter concept.',
      },
    },
    coordinationChain: {
      observerProduces: 'Observer reads the missing activation key.',
      analystTransforms: 'Analyst validates semantic: PULSE.',
      operatorExecutes: 'Operator submits PULSE, unlocking P31.',
    },
    failurePropagation: {
      wrongStep: 'Operator enters HEART or BEAT.',
      consequence: 'System: "WRONG PATTERN. RETRY REQUIRED."',
      recoveryGuidance: 'The M04 key is PULSE.',
    },
    hints: [
      'Recall the Stage 4 meta-solution key.',
      'It is 5 letters and represents a living rhythm.',
      'Submit PULSE.',
    ],
    fullSolution:
      'The missing spire activation key is PULSE. Submitting PULSE unlocks P31.',
    whyTeamworkMatters:
      'First of two puzzles requiring a full 3-way call during submission.',
    storyReveal:
      'Spire hums: "29 OF 28 SLOTS FILLED. CONSCIOUSNESS SYNCHRONIZED."',
    locationClue: {
      format: 'Research-Note',
      clueText:
        "LINA'S NOTE: \"Descend to the Nexus Core basement. The memory cylinder array awaits.\"",
      solution: 'Nexus Core Memory Arrays',
      nextPhysicalLocation: '[NEXUS CORE] — Memory Arrays',
      nextQrNode: 'QR-NODE-31',
      explanation: 'Points to memory arrays.',
    },
    evidenceUnlocked: {
      id: 'EVID-P30',
      category: 'Audio',
      title: 'Dictaphone Memo REC-22: Synchronization',
      state: 'RECOVERED',
      timestamp: 'Stage 5',
      source: 'Spire control console',
      content:
        'All 28 answers are now in the array. But the final truth requires the 29th answer to come from within. Proceed to Memory Array.',
    },
    prerequisiteNodes: ['M04'],
    nextNodes: ['P31'],
    branchConditions: [],
    points: 65,
  },
  {
    id: 'P31',
    code: 'P31',
    name: 'The Memory Array',
    stage: 5,
    type: 'MEMORY',
    difficulty: 4,
    time: '9m',
    location: '[NEXUS CORE] — Memory Arrays',
    feeds: 'P30',
    unlocks: 'P32',
    acceptedAnswer: 'SYNC',
    validationMethod: 'exact',
    narrativeObjective:
      'Align the team\'s memory banks to pass a shared recall test.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Memory Sync Test',
      dataPayload:
        'TEST: "What was the first word of the P01 answer?"\nA) FILTER  B) OBSERVE  C) CONNECTION',
      visualType: 'memory-recall',
      interactiveData: {
        requiresPuzzle: 'P01',
        recallPrompt: 'Recall P01 answer.',
      },
      whatTheySee:
        'Multiple choice question about early puzzle answers.',
      taskPrompt: 'Read the shared recall question.',
      intermediateOutput: 'Question about P01.',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Answer Correlation Matrix',
      dataPayload:
        'MATRIX: P01 answered OBSERVE. Correct choice: B.',
      whatTheySee: 'Resolver showing choice B.',
      taskPrompt: 'Resolve the correct choice.',
      intermediateOutput: 'B) OBSERVE',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Sync Command Terminal',
      dataPayload: 'ACTION CODE: [ _ _ _ _ ]',
      whatTheySee: '4-letter code input.',
      taskPrompt: 'Submit the sync code.',
      intermediateOutput: 'Submit: SYNC',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows execution interface for P31.',
      operatorTaskDescription:
        'Observer reads recall question. Analyst confirms correct answer. Operator submits.',
      requiredDiscoveries: {
        observerDiscovery: 'Reads shared recall question about P01.',
        analystDiscovery:
          'Confirms correct answer: B) OBSERVE (from P01).',
      },
    },
    coordinationChain: {
      observerProduces: 'Observer reads the recall question.',
      analystTransforms:
        'Analyst correlates with P01: answer was OBSERVE.',
      operatorExecutes:
        'Operator submits SYNC, unlocking P32.',
    },
    failurePropagation: {
      wrongStep: 'Operator enters OBSERVE.',
      consequence: 'System: "WRONG TYPE. COMMAND CODE EXPECTED."',
      recoveryGuidance: 'Submit the command code: SYNC.',
    },
    hints: [
      'You need a 4-letter action that teams do with memory.',
      'It is a verb meaning to align.',
      'Submit SYNC.',
    ],
    fullSolution:
      'The sync command code is SYNC. Submitting SYNC unlocks P32.',
    whyTeamworkMatters:
      'Tests if the team is genuinely playing together rather than solo.',
    storyReveal:
      'Terminal: "MEMORY BANKS SYNCED. ACCESS GRANTED TO FINAL VAULT."',
    locationClue: {
      format: 'Research-Note',
      clueText:
        "LINA'S NOTE: \"Enter the Final Vault. The GM key awaits.\"",
      solution: 'Final Transmission Vault',
      nextPhysicalLocation: '[NEXUS CORE] — Final Vault',
      nextQrNode: 'QR-NODE-32',
      explanation: 'Points to the final vault.',
    },
    evidenceUnlocked: {
      id: 'EVID-P31',
      category: 'Lab Note',
      title: 'Lab Notebook Fragment #81',
      state: 'RECOVERED',
      timestamp: 'Stage 5',
      source: 'Memory array terminal',
      content:
        'The sync worked. The GM key is now accessible. Remember: NEXUS can only be stopped if all three players simultaneously agree.',
    },
    prerequisiteNodes: ['P30'],
    nextNodes: ['P32'],
    branchConditions: [],
    points: 65,
  },
  {
    id: 'P32',
    code: 'P32',
    name: 'The Three Phones II',
    stage: 5,
    type: 'THREE_PHONE',
    difficulty: 4,
    time: '9m',
    location: '[NEXUS CORE] — Final Vault',
    feeds: 'P31',
    unlocks: 'P33',
    acceptedAnswer: 'UNITY',
    validationMethod: 'case_insensitive',
    narrativeObjective:
      'Align three phone screens to reveal the GM\'s role-dependent message.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Observer GM Message',
      dataPayload:
        'SHARD 1: "The Observer sees all paths, but walks none alone."',
      visualType: 'three-phone',
      interactiveData: {
        message: 'The Observer sees all paths.',
      },
      whatTheySee:
        'Observer phone displays partial GM message.',
      taskPrompt: 'Communicate your shard.',
      intermediateOutput: 'Shard 1 received.',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Analyst GM Message',
      dataPayload:
        'SHARD 2: "The Analyst binds the seen and unseen into a single word."',
      whatTheySee:
        'Analyst phone displays partial GM message.',
      taskPrompt: 'Communicate your shard.',
      intermediateOutput: 'Shard 2 received.',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Operator GM Message + Synthesis',
      dataPayload:
        'SHARD 3: "The Operator acts, and in acting, they become the answer. United: [ _ _ _ _ _ ]"',
      whatTheySee:
        'Operator phone displays shard 3 and synthesis prompt.',
      taskPrompt: 'Combine and submit.',
      intermediateOutput: 'Submit: UNITY',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows execution interface for P32.',
      operatorTaskDescription:
        'All three read their GM message shard and combine.',
      requiredDiscoveries: {
        observerDiscovery: 'Reads shard 1 of GM message.',
        analystDiscovery: 'Reads shard 2 of GM message.',
      },
    },
    coordinationChain: {
      observerProduces:
        'Observer shares shard: "sees all paths but walks none alone."',
      analystTransforms:
        'Analyst shares shard: "binds seen and unseen."',
      operatorExecutes:
        'Operator combines: "acts and becomes the answer" → UNITY.',
    },
    failurePropagation: {
      wrongStep: 'Operator enters ONENESS.',
      consequence: 'System: "CONCEPT ACCEPTED. WORD NOT RECOGNIZED."',
      recoveryGuidance: '5 letters: U-N-I-T-Y.',
    },
    hints: [
      'Combine the three shards: sees, binds, becomes one.',
      'The 5-letter answer.',
      'Submit UNITY.',
    ],
    fullSolution:
      'Combining the GM message shards yields UNITY. Submitting UNITY unlocks P33.',
    whyTeamworkMatters:
      'Final Three-Phone puzzle with GM as narrator.',
    storyReveal:
      'GM voice: "NEXUS cannot be defeated by one. It requires all three roles as one."',
    locationClue: {
      format: 'Research-Note',
      clueText:
        "GM NOTE: \"The GM key is 7 letters. Enter it to proceed.\"",
      solution: 'GM Key Panel',
      nextPhysicalLocation: '[NEXUS CORE] — GM Key Panel',
      nextQrNode: 'QR-NODE-33',
      explanation: 'Points to GM key panel.',
    },
    evidenceUnlocked: {
      id: 'EVID-P32',
      category: 'Audio',
      title: 'Dictaphone Memo REC-24: The GM Key',
      state: 'RECOVERED',
      timestamp: 'Stage 5',
      source: 'Vault holographic projector',
      content:
        'The three shards combined speak of unity. The GM key is 7 letters and represents the core principle of NEXUS.',
    },
    prerequisiteNodes: ['P31'],
    nextNodes: ['P33'],
    branchConditions: [],
    points: 65,
  },
  {
    id: 'P33',
    code: 'P33',
    name: 'The GM Key Protocol',
    stage: 5,
    type: 'DEDUCTION',
    difficulty: 4.5,
    time: '8m',
    location: '[NEXUS CORE] — GM Key Panel',
    feeds: 'P32',
    unlocks: 'P34',
    acceptedAnswer: 'CONVERGENCE',
    validationMethod: 'case_insensitive',
    narrativeObjective:
      'Deduce the 7-letter GM key representing the unity principle.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Key Derivation Analyzer',
      dataPayload:
        'ANALYZER: All 30 stages converge into single principle.',
      visualType: 'dependency-tree',
      interactiveData: {
        convergencePoint: 'All 30 answers flow into one concept.',
      },
      whatTheySee:
        'Analyzer showing convergence diagram.',
      taskPrompt: 'Analyze the convergence concept.',
      intermediateOutput: 'Observer: CONVERGENCE?',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Semantic Validator',
      dataPayload:
        'VALIDATION: "Convergence" = 10 letters. Too long by 3.',
      whatTheySee:
        'Validator showing length mismatch.',
      taskPrompt: 'Validate the key length.',
      intermediateOutput: 'Need 7 letters.',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'GM Key Terminal',
      dataPayload:
        'KEY (7 letters): [ _ _ _ _ _ _ _ ]\nHint: What is NEXUS\' core?',
      whatTheySee:
        '7-letter key terminal with prompt.',
      taskPrompt: 'Enter the 7-letter key.',
      intermediateOutput: 'Submit: CONVERGE',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows execution interface for P33.',
      operatorTaskDescription:
        'Observer reads convergence prompt. Analyst validates. Operator submits.',
      requiredDiscoveries: {
        observerDiscovery:
          'Reads prompt: "7 letters, what is NEXUS\' core?"',
        analystDiscovery:
          'Validates 7-letter word: CONVERGE.',
      },
    },
    coordinationChain: {
      observerProduces: 'Observer reads the convergence prompt.',
      analystTransforms:
        'Analyst notes CONVERGENCE is too long—truncated to 7.',
      operatorExecutes:
        'Operator submits CONVERGE, unlocking P34.',
    },
    failurePropagation: {
      wrongStep: 'Operator enters CONVERGENCE.',
      consequence: 'System: "7 LETTERS REQUIRED, 10 PROVIDED."',
      recoveryGuidance: 'Use the verb form: CONVERGE.',
    },
    hints: [
      'The GM told you the key is 7 letters.',
      'It is the verb form of convergence.',
      'Submit CONVERGE.',
    ],
    fullSolution:
      'The 7-letter GM key is CONVERGE. Submitting CONVERGE unlocks P34.',
    whyTeamworkMatters:
      'Tests the team\'s ability to truncate and validate.',
    storyReveal:
      'Terminal: "CONVERGE ACCEPTED. FINAL STAGE INITIATED."',
    locationClue: {
      format: 'Poetic',
      clueText:
        "LINA'S NOTE: \"Enter the Nexus Core central hub. The final truth awaits.\"",
      solution: 'Nexus Core Central Hub',
      nextPhysicalLocation: '[NEXUS CORE] — Central Hub',
      nextQrNode: 'QR-NODE-34',
      explanation: 'Points to central hub for the final puzzles.',
    },
    evidenceUnlocked: {
      id: 'EVID-P33',
      category: 'Classified',
      title: 'Classified Memo: Final Protocol',
      state: 'RECOVERED',
      timestamp: 'Stage 5',
      source: 'GM Key terminal',
      content:
        'GM PROTOCOL: The final boss requires all three players to simultaneously confirm their agreement. No single role can trigger it.',
    },
    prerequisiteNodes: ['P32'],
    nextNodes: ['P34'],
    branchConditions: [],
    points: 70,
  },
  {
    id: 'P34',
    code: 'P34',
    name: 'The Final Sequence',
    stage: 5,
    type: 'PATTERN',
    difficulty: 4.5,
    time: '8m',
    location: '[NEXUS CORE] — Central Hub',
    feeds: 'P33',
    unlocks: 'P35',
    acceptedAnswer: 'C',
    validationMethod: 'exact',
    narrativeObjective:
      'Derive the next sequence value to initiate the final boss protocol.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Sequence Viewer',
      dataPayload:
        'SEQUENCE: A, B, C, ?, E, F, G, ?, I, J, K\nMissing: positions 4 and 8.',
      visualType: 'timeline-investigation',
      interactiveData: {
        sequence: ['A', 'B', 'C', '?', 'E', 'F', 'G', '?', 'I', 'J', 'K'],
        missingPositions: [3, 7],
      },
      whatTheySee:
        'Missing-sequence puzzle: ABC_DEF_GHIJK.',
      taskPrompt:
        'Identify the pattern and find the first missing item (position 4).',
      intermediateOutput: 'Position 4: D',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Pattern Analyzer',
      dataPayload:
        'ANALYSIS: Letters increment by 1. Position 4 = D, position 8 = H.',
      whatTheySee: 'Resolver: D then H.',
      taskPrompt: 'Resolve the first missing letter.',
      intermediateOutput: 'D',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Protocol Initiator',
      dataPayload:
        'INITIATE (1 letter): [ _ ]\nSubmit first missing value.',
      whatTheySee: 'Single-letter input.',
      taskPrompt: 'Submit the first missing value.',
      intermediateOutput: 'Submit: D',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows execution interface for P34.',
      operatorTaskDescription:
        'Observer reads sequence. Analyst computes missing letter. Operator submits.',
      requiredDiscoveries: {
        observerDiscovery:
          'Reads missing-sequence puzzle: ABC_DEF_GHIJK.',
        analystDiscovery: 'Computes missing: D.',
      },
    },
    coordinationChain: {
      observerProduces:
        'Observer shares sequence A,B,C,?,E,F,G,?,I,J,K.',
      analystTransforms: 'Analyst computes missing letter: D.',
      operatorExecutes:
        'Operator submits D, unlocking P35.',
    },
    failurePropagation: {
      wrongStep: 'Operator enters H.',
      consequence: 'System: "WRONG POSITION. RETRY."',
      recoveryGuidance: 'Submit the first missing value: D.',
    },
    hints: [
      'The sequence is simply the alphabet in order.',
      'Letters missing at position 4 and 8.',
      'Submit D.',
    ],
    fullSolution:
      'The alphabet sequence has D missing at position 4. Submitting D unlocks P35.',
    whyTeamworkMatters:
      'Simple pattern but requires coordination of 3-way split.',
    storyReveal:
      'Terminal: "SEQUENCE COMPLETE. FINAL ENTITY ENTRY DETECTED."',
    locationClue: {
      format: 'Research-Note',
      clueText:
        "LINA'S NOTE: \"The entity awaits. All three must agree to proceed.\"",
      solution: 'Final Boss Chamber',
      nextPhysicalLocation: '[NEXUS CORE] — Final Boss Chamber',
      nextQrNode: 'QR-NODE-35',
      explanation: 'Points to the final boss chamber.',
    },
    evidenceUnlocked: {
      id: 'EVID-P34',
      category: 'Audio',
      title: 'Dictaphone Memo REC-26: The Entity',
      state: 'RECOVERED',
      timestamp: 'Stage 5',
      source: 'Central hub terminal',
      content:
        'Sequence complete. The entity stirs. But it cannot manifest unless all three players simultaneously confirm their presence and their choice.',
    },
    prerequisiteNodes: ['P33'],
    nextNodes: ['P35'],
    branchConditions: [],
    points: 70,
  },
  {
    id: 'P35',
    code: 'P35',
    name: 'The Final Choice',
    stage: 5,
    type: 'NARRATIVE_INVESTIGATION',
    difficulty: 4.5,
    time: '8m',
    location: '[NEXUS CORE] — Final Boss Chamber',
    feeds: 'P34',
    unlocks: 'P36',
    acceptedAnswer: 'AGREE',
    validationMethod: 'case_insensitive',
    narrativeObjective:
      'All three players must simultaneously confirm their agreement to initiate the final sequence.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Observer Confirmation',
      dataPayload:
        'CONFIRMATION: "Do you agree to proceed with the final choice? (Y/N)"',
      visualType: 'memory-recall',
      interactiveData: {
        requiresAllRoles: true,
        confirmationRequired: true,
      },
      whatTheySee:
        'Observer terminal awaiting confirmation.',
      taskPrompt: 'Confirm agreement.',
      intermediateOutput: 'Observer: AGREE',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Analyst Confirmation',
      dataPayload:
        'CONFIRMATION: "Do you agree to proceed with the final choice? (Y/N)"',
      whatTheySee:
        'Analyst terminal awaiting confirmation.',
      taskPrompt: 'Confirm agreement.',
      intermediateOutput: 'Analyst: AGREE',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Operator Confirmation + Initiation',
      dataPayload:
        'CONFIRMATION: "Do you agree to proceed with the final choice? (Y/N)"\nAll three roles confirmed. Initiate sequence with [ _ _ _ _ _ ]',
      whatTheySee:
        'Operator terminal awaiting confirmation and input.',
      taskPrompt:
        'Confirm and submit the initiation word.',
      intermediateOutput: 'Operator: AGREE → Submit AGREE',
    },
    operatorInvestigation: {
      operatorOwnEvidence:
        'Terminal shows execution interface for P35 (requires all 3 confirmations).',
      operatorTaskDescription:
        'All three roles must independently confirm, then Operator submits.',
      requiredDiscoveries: {
        observerDiscovery: 'Observer confirms agreement.',
        analystDiscovery: 'Analyst confirms agreement.',
      },
    },
    coordinationChain: {
      observerProduces: 'Observer confirms: AGREE.',
      analystTransforms: 'Analyst confirms: AGREE.',
      operatorExecutes:
        'Operator submits AGREE after all confirmations, unlocking P36.',
    },
    failurePropagation: {
      wrongStep: 'One role does not confirm.',
      consequence: 'System: "ALL ROLES REQUIRED."',
      recoveryGuidance: 'All three must confirm simultaneously.',
    },
    hints: [
      'All three players must confirm.',
      'The 5-letter word is a synonym of agree.',
      'Submit AGREE.',
    ],
    fullSolution:
      'All three players confirm simultaneously. Operator submits AGREE, unlocking P36.',
    whyTeamworkMatters:
      'The entire finale hinges on genuine 3-way coordination.',
    storyReveal:
      'Entity voice: "NOW YOU ARE READY. PROCEED TO P36."',
    locationClue: {
      format: 'Poetic',
      clueText:
        "LINA'S NOTE: \"The GM watches and will now guide you.\"",
      solution: 'GM Observation Deck',
      nextPhysicalLocation: '[NEXUS CORE] — GM Observation Deck',
      nextQrNode: 'QR-NODE-36',
      explanation: 'Points to GM deck for final stage.',
    },
    evidenceUnlocked: {
      id: 'EVID-P35',
      category: 'Audio',
      title: 'Dictaphone Memo REC-28: The GM',
      state: 'RECOVERED',
      timestamp: 'Stage 5',
      source: 'Final boss chamber',
      content:
        'The GM observes. They will guide the final interaction. All three players are now recognized as the true candidates.',
    },
    prerequisiteNodes: ['P34'],
    nextNodes: ['P36'],
    branchConditions: [],
    points: 75,
  },
  {
    id: 'P36',
    code: 'P36',
    name: 'The GM Intervention',
    stage: 5,
    type: 'META',
    difficulty: 5,
    time: '7m',
    location: '[NEXUS CORE] — GM Observation Deck',
    feeds: 'P35',
    unlocks: 'P37',
    acceptedAnswer: 'META',
    validationMethod: 'exact',
    narrativeObjective:
      'The GM guides the team through a meta-puzzle about the game itself.',
    roleDependencyLevel: 'D5',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'GM Broadcast Channel',
      dataPayload:
        'BROADCAST: "Candidate 01, you have reached the Meta level. The answer is what you call this kind of puzzle."',
      visualType: 'document-forensics',
      interactiveData: {
        gmBroadcast: true,
        metaLevel: true,
      },
      whatTheySee:
        'GM broadcast message on observer terminal.',
      taskPrompt: 'Read the GM broadcast.',
      intermediateOutput: 'Observer: This is a META puzzle.',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Meta Concept Resolver',
      dataPayload:
        'RESOLUTION: The puzzle about puzzles is called META.',
      whatTheySee: 'Resolver: META.',
      taskPrompt: 'Resolve the meta concept.',
      intermediateOutput: 'META',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Meta Level Command',
      dataPayload:
        'LEVEL DESIGNATION: [ _ _ _ _ ]\nSubmit the meta level.',
      whatTheySee: '4-letter input terminal.',
      taskPrompt: 'Submit the meta level.',
      intermediateOutput: 'Submit: META',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows execution interface for P36.',
      operatorTaskDescription:
        'GM provides meta puzzle. Analyst resolves. Operator submits.',
      requiredDiscoveries: {
        observerDiscovery: 'Reads GM broadcast about meta level.',
        analystDiscovery: 'Resolves: META.',
      },
    },
    coordinationChain: {
      observerProduces:
        'Observer reads GM: "This is the meta level of the game."',
      analystTransforms: 'Analyst resolves: META.',
      operatorExecutes:
        'Operator submits META, unlocking P37 (Final Boss).',
    },
    failurePropagation: {
      wrongStep: 'Operator enters PUZZLE.',
      consequence: 'GM: "NOT THE META. THINK DEEPER."',
      recoveryGuidance: 'Submit META.',
    },
    hints: [
      'The GM calls this a Meta puzzle.',
      'It is 4 letters.',
      'Submit META.',
    ],
    fullSolution:
      'The GM declares this is a META puzzle. Submitting META unlocks P37.',
    whyTeamworkMatters:
      'GM directly intervenes to guide the players.',
    storyReveal:
      'GM voice: "You have seen the game. Now you must defeat it."',
    locationClue: {
      format: 'Poetic',
      clueText:
        "GM NOTE: \"The final boss awaits. Only the complete team may enter.\"",
      solution: 'Final Boss Arena',
      nextPhysicalLocation: '[NEXUS CORE] — Final Boss Arena',
      nextQrNode: 'QR-NODE-37',
      explanation: 'Points to final boss arena.',
    },
    evidenceUnlocked: {
      id: 'EVID-P36',
      category: 'Classified',
      title: 'Classified Memo: Final Boss Protocol',
      state: 'RECOVERED',
      timestamp: 'Stage 5',
      source: 'GM observation deck',
      content:
        'GM PROTOCOL: The final boss requires all three players to simultaneously submit their role-specific final answer. The answer is the name of this game, in the format of an acronym.',
    },
    prerequisiteNodes: ['P35'],
    nextNodes: ['P37'],
    branchConditions: [],
    points: 80,
  },
  {
    id: 'P37',
    code: 'P37',
    name: 'The Final Boss',
    stage: 5,
    type: 'FINAL_BOSS',
    difficulty: 5,
    time: '10m',
    location: '[NEXUS CORE] — Final Boss Arena',
    feeds: 'P36',
    unlocks: null,
    acceptedAnswer: 'NEXUS',
    validationMethod: 'case_insensitive',
    narrativeObjective:
      'All three players simultaneously submit to defeat the final boss and win the game.',
    roleDependencyLevel: 'D5',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Final Boss - Observer Interface',
      dataPayload:
        'BOSS PHASE 1: "I am the archive. I am the echo. I am the...\nName the system that contains all your answers."',
      visualType: 'memory-recall',
      interactiveData: {
        requiresAllRoles: true,
        simultaneousSubmission: true,
        finalBoss: true,
        phase: 1,
      },
      whatTheySee:
        'Observer terminal showing boss phase 1 prompt.',
      taskPrompt: 'Identify the all-encompassing system.',
      intermediateOutput: 'Observer: NEXUS',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Final Boss - Analyst Interface',
      dataPayload:
        'BOSS PHASE 1: "I am the sum. I am the convergence. I am the...\nWhat binds all fragments together?"',
      whatTheySee:
        'Analyst terminal showing boss phase 1 prompt.',
      taskPrompt: 'Identify the binding system.',
      intermediateOutput: 'Analyst: NEXUS',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: "Final Boss - Operator Interface + Submission",
      dataPayload:
        'BOSS PHASE 1: I am the key. I am the lock. I am the... Final submission: [ _ _ _ _ _ ]',
      visualType: 'final-boss',
      interactiveData: {
        requiresAllRoles: true,
        simultaneousSubmission: true,
        finalBoss: true,
        phase: 1,
      },
      whatTheySee:
        'Operator terminal showing boss phase 1 and final 5-letter input.',
      taskPrompt:
        'Combine and submit the final boss answer.',
      intermediateOutput: 'Submit: NEXUS',
    },
    operatorInvestigation: {
      operatorOwnEvidence:
        'Terminal shows execution interface for P37 (final boss - requires all 3 simultaneous submits).',
      operatorTaskDescription:
        'All three players must simultaneously submit their answer.',
      requiredDiscoveries: {
        observerDiscovery: 'Observer identifies NEXUS.',
        analystDiscovery: 'Analyst identifies NEXUS.',
      },
    },
    coordinationChain: {
      observerProduces: 'Observer identifies: NEXUS.',
      analystTransforms: 'Analyst confirms: NEXUS.',
      operatorExecutes:
        'Operator submits NEXUS simultaneously with others. GAME COMPLETE.',
    },
    failurePropagation: {
      wrongStep: 'Not all three submit simultaneously.',
      consequence: 'BOSS: "INCOMPLETE. ALL THREE ARE ONE."',
      recoveryGuidance: 'Coordinate: all three submit NEXUS at the same time.',
    },
    hints: [
      'The entity\'s name is your game\'s title.',
      'It is 5 letters.',
      'All three must submit simultaneously.',
    ],
    fullSolution:
      'All three players simultaneously submit NEXUS to defeat the final boss. GAME COMPLETE.',
    whyTeamworkMatters:
      'The entire game culminates in a simultaneous 3-player submission.',
    storyReveal:
      'GM voice: "CONGRATULATIONS. YOU HAVE UNLOCKED THE TRUE ENDING."',
    locationClue: {
      format: 'Narrative',
      clueText:
        'The game ends here. No further location.',
      solution: 'END',
      nextPhysicalLocation: 'GAME END',
      nextQrNode: null,
      explanation: 'The game is complete.',
    },
    evidenceUnlocked: {
      id: 'ENDING-CERTIFICATE',
      category: 'Achievement',
      title: 'True Ending Certificate',
      state: 'RECOVERED',
      timestamp: 'Stage 5',
      source: 'Final boss victory',
      content:
        'NEXUS GAME MASTER CERTIFICATE\n\nThis certifies that three minds worked as one to uncover the truth. The system was never the enemy. It was the mirror.\n\nGAME COMPLETE.',
    },
    prerequisiteNodes: ['P36'],
    nextNodes: null,
    branchConditions: [],
    points: 200,
  },
]
