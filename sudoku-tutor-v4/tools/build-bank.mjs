// Builds data/bank.json:
//  - exercises: skill-finish puzzles, so Learn loads them instantly
//  - examples: one still diagram per skill for its page
// Usage: node tools/build-bank.mjs [perSkill=10] [maxSecondsPerSkill=240] [skill keys...]
// Each skill gets at most maxSecondsPerSkill (default 4 minutes). With skill keys, only those
// skills get new exercises (added to what's there) and a fresh diagram; the rest is kept.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as E from "../js/engine.js";

const [perArg, secsArg, ...only] = process.argv.slice(2);
const per = +(perArg || 10), budget = +(secsArg || 240) * 1000;
const file = new URL("../data/bank.json", import.meta.url);
const bank = existsSync(file) ? JSON.parse(readFileSync(file)) : {};
bank.version = 2;
bank.exercises ||= {};
bank.examples ||= {};
bank.built = new Date().toISOString().slice(0, 10);
const keys = only.length ? only : E.ORDER;
const out = process.env.BANK_OUT;

for (const key of keys) {
  const t0 = Date.now(), left = () => budget - (Date.now() - t0);
  // still diagram: the moment in a worked example where the skill applies
  let ex = null;
  while (!ex && left() > 0) {
    const e = E.buildExample(key, Math.min(20000, left()));
    if (e.forced && e.chain) ex = e;
  }
  if (ex) {
    const { key: step, target, digit } = ex.chain;
    bank.examples[key] = {
      v: E.encode(ex.V), c: ex.C, giv: ex.giv.map((g) => (g ? 1 : 0)).join(""),
      step: { t: step.t, cells: step.cells, elim: step.elim || [], place: step.place || null, f: step.f, text: step.text },
      target, digit,
    };
  }
  // exercises
  const list = only.length ? (bank.exercises[key] || []).slice() : [];
  const seen = new Set(list.map((x) => x.v));
  while (list.length < per && left() > 0) {
    const x = E.buildExercise(key, Math.min(30000, left()));
    const id = E.encode(x.V);
    if (!x.ok || seen.has(id)) continue;
    seen.add(id);
    list.push({ v: id, s: E.encode(x.sol), empty: x.empty });
  }
  bank.exercises[key] = list;
  console.log(key.padEnd(12), `exercises ${list.length}/${per}`, ex ? "diagram ok" : "NO DIAGRAM", `${Math.round((Date.now() - t0) / 1000)}s`);
  if (out) writeFileSync(out, JSON.stringify({ exercises: Object.fromEntries(keys.map((k) => [k, bank.exercises[k]])), examples: Object.fromEntries(keys.filter((k) => bank.examples[k]).map((k) => [k, bank.examples[k]])) }));
}
if (!out) { writeFileSync(file, JSON.stringify(bank)); console.log("wrote data/bank.json"); }
