# Sudoku Tutor v4 (2026-11-22)

Delivered as sudoku-tutor-v4.zip. The skills map lives on the Learn tab.

## Added
- Jellyfish, Unique Rectangle (type 1), BUG+1: 23 skills. Uniqueness techniques are never used when removing clues, so every puzzle is still proved unique.
- Time-to-find per skill: time since the previous correct digit (Learn exercises: time to finish), last 20 kept, each capped at 4:00. The skill page shows the typical (median) time.
- A still example diagram on every skill page: the pattern in yellow, removed candidates in red, and the solved cell in green, with the explanation.
- Settings: Export / Import progress (JSON file), alongside Reset.
- Bank builder: hard 4-minute budget per skill (`node tools/build-bank.mjs 10 240 [keys]`).

## Bank status
- 202 exercises; 23 diagrams. Jellyfish: 0 exercises (none found within 4 min; page explains and offers the diagram + worked example). Naked Quad 3, Hidden Quad 1.

## Interpretation to confirm
- "No more than four minutes per type" was applied both to the bank-building budget per skill and to the time-to-find cap.

## Next candidates
- XY-Chains, Almost Locked Sets (listed under "Coming to the map").
