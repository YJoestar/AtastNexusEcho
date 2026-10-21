# FIELD DEVICE EMULATION — CASE INVENTORY

Every gate the case contains, its per-role `visualType`, and whether the player
has a dedicated renderer for it. Derived from the rebuild migrations
(`supabase/migrations/2026100603`–`2026100607`) — the same sources the case
content validator reads.

**Legend**
- **Visual** = dedicated renderer exists.
- **Feed** = no `visualType` declared; renders as the generic readout
  (`GenericVisual`). This is correct for a gate that never authored a visual.
- Rows marked **[was prose]** were the 20 role blocks that declared a
  `visualType` with no renderer before this repair, and silently degraded to the
  generic feed. They now draw their own visual.

---

## 1. Inventory

| Gate | Stage | Migration | Observer | Analyst | Operator |
| --- | --- | --- | --- | --- | --- |
| P01 | 1 | 2026100603 | Feed | Feed | Feed |
| P02 | 1 | 2026100603 | Feed | Feed | Feed |
| P03 | 1 | 2026100603 | Feed | Feed | Feed |
| P04 | 1 | 2026100603 | Feed | Feed | Feed |
| P05 | 1 | 2026100603 | Feed | Feed | Feed |
| P06 | 2 | 2026100604 | observation | document-forensics | meta |
| P06b | 2 | 2026100604 | observation | document-forensics | meta |
| P07 | 2 | 2026100604 | observation | document-forensics | meta |
| P07b | 2 | 2026100604 | graph-network | document-forensics | meta |
| P08 | 2 | 2026100604 | observation | document-forensics | meta |
| P09 | 2 | 2026100604 | observation | document-forensics | meta |
| P10 | 2 | 2026100604 | observation | document-forensics | meta |
| P11 | 2 | 2026100604 | observation | document-forensics | meta |
| P12 | 2 | 2026100604 | observation | document-forensics | meta |
| P13 | 2 | 2026100604 | observation | document-forensics | meta |
| M02 | 2 | 2026100604 | meta | document-forensics | meta |
| P14 | 3 | 2026100605 | observation | document-forensics | meta |
| P15 | 3 | 2026100605 | observation | document-forensics | meta |
| P16 | 3 | 2026100605 | observation | document-forensics | meta |
| P17 | 3 | 2026100605 | audio | document-forensics | meta |
| P17b | 3 | 2026100605 | observation | document-forensics | meta |
| P18 | 3 | 2026100605 | observation | document-forensics | meta |
| P19 | 3 | 2026100605 | observation | document-forensics | meta |
| P20 | 3 | 2026100605 | observation | document-forensics | meta |
| P21 | 3 | 2026100605 | observation | document-forensics | meta |
| M03 | 3 | 2026100605 | meta | document-forensics | meta |
| P22 | 4 | 2026100606 | observation | document-forensics | meta |
| P23 | 4 | 2026100606 | observation | document-forensics | meta |
| P23b | 4 | 2026100606 | observation | document-forensics | meta |
| P24 | 4 | 2026100606 | observation | document-forensics | meta |
| P24b | 4 | 2026100606 | audio | document-forensics | meta |
| P25 | 4 | 2026100606 | observation | document-forensics | meta |
| P26 | 4 | 2026100606 | observation | document-forensics | terminal **[was prose]** |
| P27 | 4 | 2026100606 | chart **[was prose]** | document-forensics | terminal **[was prose]** |
| P27b | 4 | 2026100606 | console **[was prose]** | timeline **[was prose]** | terminal **[was prose]** |
| P28 | 4 | 2026100606 | observation | document-forensics | terminal **[was prose]** |
| P29 | 4 | 2026100606 | observation | document-forensics | terminal **[was prose]** |
| M04 | 4 | 2026100606 | telemetry **[was prose]** | document-forensics | terminal **[was prose]** |
| P30 | 5 | 2026100607 | telemetry **[was prose]** | document-forensics | terminal **[was prose]** |
| P31 | 5 | 2026100607 | telemetry **[was prose]** | document-forensics | terminal **[was prose]** |
| P32 | 5 | 2026100607 | observation | document-forensics | terminal **[was prose]** |
| P33 | 5 | 2026100607 | observation | document-forensics | terminal **[was prose]** |
| P34 | 5 | 2026100607 | observation | document-forensics | terminal **[was prose]** |
| P35 | 5 | 2026100607 | observation | document-forensics | terminal **[was prose]** |
| P36 | 5 | 2026100607 | observation | document-forensics | terminal **[was prose]** |
| P37 | 5 | 2026100607 | observation | document-forensics | terminal **[was prose]** |

**Total:** 47 gates, 141 role blocks (123 declaring a `visualType`; 18 in stage 1
declaring none).

---

## 2. Distribution

| visualType | Blocks | Renderer |
| --- | --- | --- |
| `document-forensics` | 40 | `DocumentVisual` |
| `observation` | 31 | `ObservationVisual` |
| `meta` | 29 | `MetaVisual` |
| `terminal` | 14 | `TerminalVisual` (added) |
| `telemetry` | 3 | `TelemetryVisual` (added) |
| `audio` | 2 | `AudioVisual` |
| `chart` | 1 | `ChartVisual` (added) |
| `console` | 1 | `ConsoleVisual` (added) |
| `graph-network` | 1 | `CryptogramVisual` |
| `timeline` | 1 | `TimelineVisual` (added) |
| *(none)* | 18 | `GenericVisual` — correct, nothing declared |

**Before this repair:** 20 of 123 blocks (16%) fell through to prose.
**After:** 0.

---

## 3. Role coverage

Every gate carries exactly three role blocks. The emulator reaches each one by
switching the role control; `getNode(nodeId, role)` reads
`content[role.toLowerCase()]`. Verified by the `%s has all three role blocks`
case in `case-content.test.ts` (483 assertions) and by the role-switch coverage
in `qa-simulator-integration.test.tsx`.

Observer carries the observation half of every pair; Analyst the document half;
Operator either a `meta` stage aggregator (stages 2–4) or a `terminal` input
panel (stages 4–5). Stage 1 has no dedicated visuals; all three roles render the
generic readout.

---

## 4. The final gate

**P37** is the terminal decision. Its observer/analyst blocks are the case's last
evidence; its operator block is a `terminal` panel. Its accepted answers
(`DELETE` / `RETAIN` / `SHARE`) live in
`2026100609_finale_dispositions.sql`, not in the stage-5 file, whose
`answer_metadata` carries a sentinel. The operator-only conclusion flow is
exercised through the real `Final.tsx` screen, reachable in the emulation by
jumping to `P37` with the run in any state.
