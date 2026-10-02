# NEXUS ECHO — Design research

What was actually researched, what it changed, and what was left alone.

## Scope and honesty

Web searches were run this session for four of the named references:
**The Operator**, **Return of the Obra Dinn**, **Shadows of Doubt** and **SIGNALIS**.
The others in the brief (Observer: System Redux, Alan Wake 2, Best Served Cold,
Murder Book, ANOMAL, *Evidence*, *The Dark Arrival*) were **not** researched here;
nothing below is attributed to them. Findings come from search-result summaries,
not hands-on play, so they are used as principles, never as layouts.

## References studied

| Reference | What was learned | Used in NEXUS ECHO |
|---|---|---|
| The Operator ([Game Developer](https://www.gamedeveloper.com/design/the-operator-is-a-crime-solving-game-delivered-entirely-with-ui), [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/TheOperator)) | A 1992 desktop *is* the game: photo/video analyzer, databases, notepad. Investigation = tools, not menus. | The bureau workstation framing (already present) and evidence inspection as a tool, not a modal. |
| Return of the Obra Dinn ([Wikipedia](https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn), [Kokutech](https://www.kokutech.com/blog/gamedev/design-patterns/unique-mechanics/return-of-the-obra-dinn)) | UI structures the mystery rather than simplifying it; tools are few and limited; unconfirmed claims are not confirmed for you. | Links are **player-filed and never system-verified**; status is the player's own claim. |
| Shadows of Doubt ([devblog](https://colepowered.com/shadows-of-doubt-devblog-4-case-folders-cork-boards/), [Wikipedia](https://en.wikipedia.org/wiki/Shadows_of_Doubt)) | A skeuomorphic cork board; pins hold evidence; string colour encodes how incriminating a connection is. | Pinned cards, string links with a status vocabulary. Colour is **not** the only carrier (see below). |
| SIGNALIS ([Substack](https://steventus.substack.com/p/glancing-signalis-part-1-immersion), [Steam thread](https://steamcommunity.com/app/1262350/discussions/0/3495383984955765341/)) | Diegetic retro tech; the CRT look is a toggle, not an imposition. | `glitch` effects have a player-level *off / reduced / full* preference and obey `prefers-reduced-motion`. |

## Patterns kept / patterns refused

Kept: physical evidence (photo, document, tape, ID card each look different);
condition painted into the object; link strings with labels; one-way, rare screen
events; text carrying every state.

Refused: copying any game's layout or art; permanent scanlines/glitch on every
element; red glow as decoration; free-form "AI-looking" imagery as evidence; a
node-graph of the whole app; modals for evidence inspection.

## Resulting direction

The project already had a coherent identity (see `tailwind.config.ts`): near-black
warm base, cold cyan for live evidence, amber for warnings, red held back. This
pass did not replace it. It made the **interaction** match it:

- **Board**: a camera (pan / zoom / pinch) over a physical table, not a scroll box.
- **Links**: typed (corroborates, contradicts, temporal, location, person, object,
  unknown, hypothesis) and stateful (connected, unconfirmed, confirmed,
  contradicted, unknown). Status is carried by *colour + stroke pattern + glyph +
  text*.
- **VFX**: hierarchical. Healthy handset = grain only. Weak link / later case
  phases = rare dropouts. Opening a damaged record = one short effect. Story
  beats may force a `FULL` sequence. Then calm again.
