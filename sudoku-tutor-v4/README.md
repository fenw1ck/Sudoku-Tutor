# Sudoku Tutor

Play sudoku, learn solving techniques from a skills map, and practise the skills you choose.
Live site: https://fenw1ck.github.io/Sudoku-Tutor/

## Tabs

- **Play**: standard games at Easy, Medium or Hard. Wrong digits show in red in their cell. Notes, erase, undo/redo, timer, best times.
- **Learn**: a skills map from Beginner to Advanced. Each skill has an explanation, sources, a step-by-step worked example and an exercise. The first correct digit in an exercise can only come from the skill, and it completes the puzzle.
- **Practice Skills**: tick any set of skills. The next puzzle needs every one of them, plus singles.

Difficulty is set by the hardest technique a puzzle needs:
Easy = singles (levels 1–2), Medium = pairs and locked candidates (3–4), Hard = fish and wings (5–6).

Mastery counts every unassisted time you show a skill, even several in one puzzle: 3 = "Getting it!", 30 = "Mastered".
Finished Play puzzles earn badges at 30, 100, 150, then every 50.
Each skill page shows a still example, and your typical time to find the skill (capped at 4 minutes).
Progress can be exported to a file and imported on another device (Settings).
Progress is saved in your browser.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Page structure |
| `css/style.css` | Styles (light and dark) |
| `js/skills.js` | The skills map: names, tiers, prerequisites, explanations, sources, difficulty bands |
| `js/engine.js` | Technique finders, logic solver, puzzle generators (no DOM, runs anywhere) |
| `js/worker.js` | Runs the generators in a Web Worker so the page never freezes |
| `js/app.js` | The interface |
| `data/bank.json` | 202 pre-built skill exercises (shuffled and relabelled each time) and a still example diagram for every skill. Quads are rare and have only a few exercises; Jellyfish has none yet |
| `tools/build-bank.mjs` | Rebuilds `data/bank.json` |
| `tests/engine.test.mjs` | Engine tests |

## Developing

Needs Node 20 or newer for tests. No packages to install.

```
npm test                          # run the engine tests
node tools/build-bank.mjs 10 240                  # rebuild the bank: 10 exercises per skill, at most 4 minutes per skill
node tools/build-bank.mjs 10 240 jellyfish        # add exercises for one skill, keeping everything else
python3 -m http.server            # then open http://localhost:8000
```

The page uses JavaScript modules, so open it through a local server rather than by double-clicking `index.html`.

## Adding a technique

1. Add an entry to `SKILLS` in `js/skills.js`.
2. Write a finder in `js/engine.js` and register it in `ORDER` and `FINDERS`.
3. Run `npm test`: the soundness test checks the new finder never contradicts a solution.
4. Run `node tools/build-bank.mjs 10 240 <key>` to add exercises and a diagram for it.

Uniqueness techniques (Unique Rectangle, BUG+1) assume one solution, so the generator never uses them when removing clues; every puzzle is proved unique by the other techniques.

## Credits

Technique names follow Sudopedia, SudokuWiki and HoDoKu. Built with help from Claude (Anthropic).
