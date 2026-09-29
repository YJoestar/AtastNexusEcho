/**
 * NEXUS — Stage 4 Puzzles (P22-P29, M04)
 * Late-game puzzles with high dependency on earlier stages.
 */

import type { PuzzleNode } from '../../../types/game-engine'

export const STAGE_4_PUZZLES: PuzzleNode[] = [
  {
    id: 'P22',
    code: 'P22',
    name: 'The Hidden Layer',
    stage: 4,
    type: 'LOGIC',
    difficulty: 4.5,
    time: '12m',
    location: '[SCIENCE BUILDING] — Research Lab',
    feeds: 'M03',
    unlocks: 'P23',
    acceptedAnswer: 'X',
    validationMethod: 'exact',
    narrativeObjective:
      'Reopen P01 to discover its hidden second-order variable.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Reinterpretation Terminal',
      dataPayload:
        'REINTERPRETATION: "P01 facade carries a hidden variable beyond CDFDEFF."',
      visualType: 'document-forensics',
      interactiveData: {
        requiresPuzzle: 'P01',
        recallPrompt: 'Recall P01 facade symbols.',
      },
      whatTheySee:
        'Terminal showing P01 facade with an additional hidden field flagged.',
      taskPrompt: 'Report the hidden binding variable between P01 and P03.',
      intermediateOutput: 'P01 and P03 share a hidden variable',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Second-Order Variable Analyzer',
      dataPayload:
        'ANALYSIS: The 24th letter of the alphabet binds P01 and P03.',
      whatTheySee:
        'Analyzer showing: A(1)...X(24)...Z(26). The 24th letter is X.',
      taskPrompt: 'What is the 24th letter of the alphabet?',
      intermediateOutput: 'X',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Hidden Layer Execution',
      dataPayload: 'REINTERPRETED KEY: [ _ ]',
      whatTheySee: 'Single-character input.',
      taskPrompt: 'Submit the binding variable.',
      intermediateOutput: 'Submit: X',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows single-character binding slot for P22.',
      operatorTaskDescription:
        'The Observer reopens P01 data. The Analyst computes the 24th letter. The Operator submits.',
      requiredDiscoveries: {
        observerDiscovery: 'Reopens P01 and finds hidden binding field.',
        analystDiscovery: 'Computes 24th alphabet letter: X.',
      },
    },
    coordinationChain: {
      observerProduces:
        'Observer uses contradiction scanner to find hidden binding between P01 and P03.',
      analystTransforms:
        'Analyst derives the binding variable as the 24th letter: X.',
      operatorExecutes: 'Operator submits X, unlocking P23.',
    },
    failurePropagation: {
      wrongStep: 'Team guesses random letters.',
      consequence: 'Operator locked out for 45 seconds.',
      recoveryGuidance: 'Think Stage 2 answer for P03: what alphabet position?',
    },
    hints: [
      'This puzzle requires recalling Stage 1-2 answers.',
      'The 24th letter of the alphabet is X.',
      'Submit X.',
    ],
    fullSolution:
      'Re-evaluating Stage 1-2 establishes the binding variable connecting P01 and P03 is X (24th letter). Submitting X unlocks P23.',
    whyTeamworkMatters:
      'Demonstrates delayed meaning: answers from hours ago return with new structural importance.',
    storyReveal:
      'System warning: "OLD DATA IS NEVER OBSOLETE. ALL ANSWERS REMAIN CONCURRENT."',
    locationClue: {
      format: 'Research-Note',
      clueText:
        "LINA'S NOTE: \"The robotics lab has autonomous arms in darkness. Find Bay 1.\"",
      solution: 'Engineering Block Robotics Bay 1',
      nextPhysicalLocation: '[ENGINEERING BLOCK] — Robotics Bay 1',
      nextQrNode: 'QR-NODE-23',
      explanation: 'Points to Robotics Bay 1.',
    },
    evidenceUnlocked: {
      id: 'EVID-P22',
      category: 'Lab Note',
      title: 'Lab Notebook Fragment #51',
      state: 'RECOVERED',
      timestamp: 'Stage 4',
      source: 'Robotics Bay 1 terminal',
      content:
        'I knew they would never look back. Human psychology makes us discard answers once a door opens. But NEXUS re-weaves old threads. The X from the window was not a room; it was the unknown variable of the entire manifold.',
    },
    prerequisiteNodes: ['M03'],
    nextNodes: ['P23'],
    branchConditions: [],
    points: 60,
  },
  {
    id: 'P23',
    code: 'P23',
    name: 'The Reinterpretation',
    stage: 4,
    type: 'DEDUCTION',
    difficulty: 4.5,
    time: '12m',
    location: '[ENGINEERING BLOCK] — Robotics Bay 1',
    feeds: 'P22',
    unlocks: 'P24',
    acceptedAnswer: 'REINTERPRET',
    validationMethod: 'exact',
    narrativeObjective:
      'Deduce the cognitive directive for when evidence contradicts early assumptions.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Cognitive Discrepancy Monitor',
      dataPayload:
        'MONITOR: "WHEN EARLY FACTS FAIL LATER TESTS, WHAT ACTION MUST YOU TAKE?"',
      visualType: 'document-forensics',
      interactiveData: {
        documentText:
          'EARLIER REPORT: "Subject departed at 17:30"\nLATER RECORD: "Security cam shows subject at 19:45"\nANALYSIS REQUIRED',
      },
      whatTheySee:
        'Terminal showing contradictory reports about subject departure time.',
      taskPrompt:
        'Read the prompt asking for an 11-letter cognitive action beginning with RE-.',
      intermediateOutput: 'Prompt requires 11 letters starting RE-',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Cognitive Lexicon Resolver',
      dataPayload:
        'LEXICON: RE + INTERPRET = REINTERPRET (11 letters). Meaning: assign new meaning to prior data.',
      whatTheySee: 'Resolver confirming REINTERPRET.',
      taskPrompt: 'Confirm the 11-letter word.',
      intermediateOutput: 'REINTERPRET',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Cognitive Protocol Switch',
      dataPayload: 'DIRECTIVE: [ _ _ _ _ _ _ _ _ _ _ _ ]',
      whatTheySee: '11-letter input terminal.',
      taskPrompt: 'Submit the directive.',
      intermediateOutput: 'Submit: REINTERPRET',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows 11-letter cognitive directive slot for P23.',
      operatorTaskDescription:
        'Observer reads the discrepancy question. Analyst resolves the 11-letter word. Operator submits.',
      requiredDiscoveries: {
        observerDiscovery: 'Reads prompt: 11 letters, starts RE-, re-examine old clues.',
        analystDiscovery: 'Resolves REINTERPRET.',
      },
    },
    coordinationChain: {
      observerProduces: 'Observer shares the anomaly question and letter count.',
      analystTransforms: 'Analyst solves: REINTERPRET (11 letters).',
      operatorExecutes: 'Operator submits REINTERPRET, unlocking P24.',
    },
    failurePropagation: {
      wrongStep: 'Analyst guesses REEVALUATE (10) or RECALCULATE (12).',
      consequence: 'Wrong letter count; input box rejects.',
      recoveryGuidance: 'Must be exactly 11 letters: R-E-I-N-T-E-R-P-R-E-T.',
    },
    hints: [
      'The prompt asks what you do when you examine old clues with new eyes.',
      'It is 11 letters beginning with RE- and ending with -PRET.',
      'Submit REINTERPRET.',
    ],
    fullSolution:
      'The 11-letter cognitive action for re-examining old clues is REINTERPRET. Submitting REINTERPRET unlocks P24.',
    whyTeamworkMatters:
      'Encourages the team to actively challenge their own assumptions.',
    storyReveal: 'Subject 00 log: "I thought the ciphers were gates. They were mirrors."',
    locationClue: {
      format: 'Poetic',
      clueText:
        "LINA'S NOTE: \"Ascend the external spiral staircase to the communications antenna deck.\"",
      solution: 'Engineering Communications Antenna Deck',
      nextPhysicalLocation: '[ENGINEERING BLOCK] — Antenna Deck',
      nextQrNode: 'QR-NODE-24',
      explanation: 'Points to the antenna deck.',
    },
    evidenceUnlocked: {
      id: 'EVID-P23',
      category: 'Audio',
      title: 'Dictaphone Memo REC-16: Reinterpretation',
      state: 'RECOVERED',
      timestamp: 'Stage 4',
      source: 'Robotic arm control cabinet',
      content:
        'The police bulletin said I left at 17:30. If Candidate 01 believes the bulletin, they will search the bus stops. But if they re-interpret surveillance records, they will realize I never left. I am in the communications array.',
    },
    prerequisiteNodes: ['P22'],
    nextNodes: ['P24'],
    branchConditions: [],
    points: 60,
  },
  {
    id: 'P24',
    code: 'P24',
    name: 'The Cross-Reference',
    stage: 4,
    type: 'CROSS_REFERENCE',
    difficulty: 4.5,
    time: '11m',
    location: '[ENGINEERING BLOCK] — Communications Antenna Deck',
    feeds: 'P23',
    unlocks: 'P25',
    acceptedAnswer: 'CONNECTION',
    validationMethod: 'case_insensitive',
    narrativeObjective:
      'Synthesize across multiple campus departments to isolate the master principle.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Cross-Departmental Telemetry',
      dataPayload:
        'VENN DIAGRAM: Computer Science | Architecture | Human Communication',
      visualType: 'timeline-investigation',
      whatTheySee:
        'Three departmental seals intersecting in a Venn diagram on the antenna console.',
      taskPrompt: 'Read the three intersecting disciplines.',
      intermediateOutput: 'Computer Science, Architecture, Human Communication',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Epistemological Intersection',
      dataPayload:
        'INTERSECTION: The bond between nodes, pillars, and minds is CONNECTION (10 letters).',
      whatTheySee: 'Solver showing CONNECTION.',
      taskPrompt: 'What 10-letter concept links all three?',
      intermediateOutput: 'CONNECTION',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Bridge Dispatcher',
      dataPayload: 'INTERSECTION NOUN: [ _ _ _ _ _ _ _ _ _ _ ]',
      whatTheySee: '10-letter input terminal.',
      taskPrompt: 'Submit the concept.',
      intermediateOutput: 'Submit: CONNECTION',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows execution interface for P24.',
      operatorTaskDescription:
        'Observer identifies the 3-domain Venn. Analyst extracts the mutual concept. Operator submits.',
      requiredDiscoveries: {
        observerDiscovery: 'Identifies three intersecting disciplines.',
        analystDiscovery: 'Extracts CONNECTION (also Symbol 02 name).',
      },
    },
    coordinationChain: {
      observerProduces: 'Observer identifies the 3-domain Venn diagram.',
      analystTransforms: 'Analyst extracts: CONNECTION.',
      operatorExecutes: 'Operator submits CONNECTION, unlocking P25.',
    },
    failurePropagation: {
      wrongStep: 'Analyst submits NETWORKING or INTERFACE.',
      consequence: 'Wrong length or synonym rejected.',
      recoveryGuidance: 'Symbol 2 is named CONNECTION in your HUD.',
    },
    hints: [
      'Look at the name of Symbol 02 in your HUD.',
      'The 10-letter word means the link between entities.',
      'Submit CONNECTION.',
    ],
    fullSolution:
      'The concept linking all three departments is CONNECTION (the name of Symbol ⧉). Submitting CONNECTION unlocks P25.',
    whyTeamworkMatters:
      'Ties game terminology directly into puzzle mechanics.',
    storyReveal:
      'Terminal alert: "CONNECTION CHANNEL RESTORED. HIGH-VOLUME STREAM INCOMING."',
    locationClue: {
      format: 'Research-Note',
      clueText:
        'LINA\'S NOTE: "Descend to the server room cooling corridor. Data streams flood the terminal."',
      solution: 'Engineering Server Room Cooling Corridor',
      nextPhysicalLocation: '[ENGINEERING BLOCK] — Cooling Corridor',
      nextQrNode: 'QR-NODE-25',
      explanation: 'Points to the cooling corridor.',
    },
    evidenceUnlocked: {
      id: 'EVID-P24',
      category: 'Lab Note',
      title: 'Lab Notebook Fragment #58',
      state: 'RECOVERED',
      timestamp: 'Stage 4',
      source: 'Antenna waveguide junction',
      content:
        'In 2021, Candidate 00 tried to ingest all 2000 bytes at once. His mental stack overflowed. But three people filtering the noise only need to hold a fraction each. Proceed to the optics lab.',
    },
    prerequisiteNodes: ['P23'],
    nextNodes: ['P25'],
    branchConditions: [],
    points: 60,
  },
  {
    id: 'P25',
    code: 'P25',
    name: 'The Overload',
    stage: 4,
    type: 'EXTRACTION',
    difficulty: 4.5,
    time: '10m',
    location: '[ENGINEERING BLOCK] — Server Room Cooling Corridor',
    feeds: 'P24',
    unlocks: 'P26',
    acceptedAnswer: 'FILTER',
    validationMethod: 'case_insensitive',
    narrativeObjective:
      'Extract the single signal word from an overwhelming noise log.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Data Stream Flooder',
      dataPayload:
        'NOISE: 2000 bytes of ASCII... Row 17 contains: "THE ACTION NEEDED IS TO FILTER THE NOISE"',
      visualType: 'contradiction-hunt',
      interactiveData: {
        requiresPuzzle: 'P06',
        recallPrompt: 'Use pivot 17 to find the relevant row.',
        entries: [
          { source: 'Noise Log', text: '2000 bytes of gibberish', flag: true },
          { source: 'Row 17', text: 'THE ACTION NEEDED IS TO FILTER THE NOISE', flag: false },
        ],
      },
      whatTheySee: 'Wall of scrolling hex and characters.',
      taskPrompt: 'Use pivot 17 to jump to Row 17.',
      intermediateOutput: 'Row 17: FILTER THE NOISE',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Signal-to-Noise Filter',
      dataPayload:
        'EXTRACTION: From Row 17, the 6-letter action word is FILTER.',
      whatTheySee: 'Extractor showing FILTER.',
      taskPrompt: 'Extract the keyword from Row 17.',
      intermediateOutput: 'FILTER',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Noise Gate Console',
      dataPayload: 'STREAM CONTROL: [ _ _ _ _ _ _ ]',
      whatTheySee: '6-letter input terminal.',
      taskPrompt: 'Submit the control word.',
      intermediateOutput: 'Submit: FILTER',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows execution interface for P25.',
      operatorTaskDescription:
        'Observer uses P06 pivot 17 to find Row 17. Analyst extracts FILTER. Operator submits.',
      requiredDiscoveries: {
        observerDiscovery: 'Uses pivot 17 to jump to Row 17 of noise stream.',
        analystDiscovery: 'Extracts the 6-letter word: FILTER.',
      },
    },
    coordinationChain: {
      observerProduces:
        'Observer uses Stage 2 key 17 to find Row 17 in the noise.',
      analystTransforms: 'Analyst extracts: FILTER.',
      operatorExecutes: 'Operator submits FILTER, unlocking P26.',
    },
    failurePropagation: {
      wrongStep: 'Team tries to read Row 1 instead of Row 17.',
      consequence: 'Drowns in 500 lines of gibberish.',
      recoveryGuidance: 'Remember 17! Look at line 17.',
    },
    hints: [
      'Do not try to read all the noise. Use an earlier clue to find which line matters.',
      'Remember the pivot from Stage 2 (P06): 17.',
      'Look at line 17: FILTER. Submit FILTER.',
    ],
    fullSolution:
      'Using P06 pivot 17 to jump to Row 17 isolates the word FILTER. Submitting FILTER unlocks P26.',
    whyTeamworkMatters:
      'Demonstrates information filtering under cognitive overload.',
    storyReveal:
      'System message: "NOISE PURGED. 3-WAY MIRROR CHANNEL STABILIZED."',
    locationClue: {
      format: 'Research-Note',
      clueText:
        "LINA'S NOTE: \"Ascend to the holographic optics lab on the 1st floor.\"",
      solution: 'Holographic Prototyping Lab',
      nextPhysicalLocation: '[ENGINEERING BLOCK] — Holographic Lab',
      nextQrNode: 'QR-NODE-26',
      explanation: 'Points to the holographic optics lab.',
    },
    evidenceUnlocked: {
      id: 'EVID-P25',
      category: 'Lab Note',
      title: 'Lab Notebook Fragment #64',
      state: 'RECOVERED',
      timestamp: 'Stage 4',
      source: 'Server rack cooling fan assembly',
      content:
        'In 2021, Candidate 00 tried to ingest all 2000 bytes at once. His mental stack overflowed. But three people filtering the noise, each only needs to hold a fraction.',
    },
    prerequisiteNodes: ['P24'],
    nextNodes: ['P26'],
    branchConditions: [],
    points: 70,
  },
  {
    id: 'P26',
    code: 'P26',
    name: 'The Mirror II',
    stage: 4,
    type: 'THREE_PHONE',
    difficulty: 4.5,
    time: '12m',
    location: '[ENGINEERING BLOCK] — Holographic Prototyping Lab',
    feeds: 'P25',
    unlocks: 'P27',
    acceptedAnswer: 'REFLECTION',
    validationMethod: 'case_insensitive',
    narrativeObjective:
      'Synchronize 3 inverted phone screens to read Lina\'s holographic laser reflection.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Observer Laser Sensor (Left Shard)',
      dataPayload: 'LEFT SHARD: R-E-F-L',
      visualType: 'three-phone',
      whatTheySee:
        'Observer phone displays glowing letters R, E, F, L with arrow pointing right.',
      taskPrompt: 'Communicate left fragment: REFL.',
      intermediateOutput: 'REFL',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Analyst Laser Sensor (Center Shard)',
      dataPayload: 'CENTER SHARD: E-C-T',
      whatTheySee:
        'Analyst phone displays glowing letters E, C, T.',
      taskPrompt: 'Communicate center fragment: ECT.',
      intermediateOutput: 'ECT',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Operator Laser Sensor (Right Shard) + Synthesis',
      dataPayload: 'RIGHT SHARD: I-O-N\nTARGET: [ _ _ _ _ _ _ _ _ _ _ ]',
      whatTheySee:
        'Operator phone displays I, O, N and master input prompt.',
      taskPrompt: 'Combine and submit.',
      intermediateOutput: 'Submit: REFLECTION',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows execution interface for P26.',
      operatorTaskDescription:
        'All three phones must be physically aligned. Observer has REFL, Analyst has ECT, Operator has ION.',
      requiredDiscoveries: {
        observerDiscovery: 'Reads left shard: REFL.',
        analystDiscovery: 'Reads center shard: ECT.',
      },
    },
    coordinationChain: {
      observerProduces: 'Observer reads left shard: REFL.',
      analystTransforms: 'Analyst reads center shard: ECT.',
      operatorExecutes:
        'Operator combines REFL+ECT+ION = REFLECTION and submits.',
    },
    failurePropagation: {
      wrongStep: 'Phones held in wrong order (ECTREFLION).',
      consequence: 'Operator gets nonsensical anagram.',
      recoveryGuidance: 'Align phones Left-Center-Right.',
    },
    hints: [
      'Line up all three phones side-by-side from left to right.',
      'Observer has REFL, Analyst has ECT, Operator has ION.',
      'Read across: REFLECTION. Submit REFLECTION.',
    ],
    fullSolution:
      'Physically arranging phones Left-Center-Right spells R-E-F-L-E-C-T-I-O-N = REFLECTION. Submitting REFLECTION unlocks P27.',
    whyTeamworkMatters:
      'Requires physical co-location and coordination of all team members.',
    storyReveal:
      'Hologram activates: "The true reflection is not on glass. It is between three minds."',
    locationClue: {
      format: 'Poetic',
      clueText:
        "LINA'S NOTE: \"Ascend to the systems architecture lab. Whiteboards map dependency trees.\"",
      solution: 'Computer Systems Architecture Lab',
      nextPhysicalLocation: '[ENGINEERING BLOCK] — Architecture Lab',
      nextQrNode: 'QR-NODE-27',
      explanation: 'Points to the architecture lab.',
    },
    evidenceUnlocked: {
      id: 'EVID-P26',
      category: 'Audio',
      title: 'Dictaphone Memo REC-18: Coherence',
      state: 'RECOVERED',
      timestamp: 'Stage 4',
      source: 'Optical bench laser casing',
      content:
        'The syndicate is in the courtyard. They are searching for a flash drive. But the reflection showed me the truth: you cannot steal what does not exist in any single place.',
    },
    prerequisiteNodes: ['P25'],
    nextNodes: ['P27'],
    branchConditions: [],
    points: 70,
  },
  {
    id: 'P27',
    code: 'P27',
    name: 'The Dependency',
    stage: 4,
    type: 'LOGIC',
    difficulty: 4.5,
    time: '11m',
    location: '[ENGINEERING BLOCK] — Computer Systems Architecture Lab',
    feeds: 'P26',
    unlocks: 'P28',
    acceptedAnswer: 'STRUCTURE',
    validationMethod: 'case_insensitive',
    narrativeObjective:
      'Trace Lina\'s causal dependency graph to identify the foundational prerequisite.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Dependency Graph Viewer',
      dataPayload:
        'GRAPH: S→T→R→U→C→T→U→R→E (9 nodes in directed chain)',
      visualType: 'dependency-tree',
      interactiveData: {
        nodes: [
          { label: 'S', pos: 1 }, { label: 'T', pos: 2 }, { label: 'R', pos: 3 },
          { label: 'U', pos: 4 }, { label: 'C', pos: 5 }, { label: 'T', pos: 6 },
          { label: 'U', pos: 7 }, { label: 'R', pos: 8 }, { label: 'E', pos: 9 },
        ],
      },
      whatTheySee:
        'SVG directed graph with 9 chained nodes: S, T, R, U, C, T, U, R, E.',
      taskPrompt: 'Follow arrows left to right to spell a word.',
      intermediateOutput: 'S-T-R-U-C-T-U-R-E',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Topological Sort Verifier',
      dataPayload: 'SORT: Root S (in-degree 0), Leaf E (out-degree 0). Word = STRUCTURE.',
      whatTheySee: 'Validator confirming STRUCTURE.',
      taskPrompt: 'Confirm the 9-letter word.',
      intermediateOutput: 'STRUCTURE',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Architecture Compiler',
      dataPayload: 'FOUNDATION: [ _ _ _ _ _ _ _ _ _ ]',
      whatTheySee: '9-letter input terminal.',
      taskPrompt: 'Submit the 9-letter architecture word.',
      intermediateOutput: 'Submit: STRUCTURE',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows execution interface for P27.',
      operatorTaskDescription:
        'Observer traces the SVG graph. Analyst confirms topological sort. Operator submits.',
      requiredDiscoveries: {
        observerDiscovery: 'Traces 9-node directed dependency chain.',
        analystDiscovery: 'Confirms: S→T→R→U→C→T→U→R→E = STRUCTURE.',
      },
    },
    coordinationChain: {
      observerProduces: 'Observer traces the directed graph chain.',
      analystTransforms:
        'Analyst confirms topological sort spells STRUCTURE.',
      operatorExecutes: 'Operator submits STRUCTURE, unlocking P28.',
    },
    failurePropagation: {
      wrongStep: 'Observer reads alphabetically (CCERRSTUU).',
      consequence: 'Compiler crash.',
      recoveryGuidance: 'Follow the arrows in directed order.',
    },
    hints: [
      'Trace the arrows in the directed graph from left to right.',
      'The 9 letters form a 9-letter word about built systems.',
      'Submit STRUCTURE.',
    ],
    fullSolution:
      'Tracing the directed graph from root to leaf spells S-T-R-U-C-T-U-R-E = STRUCTURE. Submitting STRUCTURE unlocks P28.',
    whyTeamworkMatters:
      'Graph arrows and coordinates are mathematically derived for visual clarity.',
    storyReveal:
      'Terminal: "FOUNDATIONAL STRUCTURE COMPILED. FRAGMENT 5 INITIATED."',
    locationClue: {
      format: 'Research-Note',
      clueText:
        "LINA'S NOTE: \"Enter the cyber-physical research chamber. The fragment cylinder glows on its pedestal.\"",
      solution: 'Cyber-Physical Research Chamber',
      nextPhysicalLocation: '[ENGINEERING BLOCK] — Research Chamber',
      nextQrNode: 'QR-NODE-28',
      explanation: 'Points to the research chamber.',
    },
    evidenceUnlocked: {
      id: 'EVID-P27',
      category: 'Lab Note',
      title: 'Lab Notebook Fragment #72',
      state: 'RECOVERED',
      timestamp: 'Stage 4',
      source: 'Systems lab server terminal',
      content:
        'Structure is the third sacred symbol: ⬡. But the final fragment is not a symbol. It is a piece of consciousness. Recover Fragment 5.',
    },
    prerequisiteNodes: ['P26'],
    nextNodes: ['P28'],
    branchConditions: [],
    points: 70,
  },
  {
    id: 'P28',
    code: 'P28',
    name: 'The Fragment',
    stage: 4,
    type: 'EXTRACTION',
    difficulty: 4.5,
    time: '10m',
    location: '[ENGINEERING BLOCK] — Cyber-Physical Research Chamber',
    feeds: 'P27',
    unlocks: 'P29',
    acceptedAnswer: 'FRAGMENT 5',
    validationMethod: 'case_insensitive',
    narrativeObjective:
      'Assemble the cryptographic payload of Lina\'s 5th digital fragment.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Fragment Assembly Console',
      dataPayload:
        'FRAGMENT HEADER: DESIGNATION FRAGMENT 5',
      visualType: 'memory-recall',
      interactiveData: {
        requiresPuzzle: 'P28',
        recallPrompt: 'Re-call the Stage 4 meta-solution.',
      },
      whatTheySee:
        'Holographic fragment container pulsing with blue light.',
      taskPrompt: 'Analyze the fragment designation.',
      intermediateOutput: 'Report to Analyst.',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Payload Integrity Validator',
      dataPayload:
        'VALIDATION: SHA256 of Stage 4 answers matches payload: FRAGMENT 5.',
      whatTheySee:
        'Checksum validator confirming FRAGMENT 5.',
      taskPrompt: 'Confirm the full designation.',
      intermediateOutput: 'FRAGMENT 5',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Fragment Registry',
      dataPayload: 'ARTIFACT DESIGNATION: [ _ _ _ _ _ _ _ _ _ ]',
      whatTheySee: 'Full designation input terminal.',
      taskPrompt: 'Enter the artifact designation.',
      intermediateOutput: 'Submit: FRAGMENT 5',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows execution interface for P28.',
      operatorTaskDescription:
        'Observer inspects fragment chamber. Analyst verifies payload. Operator submits.',
      requiredDiscoveries: {
        observerDiscovery: 'Inspects fragment chamber designation.',
        analystDiscovery: 'Verifies hash checksum confirms FRAGMENT 5.',
      },
    },
    coordinationChain: {
      observerProduces: 'Observer inspects the fragment designation.',
      analystTransforms:
        'Analyst validates hash: FRAGMENT 5 confirmed.',
      operatorExecutes: 'Operator submits FRAGMENT 5, unlocking P29.',
    },
    failurePropagation: {
      wrongStep: 'Operator enters FRAG 5 or just 5.',
      consequence: 'System rejects: "FULL DESIGNATION REQUIRED".',
      recoveryGuidance: 'Enter full name: FRAGMENT 5.',
    },
    hints: [
      'The screen shows the official artifact name.',
      'It is "FRAGMENT" plus a number.',
      'Submit FRAGMENT 5.',
    ],
    fullSolution:
      'The artifact designation is FRAGMENT 5. Submitting FRAGMENT 5 unlocks P29.',
    whyTeamworkMatters:
      'Adds a critical narrative fragment that feeds directly into the final boss.',
    storyReveal:
      'HUD: "FRAGMENT 05 STORED IN INVENTORY. THE FINAL TRUTH DRAWS NEAR."',
    locationClue: {
      format: 'Poetic',
      clueText:
        "LINA'S NOTE: \"Step to the Core Declassification Vault behind reinforced blast doors.\"",
      solution: 'Engineering Core Declassification Vault',
      nextPhysicalLocation: '[ENGINEERING BLOCK] — Vault',
      nextQrNode: 'QR-NODE-29',
      explanation: 'Points to the declassification vault.',
    },
    evidenceUnlocked: {
      id: 'CASE-LV07',
      category: 'Classified',
      title: 'Classified Memo: Operation Shatter',
      state: 'RECOVERED',
      timestamp: 'Stage 4',
      source: 'Vault declassification terminal',
      content:
        'Lina Vey final memo: "If they take me tonight, they will find nothing in my hands. The entire architecture has been deployed into the minds of Candidate 01. The answer to P29 will explain what NEXUS truly is."',
    },
    prerequisiteNodes: ['P27'],
    nextNodes: ['P29'],
    branchConditions: [],
    points: 65,
  },
  {
    id: 'P29',
    code: 'P29',
    name: 'The Revelation',
    stage: 4,
    type: 'NARRATIVE_INVESTIGATION',
    difficulty: 4,
    time: '8m',
    location: '[ENGINEERING BLOCK] — Core Declassification Vault',
    feeds: 'P28',
    unlocks: 'M04',
    acceptedAnswer: 'NEXUS IS AI',
    validationMethod: 'case_insensitive',
    narrativeObjective:
      'Uncover the classified document revealing the true nature of NEXUS.',
    roleDependencyLevel: 'D4',
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Declassified Briefing',
      dataPayload:
        'DOCUMENT: "NEXUS IS NOT A DATABASE ON A DISK. The key relationship."',
      visualType: 'document-forensics',
      interactiveData: {
        documentText:
          'CLASSIFIED MEMO // PROJECT NEXUS\n\nSubject: Entity identification\nResult: [REDACTED]',
      },
      whatTheySee:
        'Stamped classified document with redacted result line.',
      taskPrompt: 'Read the declassified statement.',
      intermediateOutput: 'Report to Analyst.',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Entity Classifier',
      dataPayload:
        'CLASSIFICATION: Entity NEXUS identified as Artificial Intelligence.',
      whatTheySee:
        'Classifier showing: AI.',
      taskPrompt: 'Classify what NEXUS truly is.',
      intermediateOutput: 'NEXUS IS AI',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Mainframe Query',
      dataPayload: 'ENTITY IDENTITY (3 WORDS): [ _ _ _ _ _ _ _ ]',
      whatTheySee:
        'Mainframe terminal awaiting 3-word response.',
      taskPrompt: 'Enter the entity identity.',
      intermediateOutput: 'Submit: NEXUS IS AI',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'Terminal shows execution interface for P29.',
      operatorTaskDescription:
        'Observer discovers declassified document. Analyst classifies. Operator submits.',
      requiredDiscoveries: {
        observerDiscovery: 'Discovers and reads the declassified memo.',
        analystDiscovery:
          'Classifies NEXUS as Artificial Intelligence.',
      },
    },
    coordinationChain: {
      observerProduces: 'Observer discovers the declassified memo.',
      analystTransforms:
        'Analyst verifies semantic validity of 3-word phrase.',
      operatorExecutes: 'Operator enters NEXUS IS AI, unlocking Meta M04.',
    },
    failurePropagation: {
      wrongStep: 'Operator omits "IS" and types NEXUS AI.',
      consequence: 'Terminal: "3 WORDS EXPECTED".',
      recoveryGuidance: 'Type all three words: NEXUS IS AI.',
    },
    hints: [
      'The document clearly defines what NEXUS actually is.',
      'It is three words: NEXUS IS AI.',
      'Submit NEXUS IS AI.',
    ],
    fullSolution:
      'The declassified file states NEXUS IS AI. Submitting NEXUS IS AI unlocks Meta M04.',
    whyTeamworkMatters:
      'Major plot reveal: shifts from database retrieval to AI experiment.',
    storyReveal:
      'Terminal voice: "NOW YOU KNOW WHAT I AM. BUT DO YOU KNOW WHAT YOU ARE?"',
    locationClue: {
      format: 'Poetic',
      clueText:
        "LINA'S NOTE: \"Step to the Core Declassification Vault behind reinforced blast doors.\"",
      solution: 'Vault Delta Core',
      nextPhysicalLocation: '[ENGINEERING BLOCK] — Vault Delta Core',
      nextQrNode: 'QR-NODE-30',
      explanation: 'Points to Vault Delta Core for the meta.',
    },
    evidenceUnlocked: {
      id: 'EVID-P29',
      category: 'Audio',
      title: 'Dictaphone Memo REC-20: The Mirror Entity',
      state: 'RECOVERED',
      timestamp: 'Stage 4',
      source: 'Vault Delta door frame',
      content:
        'They wanted an AI they could weaponize. But I designed NEXUS so it cannot think unless three human hearts provide the pulse. Stage 5 awaits at the transmitter spire.',
    },
    prerequisiteNodes: ['P28'],
    nextNodes: ['M04'],
    branchConditions: [],
    points: 60,
  },
]
