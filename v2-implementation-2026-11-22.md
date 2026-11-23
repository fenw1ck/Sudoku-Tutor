# Sudoku Tutor v2: implementation notes (2026-11-22)

Delivered as sudoku-tutor-v2.zip for upload to the repo root. Board updated: https://claude.ai/artifact/CEceo6EByZFFb9Wn8F3Wbk

## Decisions taken (from owner's suggestion marks on the review doc)
- Approved: skills data file, difficulty by hardest skill, skill-finish exercises, multi-select practice, intermediate research gap, engineering basics first.
- Red mistakes: Option A (wrong digit placed and shown red) plus a "Check entries as I go" toggle.
- Mastery: 3 unassisted uses = "Getting it!", 30 = "Mastered".

## What v2 contains
- Tabs: Play / Learn / Practice Skills. Each tab keeps its own game.
- Difficulty: Easy L1-2, Medium L3-4, Hard L5-6 (hardest technique needed).
- Play: red wrong digits, erase, undo/redo, notes, Check button when auto-check is off, timer pauses when the tab is hidden, best time per difficulty.
- Learn: skills map (Beginner / Intermediate / Advanced, "Builds on"), skill page (explanation, why it works, sources, worked example, exercise). Exercise: every empty cell depends on the skill; the first correct digit completes the puzzle.
- Practice: multi-select skills; generator requires every selected skill and, for non-singles, that singles alone can't finish.
- Engine in js/engine.js, data in js/skills.js, generation in a Web Worker, 140 pre-built exercises in data/bank.json (relabelled/shuffled on use).
- Tests: npm test (7 tests). CI workflow tests then deploys to Pages.

## Owner actions
- Delete Index.html (capital I).
- Settings > Pages > Source = GitHub Actions (for test-before-deploy).

## Next up
- Triples/quads, Jellyfish, W-Wing, Simple Colouring, Unique Rectangle, BUG+1 finders.
- Drawn prerequisite arrows on the map; static diagrams on skill pages; time-to-find in mastery; progress export.
