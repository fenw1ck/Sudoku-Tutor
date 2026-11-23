# Sudoku Tutor

Play sudoku, learn solving techniques from a skills map, and practise the skills you choose.
Live site: https://fenw1ck.github.io/Sudoku-Tutor/

## Tabs

- **Play**: standard games at Easy, Medium or Hard. Wrong digits show in red in their cell. Notes, erase, undo/redo, timer, best times. The board stays greyed out until you first tap it, and the timer starts then.
- **Learn**: a skills map of 32 techniques from Beginner to Advanced, with arrows showing which skills build on which. Each skill page has three parts, **What it is**, **How to do it** and an **Example**, plus sources, a step-by-step worked example and an exercise. The first correct digit in an exercise can only come from the skill, and it completes the puzzle.
- **Skills guide** (Learn → "Read the Skills guide", or add `#guide` to the address): every skill on one page, easiest first, in the same three parts. It can be printed or saved as a PDF.
- **Practice Skills**: tick any set of skills. The next puzzle needs every one of them, plus singles.

Difficulty is set by the hardest technique a puzzle needs:
Easy = singles (levels 1–2), Medium = pairs and locked candidates (3–4), Hard = fish, wings, patterns and chains (5–7).

Mastery counts every unassisted time you show a skill: 3 = "Getting it!", 30 = "Mastered".
Finished Play puzzles earn badges at 30, 100, 150, then every 50.
Progress is saved in your browser and can be exported to a file and imported on another device (Settings).

## Files

The whole site is one file, `index.html`. It holds the page, the styles, the solving engine, the skills data and the pre-built exercise bank (270 exercises and a still example for every skill). There's nothing to build. GitHub Pages serves it from the top level of the repository, and it also works if you open the file straight from your computer.

## Credits

Technique names follow Sudopedia, SudokuWiki and HoDoKu. Built with help from Claude (Anthropic).
