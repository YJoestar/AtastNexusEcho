-- Stage 1 - Intake: rebuild six gates (P01, P02, P03, P04, P05, M01) per NEXUS_CASE_MATRIX.md
-- Shape matches stages 2-3: role blocks plus top-level narrativeObjective,
-- coordinationChain / operatorInvestigation objects, and a 3-item hints array.
-- Canonical answers unchanged.

UPDATE puzzle_nodes SET
  content = '{
    "title": "The Facade",
    "screenTitle": "The Facade",
    "roleIsolated": true,
    "narrativeObjective": "Establish that the archive classifies buildings in its own run format, so the carved band is read as a call number, not decoration.",
    "coordinationChain": {
      "observerProduces": "Observer reports the carved letters and which are weathered: old lichen-stained cuts versus fresh pale additions.",
      "analystTransforms": "Analyst compares the band to the archive letter-run format and isolates the valid run.",
      "operatorExecutes": "Operator enters the recorded call number at the intake terminal."
    },
    "operatorInvestigation": {
      "operatorOwnEvidence": "The intake register field awaiting a call number, its seal date, and the filing name L. Veyr.",
      "operatorTaskDescription": "Match the derived call number to the registered filing name and submit it."
    },
    "hints": [
      "Check which marks show fresher cuts versus older weathering.",
      "Compare the band to the archive letter-run format.",
      "Exclude the later-cut mark to reach the valid run."
    ],
    "observer": {
      "role": "observer",
      "screenTitle": "Physical Inspection",
      "dataPayload": "The lintel carries a band of letter positions; weathering differs across positions.",
      "whatTheySee": "Close inspection reveals uneven lichen and tool marks.",
      "taskPrompt": "Mark which positions are original and which are recent additions.",
      "intermediateOutput": "A split between old and new marks is recorded."
    },
    "analyst": {
      "role": "analyst",
      "screenTitle": "Archive Research",
      "dataPayload": "Archive references describe a letter-run format for building codes.",
      "whatTheySee": "Index entries show each run begins with the building code.",
      "taskPrompt": "Determine which portion of the band fits the run format.",
      "intermediateOutput": "The valid run length is isolated."
    },
    "operator": {
      "role": "operator",
      "screenTitle": "Intake Terminal",
      "dataPayload": "The intake register is primed for a call number under the sealed entry.",
      "whatTheySee": "The filing name on record is noted without revealing the code.",
      "taskPrompt": "Enter the call number that matches the approved run.",
      "intermediateOutput": "The approved call number is ready for submission."
    }
  }',
  answer_metadata = '{
    "acceptedAnswer": "CDFDEFF",
    "answerType": "text",
    "caseSensitive": true,
    "normalization": "strip_non_alnum",
    "validation": { "pattern": "^[A-Z]{7}$", "minLength": 7, "maxLength": 7 }
  }',
  metadata = '{
    "type": "OBSERVATION",
    "difficulty": 2,
    "time": 6,
    "feeds": "M01",
    "storyReveal": "The band is a sealed Bureau call number filed at intake.",
    "locationClue": {
      "text": "Proceed to the lobby archive alcove.",
      "nextQrNode": "QR-NODE-02",
      "nextPhysicalLocation": "[ADMIN BUILDING] - Lobby Archive Alcove"
    },
    "evidenceUnlocked": {
      "id": "EVID-P01",
      "text": "Archive building floor plan (1974)."
    },
    "whyTeamworkMatters": "No single role sees both the cut sequence and the Bureau registration."
  }'
WHERE code = 'P01';

UPDATE puzzle_nodes SET
  content = '{
    "title": "The Clock",
    "screenTitle": "The Clock",
    "roleIsolated": true,
    "narrativeObjective": "Compare physical readings and intervention records to establish the true stopped time.",
    "coordinationChain": {
      "observerProduces": "Observer records both lobby and tower face readings and the visible discrepancy.",
      "analystTransforms": "Analyst cross-references maintenance log entries to date the tower reset relative to the lobby stop.",
      "operatorExecutes": "Operator verifies who held authority to reset the tower and confirms the true stopped time."
    },
    "operatorInvestigation": {
      "operatorOwnEvidence": "Maintenance authorization records for the tower mechanism.",
      "operatorTaskDescription": "Confirm the reset occurred after the stop and submit the true time."
    },
    "hints": [
      "One face was adjusted by hand after the incident.",
      "The log shows the tower was reset against the lobby mechanism.",
      "Since the reset postdates the stop, the lobby time is the record."
    ],
    "observer": {
      "role": "observer",
      "screenTitle": "Face Inspection",
      "dataPayload": "Two clocks show different readings at the same moment.",
      "whatTheySee": "Lobby and tower faces display a clear mismatch.",
      "taskPrompt": "Document both readings and any physical signs of tampering.",
      "intermediateOutput": "The discrepancy is noted."
    },
    "analyst": {
      "role": "analyst",
      "screenTitle": "Maintenance Records",
      "dataPayload": "Clock maintenance logs contain timing entries for service work.",
      "whatTheySee": "A specific entry references synchronizing the tower to the lobby.",
      "taskPrompt": "Date the tower reset relative to the lobby stop.",
      "intermediateOutput": "The reset is determined to be after the stop."
    },
    "operator": {
      "role": "operator",
      "screenTitle": "Authorization Check",
      "dataPayload": "Service orders list approved personnel for mechanism resets.",
      "whatTheySee": "Only authorized personnel could perform the listed reset.",
      "taskPrompt": "Verify authority and confirm the true stopped time.",
      "intermediateOutput": "Authority confirms the recorded intervention."
    }
  }',
  answer_metadata = '{
    "acceptedAnswer": "2147",
    "answerType": "text",
    "caseSensitive": true,
    "normalization": "strip_non_alnum",
    "validation": { "pattern": "^\\d{4}$", "minLength": 4, "maxLength": 4 }
  }',
  metadata = '{
    "type": "SPATIAL",
    "difficulty": 2,
    "time": 5,
    "feeds": "P01",
    "storyReveal": "The tower was reset by hand; the lobby stop is the true time.",
    "locationClue": {
      "text": "Proceed to the central staircase.",
      "nextQrNode": "QR-NODE-03",
      "nextPhysicalLocation": "[MAIN HALL] - Central Staircase"
    },
    "evidenceUnlocked": {
      "id": "EVID-P02",
      "text": "Clock maintenance log for the incident date."
    },
    "whyTeamworkMatters": "Reading alone misses the recorded intervention."
  }'
WHERE code = 'P02';

UPDATE puzzle_nodes SET
  content = '{
    "title": "The Facade Pin",
    "screenTitle": "The Facade Pin",
    "roleIsolated": true,
    "narrativeObjective": "Distinguish a file reference from a cipher and reconstruct the Bureau case-file number.",
    "coordinationChain": {
      "observerProduces": "Observer notes the four brass plates and their physical placement near the steps.",
      "analystTransforms": "Analyst orders the digits using the archive run format from intake.",
      "operatorExecutes": "Operator applies the Bureau numbering convention to read binder-shelf-file and confirm the reference."
    },
    "operatorInvestigation": {
      "operatorOwnEvidence": "Archive numbering tables for Bureau case files.",
      "operatorTaskDescription": "Confirm the parsed reference matches the filing scheme."
    },
    "hints": [
      "The four plates repeat a value seen earlier in intake.",
      "Order them by the archive letter-run to get the correct sequence.",
      "The archive reads the sequence as binder-shelf-file."
    ],
    "observer": {
      "role": "observer",
      "screenTitle": "Plate Inspection",
      "dataPayload": "Four brass plates are embedded near the facade steps.",
      "whatTheySee": "Each plate bears a single digit and shows wear patterns.",
      "taskPrompt": "Record the visible digits and their positions.",
      "intermediateOutput": "Four digits are logged."
    },
    "analyst": {
      "role": "analyst",
      "screenTitle": "Ordering",
      "dataPayload": "The intake run format provides an ordering rule.",
      "whatTheySee": "Applying the rule reorders the collected digits.",
      "taskPrompt": "Reconstruct the correct sequence.",
      "intermediateOutput": "A specific four-digit sequence is derived."
    },
    "operator": {
      "role": "operator",
      "screenTitle": "Filing Convention",
      "dataPayload": "Bureau tables map number strings to binder-shelf-file entries.",
      "whatTheySee": "The convention splits the sequence into three parts.",
      "taskPrompt": "Confirm the reference against the Bureau scheme.",
      "intermediateOutput": "The case-file reference is confirmed."
    }
  }',
  answer_metadata = '{
    "acceptedAnswer": "3425",
    "answerType": "text",
    "caseSensitive": true,
    "normalization": "strip_non_alnum",
    "validation": { "pattern": "^\\d{4}$", "minLength": 4, "maxLength": 4 }
  }',
  metadata = '{
    "type": "CIPHER",
    "difficulty": 2,
    "time": 4,
    "feeds": "P02",
    "storyReveal": "The number is a Bureau case-file reference, not a cipher key.",
    "locationClue": {
      "text": "Proceed to the archive poster wall.",
      "nextQrNode": "QR-NODE-04",
      "nextPhysicalLocation": "[ADMIN BUILDING] - Archive Poster Wall"
    },
    "evidenceUnlocked": {
      "id": "EVID-P03",
      "text": "Archive poster for project initiation."
    },
    "whyTeamworkMatters": "Placement and filing convention must align."
  }'
WHERE code = 'P03';

UPDATE puzzle_nodes SET
  content = '{
    "title": "The Poster Dates",
    "screenTitle": "The Poster Dates",
    "roleIsolated": true,
    "narrativeObjective": "Prove a physical record is a later insertion by comparing material and dates to the closure record.",
    "coordinationChain": {
      "observerProduces": "Observer flags the poster with a distinct physical profile in stock weight and ink.",
      "analystTransforms": "Analyst compares each poster date against the recorded closure date and flags any after it.",
      "operatorExecutes": "Operator checks acquisition and display records to confirm the poster was unauthorized at closure."
    },
    "operatorInvestigation": {
      "operatorOwnEvidence": "Archive acquisition and display permission records.",
      "operatorTaskDescription": "Verify the poster was not authorized at closure."
    },
    "hints": [
      "One item in the set does not match the physical profile of the others.",
      "Match the poster stock year against the recorded closure date.",
      "The mismatch means the poster was added after closure, not at it."
    ],
    "observer": {
      "role": "observer",
      "screenTitle": "Material Inspection",
      "dataPayload": "Four posters are displayed on the wall.",
      "whatTheySee": "Differences in stock weight and ink saturation are apparent.",
      "taskPrompt": "Identify which poster has a distinct physical profile.",
      "intermediateOutput": "An anomalous poster is flagged."
    },
    "analyst": {
      "role": "analyst",
      "screenTitle": "Date Comparison",
      "dataPayload": "Each poster carries a printed date.",
      "whatTheySee": "The set spans a range around the closure point.",
      "taskPrompt": "Compare each date against the recorded closure date.",
      "intermediateOutput": "One poster falls after the closure date."
    },
    "operator": {
      "role": "operator",
      "screenTitle": "Acquisition Check",
      "dataPayload": "Acquisition records track when items were added to the display.",
      "whatTheySee": "Entries show approvals tied to specific dates.",
      "taskPrompt": "Check whether the flagged poster was authorized at closure.",
      "intermediateOutput": "No authorization exists for the flagged poster at closure."
    }
  }',
  answer_metadata = '{
    "acceptedAnswer": "F",
    "answerType": "text",
    "caseSensitive": true,
    "normalization": "strip_non_alnum",
    "validation": { "pattern": "^[A-Z]$", "minLength": 1, "maxLength": 1 }
  }',
  metadata = '{
    "type": "PATTERN",
    "difficulty": 3,
    "time": 7,
    "feeds": "P03",
    "storyReveal": "One poster was added after the building closed.",
    "locationClue": {
      "text": "Proceed to the archive figure display.",
      "nextQrNode": "QR-NODE-05",
      "nextPhysicalLocation": "[ADMIN BUILDING] - Archive Figure Display"
    },
    "evidenceUnlocked": {
      "id": "EVID-P04",
      "text": "Project team roster with redacted entries."
    },
    "whyTeamworkMatters": "Material evidence and records must both confirm the insertion."
  }'
WHERE code = 'P04';

UPDATE puzzle_nodes SET
  content = '{
    "title": "The Third Figure",
    "screenTitle": "The Third Figure",
    "roleIsolated": true,
    "narrativeObjective": "Derive the full surname from physical, signature, and accreditation records rather than from any prompt.",
    "coordinationChain": {
      "observerProduces": "Observer records the etched initial on the cropped photograph frame.",
      "analystTransforms": "Analyst matches the initial to the signature block in the roster.",
      "operatorExecutes": "Operator consults accreditation records to confirm the full surname."
    },
    "operatorInvestigation": {
      "operatorOwnEvidence": "Accreditation records listing full names of project staff.",
      "operatorTaskDescription": "Confirm the surname that matches the identified lead."
    },
    "hints": [
      "The frame is cropped but not empty; an initial remains visible.",
      "Compare that initial to the roster signature block for a match.",
      "The accreditation record extends the matching signature to the full surname."
    ],
    "observer": {
      "role": "observer",
      "screenTitle": "Frame Inspection",
      "dataPayload": "A team photograph shows three figures with the third partly cropped.",
      "whatTheySee": "The display frame retains an etched initial for the cropped figure.",
      "taskPrompt": "Record the visible initial.",
      "intermediateOutput": "An initial is recorded."
    },
    "analyst": {
      "role": "analyst",
      "screenTitle": "Signature Matching",
      "dataPayload": "The project roster contains a signature block for the team.",
      "whatTheySee": "Initials in the signature block can be matched to the frame.",
      "taskPrompt": "Match the initial to the correct signature entry.",
      "intermediateOutput": "A matching signature entry is identified."
    },
    "operator": {
      "role": "operator",
      "screenTitle": "Accreditation Check",
      "dataPayload": "Accreditation records list full legal names for project staff.",
      "whatTheySee": "The matching entry full surname is recorded.",
      "taskPrompt": "Confirm the surname from the accreditation record.",
      "intermediateOutput": "The full surname is confirmed."
    }
  }',
  answer_metadata = '{
    "acceptedAnswer": "VEYR",
    "answerType": "text",
    "caseSensitive": true,
    "normalization": "strip_non_alnum",
    "validation": { "pattern": "^[A-Z]{4}$", "minLength": 4, "maxLength": 4 }
  }',
  metadata = '{
    "type": "DEDUCTION",
    "difficulty": 3,
    "time": 6,
    "feeds": "P04",
    "storyReveal": "The cropped figure is the lead; her signature gives the full surname.",
    "locationClue": {
      "text": "Proceed to the archive hidden compartment.",
      "nextQrNode": "QR-NODE-06",
      "nextPhysicalLocation": "[ADMIN BUILDING] - Archive Hidden Compartment"
    },
    "evidenceUnlocked": {
      "id": "FRAG-01",
      "text": "Fragment 1 - Vector."
    },
    "whyTeamworkMatters": "Image, signature, and accreditation must all align."
  }'
WHERE code = 'P05';

UPDATE puzzle_nodes SET
  content = '{
    "title": "The First Lock",
    "screenTitle": "The First Lock",
    "roleIsolated": true,
    "narrativeObjective": "Synthesize Stage 1 findings to name the shared handling class that closes the first stage.",
    "coordinationChain": {
      "observerProduces": "Observer confirms the shared custody annotation is present across all five exhibits.",
      "analystTransforms": "Analyst consults the class register to interpret the annotation as a handling class.",
      "operatorExecutes": "Operator checks the custody policy for the class definition and confirms the class name."
    },
    "operatorInvestigation": {
      "operatorOwnEvidence": "Bureau custody policy defining evidence classes.",
      "operatorTaskDescription": "Confirm the class name that applies to all five files."
    },
    "hints": [
      "One annotation repeats across all five Stage 1 files.",
      "The class register lists this as a defined handling class.",
      "The custody policy distinguishes it from a descriptive theme."
    ],
    "observer": {
      "role": "observer",
      "screenTitle": "Cross-Exhibit Check",
      "dataPayload": "The five Stage 1 exhibits are examined together.",
      "whatTheySee": "A consistent custody annotation appears on each item.",
      "taskPrompt": "Confirm the annotation is present on every exhibit.",
      "intermediateOutput": "All exhibits share the same annotation."
    },
    "analyst": {
      "role": "analyst",
      "screenTitle": "Class Register",
      "dataPayload": "The Bureau class register defines standard evidence classes.",
      "whatTheySee": "Entries describe handling conditions rather than content.",
      "taskPrompt": "Match the annotation to a registered class.",
      "intermediateOutput": "A registered handling class is identified."
    },
    "operator": {
      "role": "operator",
      "screenTitle": "Custody Policy",
      "dataPayload": "Custody policy documents define how classes are assigned.",
      "whatTheySee": "The policy specifies conditions under which the class applies.",
      "taskPrompt": "Confirm the class name that matches all five files.",
      "intermediateOutput": "The correct class name is confirmed."
    }
  }',
  answer_metadata = '{
    "acceptedAnswer": "LIGHT",
    "answerType": "text",
    "caseSensitive": true,
    "normalization": "strip_non_alnum",
    "validation": { "pattern": "^[A-Z]{5}$", "minLength": 5, "maxLength": 5 }
  }',
  metadata = '{
    "type": "META",
    "difficulty": 4,
    "time": 12,
    "feeds": "P05",
    "storyReveal": "All five files share the same Bureau evidence handling class.",
    "locationClue": {
      "text": "Proceed to the basement east stairwell.",
      "nextQrNode": "QR-NODE-06",
      "nextPhysicalLocation": "[LIBRARY] - Basement East Stairwell"
    },
    "evidenceUnlocked": {
      "id": "EVID-M01",
      "text": "Stage 1 meta archive access record."
    },
    "whyTeamworkMatters": "Converging observations and policy close Stage 1 as a set."
  }'
WHERE code = 'M01';
