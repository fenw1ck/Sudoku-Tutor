// Skill map: the single source of truth for every technique the site teaches.
// Learn, Practice, hints and the Easy / Medium / Hard settings all read from here.
// To add a technique: add an entry here, add its finder in engine.js, add a test.

export const TIERS = ["Beginner", "Intermediate", "Advanced"];

export const DIFFICULTY = {
  easy: { label: "Easy", minLevel: 1, maxLevel: 2, blurb: "Singles only" },
  medium: { label: "Medium", minLevel: 3, maxLevel: 4, blurb: "Pairs and locked candidates" },
  hard: { label: "Hard", minLevel: 5, maxLevel: 6, blurb: "Fish and wings" },
};

// Mastery thresholds (unassisted uses of a skill).
export const MASTERY = { gettingIt: 3, mastered: 30 };
// Time-to-find is recorded per skill and capped at 4 minutes.
export const FIND_CAP_MS = 4 * 60 * 1000;

const SW = "https://www.sudokuwiki.org/";
const HD = "https://hodoku.sourceforge.net/en/";

export const SKILLS = [
  {
    key: "fullhouse", name: "Full House", level: 1, tier: "Beginner", prereqs: [],
    short: "A row, column or box with only one empty cell must take the one missing digit.",
    explain: [
      "Every row, column and box holds the digits 1 to 9 exactly once. When eight of the nine cells in a unit are filled, the last cell can only hold the one digit that is missing.",
      "Look for units that are almost full. Count which digit is missing, then place it.",
    ],
    why: "A unit needs all nine digits, and only one cell is left for the one digit still missing.",
    sources: [{ label: "HoDoKu: Full House", url: HD + "tech_singles.php#fh" }],
  },
  {
    key: "lastdigit", name: "Last Digit", level: 1, tier: "Beginner", prereqs: [],
    short: "Once a digit is placed 8 times, the 9th spot is forced.",
    explain: [
      "Each digit appears nine times in a finished grid, once in every row, column and box. When a digit already appears eight times, there is exactly one row, one column and one box that still lack it.",
      "The cell where that row, column and box meet is the only place for the ninth copy.",
    ],
    why: "Eight copies leave exactly one row, one column and one box without that digit, and they meet in one cell.",
    sources: [{ label: "SudokuWiki: Getting Started", url: SW + "Getting_Started" }],
  },
  {
    key: "scanning", name: "Scanning (Cross-Hatching)", level: 1, tier: "Beginner", prereqs: [],
    short: "A digit's existing rows and columns block cells. If a box has one cell left for it, it goes there.",
    explain: [
      "Pick a digit and a box that does not have it yet. Every copy of that digit elsewhere blocks its whole row and column. Draw those lines in your head across the box.",
      "If only one empty cell in the box is not blocked, the digit goes there. This is the fastest way to start most puzzles.",
    ],
    why: "The box must contain the digit, and every other cell in it shares a row or column with a copy that is already placed.",
    sources: [{ label: "SudokuWiki: Getting Started", url: SW + "Getting_Started" }],
  },
  {
    key: "naked1", name: "Naked Single", level: 2, tier: "Beginner", prereqs: ["fullhouse"],
    short: "A cell has only one candidate left.",
    explain: [
      "For one empty cell, cross off every digit that already appears in its row, column or box. If only one digit is left, that is the answer.",
      "Pencil marks (notes) make naked singles easy to see: a cell with a single note is solved.",
    ],
    why: "Eight digits are ruled out by the cell's own row, column and box, so only one can go there.",
    sources: [{ label: "HoDoKu: Naked Single", url: HD + "tech_singles.php#n1" }],
  },
  {
    key: "hidden1", name: "Hidden Single", level: 2, tier: "Beginner", prereqs: ["scanning"],
    short: "A digit has only one possible cell in a row, column or box, even if that cell has other candidates.",
    explain: [
      "Instead of asking what goes in a cell, ask where a digit can go in a unit. If a digit has only one possible cell in a row, column or box, it goes there, even if that cell could hold other digits too.",
      "Scanning is a hidden single inside a box; this skill applies the same idea to rows and columns.",
    ],
    why: "The unit must contain the digit somewhere, and only one cell can take it.",
    sources: [{ label: "HoDoKu: Hidden Single", url: HD + "tech_singles.php#h1" }],
  },
  {
    key: "nakedpair", name: "Naked Pair", level: 3, tier: "Intermediate", prereqs: ["naked1"],
    short: "Two cells in a unit hold the same two candidates, so those digits leave the rest of the unit.",
    explain: [
      "If two cells in the same row, column or box both have exactly the same two candidates, say {3,7}, then those two cells will take the 3 and the 7 between them.",
      "No other cell in that unit can be 3 or 7, so erase those candidates from the rest of the unit.",
    ],
    why: "The pair must use up its two digits, so no other cell in the unit can hold them.",
    sources: [
      { label: "SudokuWiki: Naked Pairs", url: SW + "Naked_Candidates#NP" },
      { label: "HoDoKu: Naked Subsets", url: HD + "tech_naked.php" },
    ],
  },
  {
    key: "hiddenpair", name: "Hidden Pair", level: 3, tier: "Intermediate", prereqs: ["hidden1", "nakedpair"],
    short: "Two digits fit only the same two cells of a unit, so those cells lose their other candidates.",
    explain: [
      "If two digits can each go in only the same two cells of a unit, those two cells must hold those two digits.",
      "Any other candidates in the two cells can be erased. The pair is \"hidden\" because the extra candidates disguise it.",
    ],
    why: "These two digits can only go in the pair cells, so the pair cells can't hold anything else.",
    sources: [
      { label: "SudokuWiki: Hidden Pairs", url: SW + "Hidden_Candidates#HP" },
      { label: "HoDoKu: Hidden Subsets", url: HD + "tech_hidden.php" },
    ],
  },
  {
    key: "pointing", name: "Pointing Pair/Triple", level: 4, tier: "Intermediate", prereqs: ["hidden1"],
    short: "Within a box, a digit's candidates all lie in one line, so it leaves the rest of that line.",
    explain: [
      "Inside one box, look at where a digit can go. If all of those cells sit in the same row (or column), the box's copy of the digit must be in that line.",
      "So the digit can be erased from the rest of that row or column outside the box. Also called Locked Candidates, Type 1.",
    ],
    why: "In that box every possible spot for the digit is on one line, so the box's digit must be on that line. Any other cell on the line can't also hold it.",
    sources: [
      { label: "SudokuWiki: Intersection Removal", url: SW + "Intersection_Removal" },
      { label: "HoDoKu: Locked Candidates Type 1", url: HD + "tech_intersections.php#lc1" },
    ],
  },
  {
    key: "claiming", name: "Box/Line Reduction (Claiming)", level: 4, tier: "Intermediate", prereqs: ["pointing"],
    short: "Within a line, a digit's candidates all lie in one box, so it leaves the box's other cells.",
    explain: [
      "The mirror image of pointing. In one row or column, if every possible cell for a digit is inside the same box, the line's copy of the digit is in that box.",
      "So the digit can be erased from the box's other cells. Also called Locked Candidates, Type 2.",
    ],
    why: "In that line every possible spot for the digit is inside one box, so the line's digit is in that box. The box's other cells can't hold it.",
    sources: [
      { label: "SudokuWiki: Box/Line Reduction", url: SW + "Intersection_Removal#LBR" },
      { label: "HoDoKu: Locked Candidates Type 2", url: HD + "tech_intersections.php#lc2" },
    ],
  },
  {
    key: "nakedtriple", name: "Naked Triple", level: 4, tier: "Intermediate", prereqs: ["nakedpair"],
    short: "Three cells in a unit hold only three digits between them, so those digits leave the rest of the unit.",
    explain: [
      "A naked pair with one more cell. Find three cells in the same row, column or box whose candidates, taken together, are only three digits, say {1,4,8}. Each cell doesn't need all three: {1,4}, {4,8} and {1,8} is a naked triple too.",
      "Those three cells will use up those three digits, so erase them from every other cell in the unit.",
    ],
    why: "Three cells that can only hold three digits must take all three, so no other cell in the unit can hold them.",
    sources: [
      { label: "SudokuWiki: Naked Candidates", url: SW + "Naked_Candidates" },
      { label: "HoDoKu: Naked Subsets", url: HD + "tech_naked.php" },
    ],
  },
  {
    key: "hiddentriple", name: "Hidden Triple", level: 4, tier: "Intermediate", prereqs: ["hiddenpair"],
    short: "Three digits fit only the same three cells of a unit, so those cells lose their other candidates.",
    explain: [
      "A hidden pair with one more digit. In one unit, find three digits that can only go in the same three cells (each digit doesn't need all three cells).",
      "Those cells must hold those three digits, so every other candidate in the three cells can be erased.",
    ],
    why: "These three digits can only go in these three cells, so the cells can't hold anything else.",
    sources: [
      { label: "SudokuWiki: Hidden Candidates", url: SW + "Hidden_Candidates" },
      { label: "HoDoKu: Hidden Subsets", url: HD + "tech_hidden.php" },
    ],
  },
  {
    key: "xwing", name: "X-Wing", level: 5, tier: "Advanced", prereqs: ["claiming"],
    short: "A digit has exactly two cells in each of two lines, aligned on the same two crossing lines, so it leaves the rest of those crossing lines.",
    explain: [
      "Pick a digit. Find two rows where it can go in exactly two cells, and where those cells line up in the same two columns. They form the corners of a rectangle.",
      "The digit must take one diagonal of the rectangle or the other. Either way both columns get their copy from these corners, so erase the digit from the rest of both columns. The same works with rows and columns swapped.",
    ],
    why: "The digit must fill one diagonal of the rectangle, so every other cell in those lines can't hold it.",
    sources: [
      { label: "SudokuWiki: X-Wing", url: SW + "X_Wing_Strategy" },
      { label: "HoDoKu: Basic Fish (X-Wing)", url: HD + "tech_fishb.php#bf2" },
    ],
  },
  {
    key: "swordfish", name: "Swordfish", level: 5, tier: "Advanced", prereqs: ["xwing"],
    short: "Like X-Wing with three lines: a digit's candidates in three rows sit inside the same three columns.",
    explain: [
      "An X-Wing with three lines instead of two. Find three rows where a digit has only two or three possible cells, all inside the same three columns.",
      "The three rows will place their three copies inside those columns, so erase the digit from every other cell of those three columns. Rows and columns can be swapped.",
    ],
    why: "The digit is used up inside the three crossing lines, so every other cell in them can't hold it.",
    sources: [
      { label: "SudokuWiki: Swordfish", url: SW + "Sword_Fish_Strategy" },
      { label: "HoDoKu: Basic Fish (Swordfish)", url: HD + "tech_fishb.php#bf3" },
    ],
  },
  {
    key: "nakedquad", name: "Naked Quad", level: 5, tier: "Advanced", prereqs: ["nakedtriple"],
    short: "Four cells in a unit hold only four digits between them, so those digits leave the rest of the unit.",
    explain: [
      "The same idea as naked pairs and triples, with four cells and four digits. They are rarer and harder to spot because the four cells can hold many combinations.",
      "When four cells of one unit together hold only four digits, erase those digits from the unit's other cells.",
    ],
    why: "Four cells that can only hold four digits must take all four, so no other cell in the unit can hold them.",
    sources: [
      { label: "SudokuWiki: Naked Candidates", url: SW + "Naked_Candidates" },
      { label: "HoDoKu: Naked Subsets", url: HD + "tech_naked.php" },
    ],
  },
  {
    key: "hiddenquad", name: "Hidden Quad", level: 5, tier: "Advanced", prereqs: ["hiddentriple"],
    short: "Four digits fit only the same four cells of a unit, so those cells lose their other candidates.",
    explain: [
      "Four digits in one unit that can only go in the same four cells. Those cells must hold those digits.",
      "Erase every other candidate from the four cells. Hidden quads are rare; looking at the unit's other five cells for a naked quint is often easier.",
    ],
    why: "These four digits can only go in these four cells, so the cells can't hold anything else.",
    sources: [
      { label: "SudokuWiki: Hidden Candidates", url: SW + "Hidden_Candidates" },
      { label: "HoDoKu: Hidden Subsets", url: HD + "tech_hidden.php" },
    ],
  },
  {
    key: "skyscraper", name: "Skyscraper", level: 6, tier: "Advanced", prereqs: ["xwing"],
    short: "Two lines each hold a digit in exactly two cells, and one pair lines up. Cells that see both other ends lose the digit.",
    explain: [
      "Like a broken X-Wing. In two rows a digit has exactly two cells each. One end of each row lines up in the same column (the base); the other two ends (the roof) don't.",
      "Both rows can't put the digit in the base, so at least one roof cell holds it. Any cell that sees both roof cells can't be that digit.",
    ],
    why: "At least one roof cell is the digit, and this cell sees both roof cells.",
    sources: [{ label: "HoDoKu: Skyscraper", url: HD + "tech_sdp.php#sk" }],
  },
  {
    key: "xywing", name: "XY-Wing (Y-Wing)", level: 6, tier: "Advanced", prereqs: ["nakedpair"],
    short: "A pivot {A,B} sees wings {A,C} and {B,C}. One wing is always C, so cells that see both wings can't be C.",
    explain: [
      "Find a cell with two candidates, the pivot {A,B}. It must see two other two-candidate cells, the wings: one {A,C} and one {B,C}.",
      "If the pivot is A, the {A,C} wing becomes C. If the pivot is B, the {B,C} wing becomes C. Either way a wing is C, so any cell that sees both wings can't be C.",
    ],
    why: "One wing must hold the shared digit, and this cell sees both wings.",
    sources: [
      { label: "SudokuWiki: Y-Wing", url: SW + "Y_Wing_Strategy" },
      { label: "HoDoKu: XY-Wing", url: HD + "tech_wings.php#xy" },
    ],
  },
  {
    key: "xyzwing", name: "XYZ-Wing", level: 6, tier: "Advanced", prereqs: ["xywing"],
    short: "A pivot {A,B,C} sees wings {A,C} and {B,C}. Cells that see all three can't be C.",
    explain: [
      "An XY-Wing whose pivot has a third candidate. The pivot is {A,B,C} and the wings are {A,C} and {B,C}.",
      "C must land in the pivot or in one of the wings, so only cells that see all three of them can lose C.",
    ],
    why: "The shared digit is in the pivot or one wing, and this cell sees all three.",
    sources: [
      { label: "SudokuWiki: XYZ-Wing", url: SW + "XYZ_Wing" },
      { label: "HoDoKu: XYZ-Wing", url: HD + "tech_wings.php#xyz" },
    ],
  },
  {
    key: "jellyfish", name: "Jellyfish", level: 6, tier: "Advanced", prereqs: ["swordfish"],
    short: "The four-line fish: a digit's candidates in four rows sit inside the same four columns.",
    explain: [
      "X-Wing uses two lines and Swordfish three; Jellyfish uses four. Find four rows where a digit has two, three or four possible cells, all inside the same four columns.",
      "The four rows place their four copies inside those columns, so erase the digit from every other cell in those four columns. Rows and columns can be swapped.",
    ],
    why: "The digit is used up inside the four crossing lines, so every other cell in them can't hold it.",
    sources: [
      { label: "SudokuWiki: Jellyfish", url: SW + "Jelly_Fish_Strategy" },
      { label: "HoDoKu: Basic Fish", url: HD + "tech_fishb.php" },
    ],
  },
  {
    key: "uniquerect", name: "Unique Rectangle", level: 6, tier: "Advanced", prereqs: ["nakedpair"],
    short: "Four cells in two rows, two columns and two boxes can't all be {A,B}, or the puzzle would have two solutions.",
    explain: [
      "A proper sudoku has exactly one solution. If four empty cells forming a rectangle across two boxes all held only {A,B}, the A's and B's could swap and both versions would work. So that pattern can't happen.",
      "Type 1: when three corners are exactly {A,B} and the fourth has {A,B} plus other candidates, the fourth corner can't be A or B. Erase them; it takes one of its other candidates.",
    ],
    why: "If the fourth corner were A or B, the rectangle could swap its digits and the puzzle would have two solutions.",
    sources: [
      { label: "SudokuWiki: Unique Rectangles", url: SW + "Unique_Rectangles" },
      { label: "HoDoKu: Uniqueness", url: HD + "tech_ur.php" },
    ],
  },
  {
    key: "bug", name: "BUG+1", level: 6, tier: "Advanced", prereqs: ["uniquerect"],
    short: "If every empty cell has two candidates except one with three, that cell takes the digit that appears three times in its units.",
    explain: [
      "BUG stands for Bivalue Universal Grave: a position where every empty cell has exactly two candidates and every digit appears exactly twice in each row, column and box. Such a position always has two solutions, so a proper puzzle can never reach it.",
      "BUG+1 is one candidate away: one cell has three candidates. The extra digit, the one that appears three times in that cell's row, column and box, must be the answer there, or the grid would collapse into a BUG.",
    ],
    why: "Removing the extra digit would leave a BUG, which has two solutions, so the extra digit must go in that cell.",
    sources: [
      { label: "SudokuWiki: BUG", url: SW + "BUG" },
      { label: "HoDoKu: Uniqueness", url: HD + "tech_ur.php" },
    ],
  },
  {
    key: "wwing", name: "W-Wing", level: 6, tier: "Advanced", prereqs: ["xywing"],
    short: "Two matching two-digit cells {A,B} are joined by a strong link on B, so cells that see both can't be A.",
    explain: [
      "Find two cells that both hold exactly {A,B} but don't see each other. Then find a unit where B has only two places, one seeing each of the two cells (a strong link).",
      "If neither cell were A, both would be B, and the strong link would have nowhere to put its B. So one of the two cells is A, and any cell that sees both can't be A.",
    ],
    why: "One of the two matching cells must be the eliminated digit, and this cell sees both.",
    sources: [
      { label: "SudokuWiki: W-Wing", url: SW + "W_Wing_Strategy" },
      { label: "HoDoKu: W-Wing", url: HD + "tech_wings.php#w" },
    ],
  },
  {
    key: "colouring", name: "Simple Colouring", level: 6, tier: "Advanced", prereqs: ["skyscraper"],
    short: "Chain a digit's two-place links and colour them in turns. One colour is true; use that to remove candidates.",
    explain: [
      "Pick a digit. Wherever a unit has exactly two places for it, one of them is the digit and the other isn't. Join those places into a chain and colour them alternately, blue and green.",
      "Either every blue cell is the digit or every green cell is. If two cells of one colour see each other, that colour is false. Any other cell that sees one blue and one green can't be the digit.",
    ],
    why: "One colour in the chain holds the digit, so a cell that sees both colours can't, and a colour that sees itself is impossible.",
    sources: [
      { label: "SudokuWiki: Simple Colouring", url: SW + "Simple_Colouring" },
      { label: "HoDoKu: Coloring", url: HD + "tech_col.php" },
    ],
  },
];

export const SKILL = Object.fromEntries(SKILLS.map((s) => [s.key, s]));
export const KEYS = SKILLS.map((s) => s.key);

// Techniques in the research plan that the generator can't produce yet.
export const PLANNED = [
  { name: "XY-Chains", tier: "Advanced", url: SW + "XY_Chains" },
  { name: "Almost Locked Sets", tier: "Advanced", url: SW + "Almost_Locked_Sets" },
];

// Play badges for finished puzzles: 30, 100, 150, then every 50.
export function badgeThresholds(upTo) {
  const out = [30, 100, 150];
  while (out[out.length - 1] < upTo + 50) out.push(out[out.length - 1] + 50);
  return out;
}
export const earnedBadges = (n) => badgeThresholds(n).filter((t) => t <= n);
export const nextBadge = (n) => badgeThresholds(n).find((t) => t > n);

export function masteryLabel(n) {
  if (n >= MASTERY.mastered) return "Mastered ★";
  if (n >= MASTERY.gettingIt) return "Getting it!";
  if (n > 0) return "Started";
  return "New";
}
