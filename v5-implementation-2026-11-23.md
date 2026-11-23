# Sudoku Tutor v5 (2026-11-23)

**Delivery format (owner preference): no zip files.** Send HTML, Markdown or Docs. v5 is delivered as a single self-contained `index.html` (page, CSS, engine, skills data, exercise bank and Web Worker all inline, about 330 KB) plus `README.md`. Both go at the repo root. It works on GitHub Pages and when opened from disk.

## Repo clean-up (owner steps)
Upload index.html and README.md to the root, replacing the old ones. Delete `Index.html`, the `sudoku-tutor-v4/` folder, `sudoku-tutor-v2.zip`, and optionally the old `v2-`/`v4-implementation` .md files (copies live in this project).

## Why the map wasn't visible
The live site serves the repo root, which still had the original single-file index.html (dropdown by level). v4 had been uploaded into a `sudoku-tutor-v4/` subfolder.

## Changes
- Timer starts on first tap of the board. Until then the board is greyed and blurred with a "Tap to start" button; number pad and tools are disabled. Applies to Play, Practice and Learn exercises (not worked examples).
- Skill pages use three parts: 1 What it is (with why it works), 2 How to do it (numbered steps, new for all skills), 3 Example (still diagram).
- Skills guide: Learn → "Read the Skills guide" (or URL #guide, #g-<skill>). All skills easiest-first, in the same three parts, with a contents list and a print/PDF button.
- Map: "Skills map" heading; 4 columns (Beginner, Intermediate, Advanced: fish/sets/wings, Advanced: patterns/chains); arrows drawn behind nodes; scrolls sideways on phones.
- 9 new techniques (32 total): 2-String Kite, Empty Rectangle, Finned X-Wing (incl. sashimi), Unique Rectangle Types 2 and 4 (level 6); Remote Pairs, X-Chain, XY-Chain, ALS-XZ (new level 7).
- Hard = levels 5–7. Including chains made Hard generation faster and stopped occasional fallbacks to easier puzzles.

## Bank (4-minute cap per technique)
270 exercises, 32 diagrams. Kite, ER, Finned X-Wing, UR2, UR4, XY-Chain: 10 each. X-Chain: 5. ALS-XZ: 3. Remote Pairs: 0 (other techniques nearly always solve those positions first). Jellyfish: 0.

## Remaining work (proposed, awaiting owner pick)
1. Auto deploys: mostly moot now that the site is a single file with no build.
2. First-visit "start here" path in Learn.
3. Smarter "weakest skill" pick (mastery counts + time-to-find).
4. Expert/daily puzzle from a pre-built bank. A shared best-time board needs a server; GitHub Pages is static.
5. Finned Swordfish, WXYZ-Wing, Multi-Colouring, Sue de Coq, 3D Medusa, AICs.
6. Longer offline bank runs for Jellyfish, Remote Pairs, ALS-XZ and the quads.
7. Accessibility/mobile pass with a colour-blind-safe highlight option.
8. Cross-device sync. Needs a backend or a sign-in service.
