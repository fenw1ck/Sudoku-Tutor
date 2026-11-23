// Engine tests. Run with: npm test   (Node 20+)
import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../js/engine.js";
import { SKILLS, KEYS } from "../js/skills.js";

// Count solutions by brute force (stops at 2).
function countSolutions(V) {
  const g = V.slice();
  let n = 0;
  const ok = (i, d) => {
    for (let j = 0; j < 81; j++) if (E.P[i][j] && g[j] === d) return false;
    return true;
  };
  (function go() {
    if (n > 1) return;
    let best = -1, bestC = null;
    for (let i = 0; i < 81; i++) if (!g[i]) {
      const c = [];
      for (let d = 1; d <= 9; d++) if (ok(i, d)) c.push(d);
      if (!bestC || c.length < bestC.length) { best = i; bestC = c; }
      if (c.length === 0) return;
    }
    if (best < 0) { n++; return; }
    for (const d of bestC) { g[best] = d; go(); g[best] = 0; }
  })();
  return n;
}

// Walk a puzzle to the end; at every state, run EVERY finder and check it never contradicts the answer.
function checkFindersSound(V, sol, seen) {
  const S = E.mk(V.slice());
  for (let g = 0; g < 300 && !S.V.every((x) => x); g++) {
    for (const k of E.ORDER) {
      const s = E.FINDERS[k](S);
      if (!s) continue;
      seen[k] = (seen[k] || 0) + 1;
      assert.equal(s.t, k, `finder ${k} labels its step`);
      if (s.place) assert.equal(s.place[1], sol[s.place[0]], `${k} placed a wrong digit at ${E.rc(s.place[0])}`);
      for (const [i, m] of s.elim || []) {
        assert.ok(!(m & E.bit(sol[i])), `${k} eliminated the true digit ${sol[i]} at ${E.rc(i)}`);
      }
      assert.ok(s.text && s.text.length > 10, `${k} explains itself`);
    }
    const step = E.nextStep(S, E.ORDER);
    if (!step) break;
    E.apply(S, step);
  }
}

test("skills data and engine agree", () => {
  assert.deepEqual([...KEYS].sort(), [...E.ORDER].sort());
  for (const s of SKILLS) {
    assert.ok(E.FINDERS[s.key], `finder for ${s.key}`);
    for (const p of s.prereqs) assert.ok(KEYS.includes(p), `${s.key} prereq ${p} exists`);
    assert.ok(s.sources.length > 0, `${s.key} cites a source`);
  }
});

test("every technique finder is sound and each one fires", () => {
  const seen = {};
  for (const k of E.ORDER) {
    for (let n = 0; n < 2; n++) {
      const p = E.generateWith(k, 3000);
      checkFindersSound(p.V, p.sol, seen);
    }
  }
  for (const k of E.ORDER) assert.ok(seen[k] > 0, `${k} was exercised at least once`);
});

test("Easy / Medium / Hard puzzles are unique and in range", () => {
  for (const [minL, maxL] of [[1, 2], [3, 4], [5, 6]]) {
    const p = E.generateLevel(minL, maxL, 4000);
    assert.equal(countSolutions(p.V), 1, "exactly one solution");
    const r = E.solve(p.V, E.keysUpTo(maxL));
    assert.ok(r.ok, "solvable at its level");
    assert.ok(r.hard <= maxL, "never needs a harder technique");
    if (p.ok) assert.ok(r.hard >= minL, "needs a technique from its band");
    assert.deepEqual(r.V, p.sol, "logic reaches the stored solution");
  }
});

test("practice puzzles use every selected skill", () => {
  for (const keys of [["hidden1"], ["nakedpair", "pointing"], ["xwing", "claiming"]]) {
    const p = E.generatePractice(keys, 6000);
    assert.equal(countSolutions(p.V), 1);
    assert.ok(p.ok, `covered ${keys.join("+")}: got ${p.covered}`);
  }
});

test("skill-finish exercises need the skill for every empty cell", () => {
  for (const key of ["fullhouse", "hidden1", "nakedpair", "pointing", "claiming", "xywing"]) {
    const x = E.buildExercise(key, 6000);
    assert.ok(x.ok, `${key} exercise found`);
    assert.equal(countSolutions(x.V), 1);
    const easier = E.keysBelow(E.level(key)).filter((k) => k !== key);
    const reach = E.solve(x.V, easier).V;
    for (let i = 0; i < 81; i++) if (!x.V[i]) assert.equal(reach[i], 0, `${key}: ${E.rc(i)} is reachable without the skill`);
    const full = E.solve(x.V, [...easier, key], key);
    assert.ok(full.ok && full.used[key] > 0, `${key} finishes the exercise`);
  }
});

test("worked examples stop where the skill applies", () => {
  for (const key of ["hidden1", "nakedpair", "xwing", "skyscraper"]) {
    const ex = E.buildExample(key, 3000);
    if (!ex.forced) continue;
    assert.ok(ex.chain, `${key} example has a chain`);
    assert.equal(ex.chain.key.t, key);
    assert.equal(ex.sol[ex.chain.target], ex.chain.digit);
  }
});

test("every stored exercise in data/bank.json is valid", async () => {
  const { readFileSync } = await import("node:fs");
  const bank = JSON.parse(readFileSync(new URL("../data/bank.json", import.meta.url)));
  for (const key of E.ORDER) {
    const list = bank.exercises[key] || [];
    // Jellyfish exercises are too rare to find within the 4-minute build budget.
    if (key !== "jellyfish") assert.ok(list.length > 0, `bank has exercises for ${key}`);
    const easier = E.keysBelow(E.level(key)).filter((k) => k !== key);
    for (const ex of list) {
      const t = E.transform(E.decode(ex.v), E.decode(ex.s));
      const r = E.solve(t.V, [...easier, key], key);
      assert.ok(r.ok && r.used[key] > 0, `${key} bank entry needs the skill`);
      assert.deepEqual(r.V, t.sol, `${key} bank entry solution matches`);
      assert.ok(!E.solve(t.V, easier).ok, `${key} bank entry can't be solved without it`);
      assert.equal(countSolutions(t.V), 1, `${key} bank entry has one solution`);
    }
  }
});

test("exhibited() and teaching hints agree with the solution", () => {
  const p = E.generateLevel(3, 6, 3000);
  const S = E.mk(p.V.slice());
  let checked = 0;
  for (let i = 0; i < 81 && checked < 25; i++) if (!S.V[i]) {
    const ks = E.exhibited(S, i);
    for (const k of ks) assert.ok(E.ORDER.includes(k), `exhibited returns a real skill: ${k}`);
    checked++;
  }
  const h = E.chainHard(S, E.ORDER);
  if (h) assert.equal(h.digit, p.sol[h.target]);
  const e = E.hintChain(S, E.ORDER);
  assert.ok(e && e.digit === p.sol[e.target]);
});

test("every skill has a still diagram that matches its solution", async () => {
  const { readFileSync } = await import("node:fs");
  const bank = JSON.parse(readFileSync(new URL("../data/bank.json", import.meta.url)));
  for (const key of E.ORDER) {
    const ex = bank.examples && bank.examples[key];
    assert.ok(ex, `diagram for ${key}`);
    assert.equal(ex.step.t, key);
    const V = E.decode(ex.v);
    assert.equal(countSolutions(V), 1, `${key} diagram position has one solution`);
  }
});
