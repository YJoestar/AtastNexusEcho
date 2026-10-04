# NEXUS ECHO — Evidence showcase

The showcase is the admin module **M-12 EVIDENCE ARCHIVE** at `/admin/evidence-showcase` (deep link `?type=SURVEILLANCE&code=CAM-07`). It lists the 66 NX-037 records grouped by the 8 real media, and OPEN / INSPECT opens the same inspection component players use. It reads the development catalog, labelled SIMULATION DATA; in a production build the catalog is empty and it shows an empty state.

Every image below is a real capture of the running application (Chromium via Playwright against `npm run dev`): `node scripts/screenshots/capture.mjs`. Desktop is 1440×900, mobile is 390×844 at 2x with touch emulation. The script fails a capture on console errors, broken images, horizontal overflow or pending loading states; the final run reported **32/32 clean**. `capture-report.json` has the detail, and the contact sheet is `docs/evidence-screenshots/evidence-showcase-contact-sheet.png`. Dev-only note: the capture uses a DEV-only admin bypass (`src/lib/devAdminBypass.ts`: needs `import.meta.env.DEV` and a localStorage flag, never SUPER_ADMIN, covered by a test that proves it off when DEV is false). The backend is absent in these captures, so requests that leave the dev server are aborted.

![contact sheet](docs/evidence-screenshots/evidence-showcase-contact-sheet.png)

Only the 8 media in the NX-037 canon appear. Emails, letters, posters, receipts, lab reports, video tapes and similar types were not built, because the story contains no such records (see `EVIDENCE_IMPLEMENTATION_AUDIT.md`).

## 01 · PHOTOGRAPH

- **Purpose:** Place and time a scene.
- **Visual treatment:** A developed print in a border with caption strip, lens/flash/grain.
- **Interaction:** Pan, pinch/zoom, enhance (view only), mark area, annotate, compare, add to board. Print data (device, time, location) is a collapsible secondary strip.
- **Notes / weaknesses:** Frame stands on the real thumbnail; only B-07 (blown out) and B-12 are hard to read, by design.

| Library (desktop) | Inspection (desktop) |
|---|---|
| ![](docs/evidence-screenshots/desktop-01-photograph-library.png) | ![](docs/evidence-screenshots/desktop-01-photograph-inspection.png) |

| Library (mobile) | Inspection (mobile) |
|---|---|
| ![](docs/evidence-screenshots/mobile-01-photograph-library.png) | ![](docs/evidence-screenshots/mobile-01-photograph-inspection.png) |

## 02 · SURVEILLANCE

- **Purpose:** The machine record of the same minutes.
- **Visual treatment:** CRT monitor with bezel and scan lines, on-screen date/camera/frame readout.
- **Interaction:** Frame stepper through the real tape series, a timeline placed by capture time, and the offset from the case key time (CAM-06 reads 1 min 11 s before; CAM-07 the same instant). Play/pause exists only for a record with a video URL; none has one, so it says STILL FRAME - NO VIDEO ATTACHED.
- **Notes / weaknesses:** No footage exists, and none was faked.

| Library (desktop) | Inspection (desktop) |
|---|---|
| ![](docs/evidence-screenshots/desktop-02-surveillance-library.png) | ![](docs/evidence-screenshots/desktop-02-surveillance-inspection.png) |

| Library (mobile) | Inspection (mobile) |
|---|---|
| ![](docs/evidence-screenshots/mobile-02-surveillance-library.png) | ![](docs/evidence-screenshots/mobile-02-surveillance-inspection.png) |

## 03 · DOCUMENT

- **Purpose:** Institutional record: ledgers, registry forms.
- **Visual treatment:** Typeset form on paper stock with stamps and redactions.
- **Interaction:** Reading surface with pan/zoom; issuing source and a date-precision note (for example MONTH ONLY - DAY NOT RECORDED); annotate; compare.
- **Notes / weaknesses:** Documents point at things more than they conflict (15 of 31 endpoints are REFERENCE).

| Library (desktop) | Inspection (desktop) |
|---|---|
| ![](docs/evidence-screenshots/desktop-03-document-library.png) | ![](docs/evidence-screenshots/desktop-03-document-inspection.png) |

| Library (mobile) | Inspection (mobile) |
|---|---|
| ![](docs/evidence-screenshots/mobile-03-document-library.png) | ![](docs/evidence-screenshots/mobile-03-document-inspection.png) |

## 04 · FRAGMENT

- **Purpose:** Partial physical recovery that only completes against another record.
- **Visual treatment:** Torn, burned or stained sheet in a dark tray; outline follows the condition.
- **Interaction:** Damage readout (condition, state, integrity, found at) and a tappable FITS WITH list from real relationships.
- **Notes / weaknesses:** No fragment carries a TEMPORAL clue, so it never joins the timeline comparison.

| Library (desktop) | Inspection (desktop) |
|---|---|
| ![](docs/evidence-screenshots/desktop-04-fragment-library.png) | ![](docs/evidence-screenshots/desktop-04-fragment-inspection.png) |

| Library (mobile) | Inspection (mobile) |
|---|---|
| ![](docs/evidence-screenshots/mobile-04-fragment-library.png) | ![](docs/evidence-screenshots/mobile-04-fragment-inspection.png) |

## 05 · NOTE

- **Purpose:** Informal testimony that usually disagrees with the formal record.
- **Visual treatment:** Ruled observation sheet, ballpoint handwriting (Caveat, vendored, OFL).
- **Interaction:** HANDWRITING INSPECTION toggle (200% zoom, high contrast, undone when switched off); annotate; compare.
- **Notes / weaknesses:** Least connected medium. Repeated letters are visibly identical glyphs; sheets look sparse because Caveat is narrow.

| Library (desktop) | Inspection (desktop) |
|---|---|
| ![](docs/evidence-screenshots/desktop-05-note-library.png) | ![](docs/evidence-screenshots/desktop-05-note-inspection.png) |

| Library (mobile) | Inspection (mobile) |
|---|---|
| ![](docs/evidence-screenshots/mobile-05-note-library.png) | ![](docs/evidence-screenshots/mobile-05-note-inspection.png) |

## 06 · PERSONNEL

- **Purpose:** Who a person is and which records they appear in.
- **Visual treatment:** Issued card with header band; pen annotation columns.
- **Interaction:** Inspect, zoom, facts; trace names and numbers into other records.
- **Notes / weaknesses:** P-05 is dated after the case; P-06 has no source.

| Library (desktop) | Inspection (desktop) |
|---|---|
| ![](docs/evidence-screenshots/desktop-06-personnel-library.png) | ![](docs/evidence-screenshots/desktop-06-personnel-inspection.png) |

| Library (mobile) | Inspection (mobile) |
|---|---|
| ![](docs/evidence-screenshots/mobile-06-personnel-library.png) | ![](docs/evidence-screenshots/mobile-06-personnel-inspection.png) |

## 07 · AUDIO

- **Purpose:** A second clock for the same minutes.
- **Visual treatment:** Dictaphone log card: duration, source, recorder, recorded time.
- **Interaction:** A scrubber appears only when a real audio URL exists. None does, so the card says AUDIO SOURCE / NOT ATTACHED. The earlier seeded waveform was removed as fake signal.
- **Notes / weaknesses:** Cannot be played. Needs real audio from the pipeline.

| Library (desktop) | Inspection (desktop) |
|---|---|
| ![](docs/evidence-screenshots/desktop-07-audio-library.png) | ![](docs/evidence-screenshots/desktop-07-audio-inspection.png) |

| Library (mobile) | Inspection (mobile) |
|---|---|
| ![](docs/evidence-screenshots/mobile-07-audio-library.png) | ![](docs/evidence-screenshots/mobile-07-audio-inspection.png) |

## 08 · MAP

- **Purpose:** Disputes the building itself.
- **Visual treatment:** Blueprint or cyanotype drawing on paper.
- **Interaction:** Pan/zoom, tappable LINKED RECORDS (declared relationships, records pointing back, same location).
- **Notes / weaknesses:** Same-location rule is broad: all five maps share FACILITIES ENGINEERING.

| Library (desktop) | Inspection (desktop) |
|---|---|
| ![](docs/evidence-screenshots/desktop-08-map-library.png) | ![](docs/evidence-screenshots/desktop-08-map-inspection.png) |

| Library (mobile) | Inspection (mobile) |
|---|---|
| ![](docs/evidence-screenshots/mobile-08-map-library.png) | ![](docs/evidence-screenshots/mobile-08-map-inspection.png) |

## Visual QA after the first capture

Found by reviewing the screenshots, then fixed and re-captured:

- Handwritten notes looked typed (host lacked the handwriting font): regenerated with a vendored OFL font; canonical text and the content lock are unchanged.
- Surveillance readout repeated the device and source.
- Three inspection views overflowed horizontally at 390 px.
- The ADD TO BOARD bar floated above the bottom of the admin overlay.
- The workstation system bar overlapped its own text on a phone.

## Not covered

- Interaction-state captures (stepped surveillance frame, handwriting-inspection on, zoomed fragment) are not in the set; the capture script has an extension point (`STEPS`) and the behaviours are covered by jsdom tests only.
- The investigation board with pinned records was not captured.
- No physical-device test of touch, pinch or pan. No timed end-to-end playthrough by a person: relationship navigation, frame stepping, and compare are tested in jsdom; the "case to deduction" flow has not been run by a human.
- Realism was judged against the project's own brief, not against sourced real-world references (none could be fetched).
