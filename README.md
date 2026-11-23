# Sudoku Tutor

Play sudoku, learn solving techniques from a skills map, and practise the skills you choose.
Live site: https://fenw1ck.github.io/Sudoku-Tutor/

## Tabs

- **Play**: standard games at Easy, Medium or Hard. Wrong digits show in red (with a ✗) in their cell. Notes, erase, undo/redo, timer, best times. The board stays greyed out until you first tap it, and the timer starts then.
- **Daily puzzles** (on Play): an Easy, a Medium and a Hard puzzle each day, the same for everyone, with a streak and a "Copy my result" button for sharing. A year of puzzles is built into the page; after a year they repeat in a reshuffled form.
- **Learn**: one page with a "Start here" learning path, a skills map of 36 techniques (Beginner to Advanced, with arrows showing which skills build on which), and every skill's explanation below it in three parts: **What it is**, **How to do it** and an **Example**. Click a skill on the map to jump to it. Each skill has **Try it** (a puzzle), **Watch it solved** and **I know this**. A skill's first puzzle is the same position as its example, with 3 as the number to find; where possible, no other technique at the same level works there. In a puzzle, the bar at the top names the skill and has Restart, New puzzle, **Next skill** (same tier) and **I know this: go deeper** (marks it known and moves to a skill that builds on it). Learn has no timer. The whole guide can be printed.
- **Practice Skills**: tick any set of skills. The next puzzle needs every one of them, plus singles. "Pick my weakest" chooses the two skills you've started (and haven't marked as known) that need it most (fewest unassisted uses and slowest typical time to spot), or the next skills on your learning path, and says why.

Difficulty is set by the hardest technique a puzzle needs:
Easy = singles (levels 1–2), Medium = pairs and locked candidates (3–4), Hard = fish, wings, patterns and chains (5–7).

Mastery counts every unassisted time you show a skill: 3 = "Getting it!", 30 = "Mastered".
Finished Play puzzles earn badges at 30, 100, 150, then every 50.
Progress is saved in your browser and can be exported to a file and imported on another device (Settings).

Jellyfish and Remote Pairs are deliberately not taught: long searches found no puzzle that needs either, because a simpler technique always gets there first. The Learn page explains why.

## Accessibility

- The board works with a keyboard (arrow keys, 1–9, Backspace, N for notes) and with screen readers: rows and cells are labelled, and entries and results are announced.
- Settings → "Colour-blind-friendly highlights" switches the yellow/red/green teaching colours to blue/orange/yellow and adds dashed outlines, stripes and a bold border, so colour isn't the only cue.
- Buttons are at least 44 px tall, and animations switch off when the device asks for reduced motion.

## Files

The whole site is one file, `index.html`. It holds the page, the styles, the solving engine, the skills data and the pre-built exercise bank (270 exercises and a still example for every skill) and a year of daily puzzles. There's nothing to build. GitHub Pages serves it from the top level of the repository, and it also works if you open the file straight from your computer.

## Credits

Technique names follow Sudopedia, SudokuWiki and HoDoKu. Built with help from Claude (Anthropic).
