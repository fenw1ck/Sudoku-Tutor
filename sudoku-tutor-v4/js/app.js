// Sudoku Tutor UI: Play, Learn (skills map, skill pages, examples, exercises) and Practice Skills.
import * as E from "./engine.js";
import { SKILLS, SKILL, TIERS, DIFFICULTY, MASTERY, FIND_CAP_MS, PLANNED, masteryLabel, earnedBadges, nextBadge } from "./skills.js";

const { bit, pc, dg, rc, U, UN, P, mk, place, ORDER, FINDERS } = E;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmt = (ms) => { const n = Math.floor(ms / 1000); return Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0"); };
const an = (d) => (d === 8 ? "an " : "a ") + d;
const shortName = (k) => SKILL[k].name.split(" (")[0];

// ---------- saved data ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const settings = Object.assign({ checkAsGo: true, showTimer: true, diff: "easy", practice: [], theme: "auto", fast: true }, store.get("sdt-settings", {}));
const saveSettings = () => store.set("sdt-settings", settings);
// Skill progress: unassisted uses per skill. Carries over counts from the first version of the site.
let prog = store.get("sdt-progress", null) || store.get("sdk2", {});
const saveProg = () => store.set("sdt-progress", prog);
const best = store.get("sdt-best", {});
let solvedCount = store.get("sdt-solved", 0); // finished Play puzzles, for badges
// Time-to-find per skill: the last 20 times (ms, capped at 4 minutes) since the previous find.
let times = store.get("sdt-times", {});
function recordTime(k, ms) {
  const list = (times[k] = (times[k] || []).concat(Math.min(ms, FIND_CAP_MS)).slice(-20));
  store.set("sdt-times", times);
  return list;
}
function medianTime(k) {
  const l = (times[k] || []).slice().sort((a, b) => a - b);
  return l.length ? l[Math.floor(l.length / 2)] : null;
}

// ---------- background generation ----------
let worker = null, jobSeq = 0;
const pending = new Map();
const LOCAL = {
  level: ([a, b, ms]) => E.generateLevel(a, b, ms),
  practice: ([k, ms]) => E.generatePractice(k, ms),
  exercise: ([k, ms]) => E.buildExercise(k, ms),
  example: ([k, ms]) => E.buildExample(k, ms),
};
try {
  worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  worker.onmessage = (e) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data.result);
  };
  worker.onerror = () => {
    // Module workers unsupported: finish pending jobs on the main thread.
    worker = null;
    for (const [id, p] of pending) { pending.delete(id); p.resolve(LOCAL[p.job](p.args)); }
  };
} catch { worker = null; }
function run(job, args) {
  if (worker) return new Promise((resolve, reject) => {
    const id = ++jobSeq;
    pending.set(id, { resolve, reject, job, args });
    worker.postMessage({ id, job, args });
  });
  return new Promise((resolve) => setTimeout(() => resolve(LOCAL[job](args)), 30));
}

let bank = null;
async function loadBank() {
  if (bank) return bank;
  try { bank = await (await fetch("data/bank.json")).json(); } catch { bank = { exercises: {} }; }
  return bank;
}

// ---------- game state ----------
// One game per tab, so leaving Play for Learn doesn't lose your Play game.
const games = { play: null, practice: null, learn: null };
let tab = "play";
let G = null; // the game on screen
let sel = null, foc = 0, notesOn = false;
let view = null, demo = null, exSel = null, rew = null, pop = null, avail = [];
let learnSkill = null; // skill page open in Learn
let busy = false;

function newGame(mode, p, extra = {}) {
  const S = p.C ? { V: Int8Array.from(p.V), C: Int16Array.from(p.C) } : mk(Int8Array.from(p.V));
  return Object.assign({
    mode, S, sol: p.sol, giv: p.giv ? p.giv.slice() : Array.from(p.V, (x) => !!x),
    wrong: new Int8Array(81), revealed: new Set(), N: new Int16Array(81),
    hist: [], fut: [], hints: 0, mist: 0, acc: 0, run: null, fin: null,
    mine: {}, shown: {}, dismissed: new Set(), assisted: new Set(), prof: E.profile(Array.from(p.V)),
    info: "", used: p.used || {}, done: false, lastAt: 0,
  }, extra);
}
const elapsed = (g) => g.acc + (g.run ? Date.now() - g.run : 0);
const pause = (g) => { if (g && g.run) { g.acc += Date.now() - g.run; g.run = null; } };
const resume = (g) => { if (g && !g.run && g.fin === null && !document.hidden) g.run = Date.now(); };
const checking = () => !G || G.mode === "exercise" || G.mode === "example" || settings.checkAsGo;
const cellVal = (i) => G.S.V[i] || G.wrong[i];
const isFull = () => { for (let i = 0; i < 81; i++) if (!cellVal(i)) return false; return true; };
const solved = () => G.S.V.every((x) => x);

function allowedFor(g) {
  if (g.mode === "exercise") return [...E.keysBelow(E.level(g.key)).filter((k) => k !== g.key), g.key];
  if (g.mode === "example") return E.keysUpTo(g.level);
  return ORDER;
}
const preferFor = (g) => (g.mode === "exercise" || g.mode === "example") && g.forced !== false ? g.key : g.mode === "practice" ? g.keys : null;

// ---------- progress ----------
// Every time a player shows a skill it counts, even several times in one puzzle.
function credit(t) {
  if (!t || !SKILL[t]) return false;
  prog[t] = (prog[t] || 0) + 1;
  saveProg();
  if (G) G.shown[t] = (G.shown[t] || 0) + 1;
  return true;
}
function badge(k) {
  const n = prog[k] || 0, lab = masteryLabel(n);
  const cls = n >= MASTERY.mastered ? "mastered" : n >= MASTERY.gettingIt ? "getting" : n > 0 ? "started" : "";
  return `<span class="badge ${cls}" title="${n} unassisted use${n === 1 ? "" : "s"}">${lab}${n && n < MASTERY.mastered ? ` · ${n}` : ""}</span>`;
}

// ---------- history ----------
const snap = () => ({ V: Array.from(G.S.V), wrong: G.wrong.slice(), N: G.N.slice() });
function pushHist() { G.hist.push(snap()); if (G.hist.length > 300) G.hist.shift(); G.fut = []; }
function restore(s) { G.S = mk(Int8Array.from(s.V)); G.wrong = s.wrong.slice(); G.N = s.N.slice(); }
function undo() { if (!G || !G.hist.length || G.fin !== null) return; G.fut.push(snap()); restore(G.hist.pop()); view = null; setCard(""); er(""); render(); }
function redo() { if (!G || !G.fut.length || G.fin !== null) return; G.hist.push(snap()); restore(G.fut.pop()); view = null; setCard(""); er(""); render(); }

// ---------- small UI helpers ----------
const mini = (f) => '<div class="m">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(f).join("") + "</div>";
const setCard = (h) => { $("hc").innerHTML = h; };
let errText = "";
const er = (t) => { errText = t; $("er").textContent = t; };
const shared = (i, j) => U.map((u, k) => (u.includes(i) && u.includes(j) ? UN(k) : null)).filter(Boolean).join(" and ");

function why(i, d) {
  if (!(G.S.C[i] & bit(d))) {
    const j = [...Array(81).keys()].find((j2) => P[i][j2] && G.S.V[j2] === d);
    if (j !== undefined) return `${d} can't go in ${rc(i)}: ${rc(j)} already has ${an(d)} in the same row, column or box.`;
  }
  const s = avail.find((s2) => s2 && s2.place && s2.place[0] === i);
  return `${d} isn't the answer for ${rc(i)}. ${s ? "This cell can be solved with " + SKILL[s.t].name + ". Look for it." : "Its answer comes from a deeper pattern. Try Hint."}`;
}

// ---------- entering digits ----------
function unplace(i) { const V = Array.from(G.S.V); V[i] = 0; G.S = mk(Int8Array.from(V)); }

function put(i, d, quiet) {
  const before = { V: G.S.V.slice(), C: G.S.C.slice() };
  place(G.S, i, d);
  G.wrong[i] = 0;
  G.N[i] = 0;
  for (let j = 0; j < 81; j++) if (P[i][j]) G.N[j] &= ~bit(d);
  if (view && view.target === i) {
    if (G.mode === "example" && view.c && view.c.key) rew = { t: view.c.key.t, c: view.c, snap: before, lesson: true };
    view = null;
    setCard("");
    if (G.mode === "example" && !quiet) setCard('<div class="card"><b>Correct!</b> That\'s the skill. Finish the puzzle, or try the exercise for this skill.</div>');
  }
}

function enter(d) {
  if (!G || G.fin !== null || demo || busy) return;
  if (sel === null || G.giv[sel]) { foc = foc === d ? 0 : d; return render(); }
  const i = sel;
  if (notesOn) {
    if (cellVal(i)) return;
    pushHist();
    G.N[i] ^= bit(d);
    if (G.mode !== "exercise") detect();
    return render();
  }
  if (cellVal(i) === d) return;
  pushHist();
  if (G.S.V[i]) unplace(i);
  G.wrong[i] = 0;
  G.revealed.delete(i);
  avail = ORDER.map((k) => FINDERS[k](G.S));
  if (G.sol[i] === d) {
    if (!G.assisted.has(i) && (G.mode === "play" || G.mode === "practice")) {
      const shownNow = E.exhibited(G.S, i);
      shownNow.forEach(credit);
      // Time to find: since the last correct digit (or the start), only for skills beyond the singles.
      const now = elapsed(G), dt = now - G.lastAt;
      G.lastAt = now;
      shownNow.filter((k) => E.level(k) >= 3).forEach((k) => recordTime(k, dt));
      // Celebrate the hardest skill the first time it appears in this puzzle.
      const top = shownNow.slice().sort((a, b) => E.level(b) - E.level(a))[0];
      if (top && !G.mine[top] && E.level(top) >= 2) {
        G.mine[top] = 1;
        const hit = avail.find((s) => s && s.place && s.place[0] === i && s.place[1] === d && s.t === top);
        rew = { t: top, c: hit ? { key: hit, target: i, digit: d } : null, snap: { V: G.S.V.slice(), C: G.S.C.slice() } };
      }
    }
    er("");
    put(i, d);
    if (G.mode === "exercise") return finishExercise();
  } else {
    G.wrong[i] = d;
    if (checking()) { G.mist++; G.revealed.add(i); er(why(i, d)); } else er("");
  }
  afterMove();
}

function erase() {
  if (!G || G.fin !== null || demo || sel === null || G.giv[sel]) return;
  const i = sel;
  if (!cellVal(i) && !G.N[i]) return;
  pushHist();
  if (G.wrong[i]) { G.wrong[i] = 0; G.revealed.delete(i); }
  else if (G.S.V[i]) unplace(i);
  else G.N[i] = 0;
  er("");
  render();
}

function checkNow() {
  let n = 0;
  for (let i = 0; i < 81; i++) if (G.wrong[i] && !G.revealed.has(i)) { G.revealed.add(i); G.mist++; n++; }
  const total = G.wrong.filter((x) => x).length;
  er(total ? `${total} cell${total === 1 ? " is" : "s are"} wrong (shown in red).` : "Everything so far is correct.");
  render();
  return n;
}

function afterMove() {
  if (solved()) return finishGame();
  if (isFull() && !checking()) checkNow();
  render();
}

function finishGame() {
  G.fin = elapsed(G);
  pause(G);
  const t = fmt(G.fin);
  let msg = `Solved in ${t}. Hints: ${G.hints}. Mistakes: ${G.mist}.`;
  let medal = "";
  if (G.mode === "play") {
    const k = G.diff, prev = best[k];
    if (!prev || G.fin < prev) { best[k] = G.fin; store.set("sdt-best", best); if (prev) msg += " New best time!"; }
    const before = earnedBadges(solvedCount).length;
    solvedCount++;
    store.set("sdt-solved", solvedCount);
    if (earnedBadges(solvedCount).length > before) medal = `<p class="medal" style="display:inline-block">🏅 New badge: ${solvedCount} puzzles solved!</p>`;
    renderPlayBadges();
  }
  const shown = Object.entries(G.shown).sort((a, b) => E.level(b[0]) - E.level(a[0]));
  const list = shown.length ? `<p class="k2">Skills you showed: ${shown.map(([k, n]) => `${esc(shortName(k))} ✓${n > 1 ? "×" + n : ""}`).join(", ")}</p>` : "";
  view = null;
  setCard(`<div class="card"><b>${msg}</b>${medal}${list}</div>`);
  winWave();
  render();
}

function finishExercise() {
  // The first correct digit in an exercise can only come from the skill: fill in the rest.
  const k = G.key, helped = G.hints > 0;
  for (let i = 0; i < 81; i++) if (!G.S.V[i]) put(i, G.sol[i], true);
  G.fin = elapsed(G);
  pause(G);
  view = null;
  const counted = !helped && credit(k);
  if (counted) recordTime(k, G.fin);
  setCard(`<div class="card"><h2>Exercise complete</h2><b>You used ${esc(SKILL[k].name)}.</b> That finished the puzzle.
    <p class="k2">${counted ? `Counted toward mastery: ${prog[k]} of ${MASTERY.mastered}.` : helped ? "You used a hint, so this one doesn't count toward mastery." : ""}</p>
    <div class="row"><button class="p" data-act="exercise">Another exercise</button><button data-act="example">Watch an example</button></div></div>`);
  winWave();
  render();
}
function winWave() {
  requestAnimationFrame(() => {
    const g = $("g");
    g.classList.add("win");
    [...g.children].forEach((c, i) => { c.style.animationDelay = ((i % 9) + Math.floor(i / 9)) * 30 + "ms"; });
    setTimeout(() => g.classList.remove("win"), 1400);
  });
}

// ---------- notes pattern detection ----------
function detect() {
  const T = mk(G.S.V.slice());
  for (let i = 0; i < 81; i++) if (!G.S.V[i] && G.N[i]) T.C[i] = G.N[i];
  for (const k of ORDER.slice(5)) {
    const s = FINDERS[k](T);
    if (!s || !s.elim || !s.cells.every((i) => !!G.N[i])) continue;
    const el = s.elim.filter(([i, m]) => G.N[i] & m).map(([i, m]) => [i, G.N[i] & m]);
    if (!el.length) continue;
    const key = s.t + JSON.stringify(el);
    if (G.dismissed.has(key)) continue;
    pop = { s: { ...s, elim: el, tgt: el.map((q) => q[0]) }, key };
    view = { step: pop.s, target: null, notes: true };
    const t = SKILL[s.t];
    setCard(`<div class="card"><h2>You found a pattern</h2><b>${esc(t.name)}</b><span class="tag">${t.tier}</span><p>${s.text}</p><p class="k2">${esc(t.short)} The struck-through notes can go, even though you don't know the other digits yet.</p><button class="p" id="pa">Remove them from my notes</button> <button id="pn">Not now</button></div>`);
    return;
  }
}

// ---------- hints, lessons and step-by-step replays ----------
function relCard(v) {
  const t = SKILL[v.step.t];
  setCard(`<div class="card"><h2>${v.lesson ? "Worked example" : "Hint"}</h2><b>${esc(t.name)}</b><span class="tag">${t.tier}</span><p>${v.step.text}</p>${v.step.place ? "" : `<p>After this (and any easier clean-up), <b>${rc(v.c.target)}</b> has just one possible digit. Enter it in the green square.</p>`}<p class="k2">${esc(t.short)}</p><div class="row"><button class="p" id="watch">Watch it step by step</button>${v.lesson ? '<button id="show">Fill it in for me</button>' : ""}</div></div>`);
}

function hint() {
  if (!G || G.fin !== null || demo) return;
  G.hints++;
  if (view && view.hidden && view.c && view.c.key) { view.hidden = false; relCard(view); return render(); }
  const teach = !settings.fast && (G.mode === "play" || G.mode === "practice");
  const c = (teach && E.chainHard(G.S, allowedFor(G))) || E.hintChain(G.S, allowedFor(G), preferFor(G));
  if (!c) {
    view = null;
    setCard('<div class="card"><b>No technique on the map applies here.</b><p class="k2">Check for wrong digits, or this position may need a technique the site doesn\'t teach yet.</p></div>');
    return render();
  }
  G.assisted.add(c.target);
  view = { step: c.key, target: c.target, c };
  relCard(view);
  render();
}

function stagesFor(c) {
  const s = c.key, t = SKILL[s.t], st = [], tg = s.elim ? s.elim.map((q) => q[0]) : [];
  st.push({ hl: s.cells, dig: [], txt: `<b>Starting point.</b> The small numbers in a cell are pencil marks: the digits that could still go there. This technique is called <b>${esc(t.name)}</b>. ${esc(t.short)} Look at the highlighted cells. They form the pattern.` });
  st.push({ hl: s.cells, dig: s.f, txt: `Now look only at the digit${s.f.length > 1 ? "s" : ""} ${s.f.join(" and ")} inside those cells (shown larger and green).` });
  if (s.t === "skyscraper") {
    const { A, B, r1, r2, line } = s.sk, d = s.f[0], ln = line ? "columns" : "rows", bl = line ? "row" : "column", base = [A.find((i) => i !== r1), B.find((i) => i !== r2)];
    st[1] = { hl: [...A, ...B], dig: s.f, txt: `In these two ${ln}, the digit ${d} can go in only two cells each. Each ${ln.slice(0, -1)} still needs one ${d}, so exactly one cell of each pair is ${d}.` };
    st.push({ hl: base, dig: s.f, txt: `Two of the four cells sit in the same ${bl}. These are the <b>base</b>. A ${bl} holds only one ${d}, so at most one base cell is ${d}.` });
    st.push({ hl: [r1, r2], dig: s.f, txt: `The other two cells are the <b>roof</b>. If neither roof cell were ${d}, both ${ln} would put their ${d} in the base, giving two ${d}s in one ${bl}. That is impossible, so at least one roof cell is ${d}.` });
    st.push({ hl: tg, dig: s.f, txt: `Find cells that see BOTH roof cells (same row, column or box as each). Whichever roof cell holds ${d}, these cells see it, so they can't be ${d}.` });
  } else st.push({ hl: s.cells, dig: s.f, txt: s.text });
  if (s.elim) {
    st.push({ hl: tg, dig: s.f, strike: s.elim, txt: `<b>What changes.</b> The struck-through red candidate can't be correct in these cells, so it is removed. In your own notes you would erase it.` });
    st.push({ hl: tg, dig: s.f, after: true, txt: `Here are the pencil marks after the removal.` });
  }
  st.push({ hl: [c.target], dig: [], after: true, txt: `Now look at <b>${rc(c.target)}</b>. ${s.place ? "" : "After that removal (and any easier clean-up), "}only one digit still fits there.` });
  st.push({ hl: [c.target], dig: [], place: true, txt: `<b>Finish.</b> Place <b>${c.digit}</b> in ${rc(c.target)}. That is the answer this technique gives.` });
  return st;
}
function startDemo(c, sn, mine) {
  exSel = null;
  clearTimeout(demo && demo.timer);
  demo = { st: stagesFor(c), i: -1, c, snap: sn || { V: G.S.V.slice(), C: G.S.C.slice() }, auto: false, mine };
  nextStage();
}
function nextStage() {
  if (!demo) return;
  clearTimeout(demo.timer);
  if (demo.i < demo.st.length - 1) {
    demo.i++;
    const s = demo.st[demo.i];
    demo.show = !(s.place || s.strike);
    render();
    demoCard();
    if (!demo.show) setTimeout(() => { if (demo) { demo.show = true; render(); } }, 1300);
    if (demo.auto) demo.timer = setTimeout(nextStage, s.place || s.strike ? 3600 : 3200);
  } else { demo.auto = false; demoCard(); }
}
function demoCard() {
  const d = demo, last = d.i >= d.st.length - 1;
  d.all = false;
  setCard(`<div class="card"><h2>${d.mine ? "What you did" : "Step by step"} · ${d.i + 1} of ${d.st.length}</h2><p>${d.st[d.i].txt}</p><div class="row">${last ? '<button class="p" id="dr">Watch again</button>' : '<button class="p" id="dn">Next</button><button id="dp">Play all</button>'}<button id="da">See all steps</button><button id="dc">Close</button></div></div>`);
}
function seeAll() {
  clearTimeout(demo.timer);
  Object.assign(demo, { auto: false, i: demo.st.length - 1, show: true, all: true });
  render();
  setCard(`<div class="card"><h2>${demo.mine ? "What you did" : "Step by step"}: all steps</h2><ol>${demo.st.map((x) => `<li>${x.txt}</li>`).join("")}</ol><p class="k2">The board shows the finishing point. Tap a highlighted cell to see how it connects.</p><div class="row"><button class="p" id="dr">Watch again</button><button id="dc">Close</button></div></div>`);
}
function explain(i) {
  const src = demo ? demo.c : view && !view.hidden ? view.c : null;
  if (!src || !src.key) return false;
  const s = src.key, el = (s.elim || []).find((q) => q[0] === i), tg = src.target === i, inv = s.cells.includes(i);
  if (!el && !tg && !inv) return false;
  let t;
  const set = new Set();
  if (tg) t = `<b>This is the answer cell (green).</b> ${s.place ? "Only one digit fits here." : "Once the red candidates are removed, only one digit is left here."} Use Watch it step by step to see why.`;
  else if (el) {
    const lk = s.cells.filter((j) => P[i][j]);
    lk.forEach((j) => U.forEach((u) => { if (u.includes(i) && u.includes(j)) u.forEach((c) => set.add(c)); }));
    t = `<b>${rc(i)} (red) loses the ${dg(el[1]).join(", ")}.</b> It sees ${lk.map((j) => rc(j) + " through " + shared(i, j)).join("; ")}. Those are pattern cells, and the blue cells show the lines that connect them. ${esc(SKILL[s.t].why)}`;
  } else t = `<b>${rc(i)} is part of the pattern (yellow).</b> It is one of the cells that holds the key digit. ${esc(SKILL[s.t].why)}`;
  exSel = { set, i };
  setCard(`<div class="card"><h2>${rc(i)}</h2><p>${t}</p><button id="dback">Back</button></div>`);
  render();
  return true;
}

// ---------- drawing the board ----------
function cellLabel(i, v, wrongShown) {
  const r = Math.floor(i / 9) + 1, c = (i % 9) + 1;
  let s = `Row ${r}, column ${c}, `;
  if (v) s += (G.giv[i] ? "given " : wrongShown ? "wrong " : "") + v;
  else if (G.N[i]) s += "notes " + dg(G.N[i]).join(" ");
  else s += "empty";
  return s;
}
function render() {
  if (!G) return;
  const dm = demo && demo.st[demo.i];
  const VV = demo ? demo.snap.V : G.S.V, CC = demo ? demo.snap.C : G.S.C;
  const cnt = Array(10).fill(0);
  G.S.V.forEach((v) => cnt[v]++);
  const st = view && view.step, el = (st && st.elim) || [], show = !demo && view && !view.hidden;
  let CX = CC, R = null;
  if (dm) {
    const k = demo.c.key;
    CX = Int16Array.from(CC);
    if (dm.after || dm.place) for (const [i, m] of k.elim || []) CX[i] &= ~m;
    R = new Set([...k.cells, ...(k.elim || []).map((q) => q[0]), demo.c.target]);
  }
  let h = "";
  for (let i = 0; i < 81; i++) {
    const wrongShown = !demo && G.wrong[i] && (checking() || G.revealed.has(i));
    const v = demo ? VV[i] : VV[i] || G.wrong[i];
    const r = Math.floor(i / 9), c = i % 9;
    let cls = "c";
    if (c % 3 === 2 && c < 8) cls += " br";
    if (r % 3 === 2 && r < 8) cls += " bb";
    if (G.giv[i]) cls += " g";
    if (wrongShown) cls += " bad";
    if (!demo && foc && v === foc) cls += " fo";
    if (!demo && i === sel) cls += " sel";
    if (exSel && exSel.set.has(i)) cls += " ln";
    let inner = "";
    if (dm) {
      const hl = dm.hl.includes(i), sk = dm.strike && dm.strike.find((q) => q[0] === i);
      if (hl && !demo.all) cls += " inv bounce";
      if (demo.c.target === i && (dm.place || dm.after || demo.all)) cls += " tgt";
      if (v) inner = `<span class="d">${v}</span>`;
      else if ((dm.place || demo.all) && demo.c.target === i && demo.show) inner = `<span class="d pre">${demo.c.digit}</span>`;
      else if (R.has(i)) {
        const em = sk && !demo.all ? sk[1] : 0;
        inner = mini((d) => {
          const on = CX[i] & bit(d), x = on && em & bit(d) && demo.show, k = on && dm.dig.includes(d);
          return `<i class="${x ? "x" : k ? "k" : ""}">${on ? d : ""}</i>`;
        });
      }
    } else {
      const inv = show && st.cells.includes(i), e = show && el.find((q) => q[0] === i);
      if (inv) cls += " inv";
      if (e) cls += " el";
      if (view && view.target === i) cls += " tgt";
      if (v) inner = `<span class="d">${v}</span>`;
      else if (inv || e) {
        const em = e ? e[1] : 0, src = view.notes ? G.N : G.S.C;
        inner = mini((d) => {
          const on = src[i] & bit(d), x = on && em & bit(d), k = on && st.f.includes(d);
          return `<i class="${x ? "x" : k ? "k" : ""}">${x || k ? d : ""}</i>`;
        });
      } else if (G.N[i]) inner = mini((d) => `<i>${G.N[i] & bit(d) ? d : ""}</i>`);
    }
    h += `<div class="${cls}" id="c${i}" role="gridcell" data-i="${i}" aria-selected="${i === sel}" aria-label="${cellLabel(i, v, wrongShown)}">${inner}</div>`;
  }
  $("g").innerHTML = h;
  if (sel !== null) $("g").setAttribute("aria-activedescendant", "c" + sel);
  $("rw").innerHTML = rew && !demo ? `<div class="rwb">⭐ ${esc(SKILL[rew.t].name)} used!<br>${rew.c ? '<button id="rwb">Show me what I did</button>' : ""}<button id="rwx" aria-label="Close">×</button></div>` : "";
  if (rew && !demo) { clearTimeout(rew.timer); rew.timer = setTimeout(() => { if (rew) { rew = null; $("rw").innerHTML = ""; } }, 4000); }
  $("pad").innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button data-d="${d}" class="${cnt[d] >= 9 ? "done" : ""}" aria-label="${d}${cnt[d] >= 9 ? ", all placed" : ""}">${d}</button>`).join("");
  avail = ORDER.map((k) => FINDERS[k](G.S));
  $("sk").innerHTML = avail.map((s, k) => (s ? `<button data-k="${k}">${esc(shortName(ORDER[k]))}</button>` : "")).join("") || '<span class="k2">None right now.</span>';
  $("nt").textContent = notesOn ? "✏️ Notes on" : "✏️ Notes";
  $("nt").classList.toggle("on", notesOn);
  $("nt").setAttribute("aria-pressed", notesOn);
  $("undo").disabled = !G.hist.length || G.fin !== null;
  $("redo").disabled = !G.fut.length || G.fin !== null;
  $("check").hidden = checking() || G.fin !== null;
  $("hint").disabled = G.fin !== null;
  $("fast").classList.toggle("on", settings.fast);
  $("fast").setAttribute("aria-pressed", settings.fast);
  $("fast").dataset.tip = settings.fast ? "Fast mode on: Hint points to the easiest next answer (fast run). Tap to switch off." : "Fast mode off: Hint teaches the hardest skill that opens a new cell (to learn). Tap to switch on.";
  $("fast").setAttribute("aria-label", $("fast").dataset.tip);
  $("fast").hidden = !(G.mode === "play" || G.mode === "practice");
  $("avail-card").hidden = G.mode !== "practice";
  $("er").textContent = errText;
  updStatus();
}

function updStatus() {
  if (!G) return;
  const parts = [];
  if (G.info) parts.push(G.info);
  if (settings.showTimer) parts.push((G.fin !== null ? "Time " + fmt(G.fin) : "Time " + fmt(elapsed(G))));
  parts.push(`Mistakes: ${G.mist}`, `Hints: ${G.hints}`);
  if (G.mode === "play" && best[G.diff] && settings.showTimer) parts.push(`Best ${DIFFICULTY[G.diff].label}: ${fmt(best[G.diff])}`);
  $("st").textContent = parts.join(" · ");
}

// ---------- making puzzles ----------
async function busyWhile(label, fn) {
  busy = true;
  $("g").classList.add("busy");
  $("st").textContent = label;
  try { return await fn(); } finally { busy = false; $("g").classList.remove("busy"); }
}
function show(g) {
  pause(G);
  G = g;
  games[tab] = g;
  sel = null; foc = 0; view = null; demo = null; exSel = null; rew = null; pop = null;
  er("");
  setCard("");
  if (tab !== "learn") $("board-view").hidden = false;
  boardHead();
  resume(G);
  render();
}

async function newPlay() {
  const diff = settings.diff, D = DIFFICULTY[diff];
  const p = await busyWhile("Making a puzzle…", () => run("level", [D.minLevel, D.maxLevel, 3000]));
  const g = newGame("play", p, { diff });
  g.info = `${D.label} puzzle`;
  if (tab === "play") show(g); else games.play = g;
}

async function newPractice() {
  const keys = settings.practice.filter((k) => SKILL[k]);
  if (!keys.length) { er("Pick at least one skill first."); return; }
  const p = await busyWhile("Making a practice puzzle…", () => run("practice", [keys, 5000]));
  const g = newGame("practice", p, { keys, covered: p.covered });
  const missing = keys.filter((k) => !p.covered.includes(k));
  g.info = missing.length ? `Couldn't fit ${missing.map(shortName).join(", ")} this time; this one practises ${p.covered.map(shortName).join(", ") || "singles"}` : `Practising ${keys.map(shortName).join(", ")}`;
  show(g);
}

async function newExercise(key) {
  const b = await loadBank();
  const list = (b.exercises && b.exercises[key]) || [];
  let p;
  if (list.length) {
    const e = list[Math.floor(Math.random() * list.length)];
    p = E.transform(E.decode(e.v), E.decode(e.s));
  } else {
    p = await busyWhile("Making an exercise…", () => run("exercise", [key, 8000]));
    if (!p.ok) {
      $("board-view").hidden = true;
      openSkill(key);
      $("skill-view").insertAdjacentHTML("beforeend", `<div class="card"><b>No exercise for ${esc(shortName(key))} yet.</b> Puzzles that can only be finished with it are very rare, so none turned up in the time allowed. Study the example above or watch the worked example instead.</div>`);
      return;
    }
  }
  const g = newGame("exercise", p, { key });
  g.info = `Exercise: ${shortName(key)}`;
  if (E.level(key) >= 3) g.N = Int16Array.from(g.S.C);
  show(g);
  setCard(`<div class="card"><h2>Exercise</h2><b>Use ${esc(SKILL[key].name)} to finish this puzzle.</b><p class="k2">Every empty cell depends on it. ${E.level(key) >= 3 ? "Notes are filled in for you. Find the pattern, erase the notes it rules out, then place the digit that's left." : "Find the cell it solves and enter the digit."} Your first correct digit finishes the puzzle.</p></div>`);
}

async function newExample(key) {
  const ex = await busyWhile("Setting up a worked example…", () => run("example", [key, 2500]));
  const g = newGame("example", ex, { key, level: ex.level, forced: ex.forced });
  g.info = `Worked example: ${shortName(key)}`;
  show(g);
  if (ex.chain) { view = { step: ex.chain.key, target: ex.chain.target, c: ex.chain, lesson: true }; relCard(view); render(); }
  else setCard('<div class="card"><b>Couldn\'t set up this example.</b> Try again.</div>');
}

// ---------- Learn: skills map and skill pages ----------
// Columns match the difficulty bands: Beginner = Easy, Intermediate = Medium, Advanced = Hard.
const COLS = [
  { tier: "Beginner", diff: "Easy puzzles" },
  { tier: "Intermediate", diff: "Medium puzzles" },
  { tier: "Advanced", diff: "Hard puzzles" },
];
const colOf = (k) => TIERS.indexOf(SKILL[k].tier);
const dependents = (k) => SKILLS.filter((s) => s.prereqs.includes(k)).map((s) => s.key);
function ancestors(k, out = new Set()) { for (const p of SKILL[k].prereqs) if (!out.has(p)) { out.add(p); ancestors(p, out); } return out; }
function descendants(k, out = new Set()) { for (const d of dependents(k)) if (!out.has(d)) { out.add(d); descendants(d, out); } return out; }

// Order skills in each column so arrows stay short: a skill sits level with the skills it builds on,
// and below any prerequisite in its own column.
function columnOrder() {
  const pos = {}, cols = [];
  COLS.forEach((c, ci) => {
    const keys = ORDER.filter((k) => colOf(k) === ci), v = {};
    const val = (k) => {
      if (v[k] !== undefined) return v[k];
      const s = SKILL[k], cross = s.prereqs.filter((p) => colOf(p) !== ci), same = s.prereqs.filter((p) => colOf(p) === ci);
      let x = cross.length ? cross.reduce((a, p) => a + pos[p], 0) / cross.length : same.length ? -1 : keys.indexOf(k);
      for (const p of same) x = Math.max(x, val(p) + 0.5);
      return (v[k] = x);
    };
    const sorted = keys.slice().sort((a, b) => val(a) - val(b) || ORDER.indexOf(a) - ORDER.indexOf(b));
    sorted.forEach((k, i) => { pos[k] = i; });
    cols.push(sorted);
  });
  return cols;
}
function nodeBadge(k) {
  const n = prog[k] || 0;
  if (!n) return "";
  return `<span class="badge ${n >= MASTERY.mastered ? "mastered" : n >= MASTERY.gettingIt ? "getting" : "started"}">${n >= MASTERY.mastered ? "★" : "✓ " + n}</span>`;
}
function renderMap() {
  const cols = columnOrder();
  $("skill-map").innerHTML = `<div class="depmap"><svg class="edges" aria-hidden="true"><defs></defs></svg><div class="cols">${cols.map((keys, ci) => `
    <div class="col t${ci + 1}" role="group" aria-label="${COLS[ci].tier} skills"><h2>${COLS[ci].tier}<small>${COLS[ci].diff}</small></h2>
    ${keys.map((k) => {
      const s = SKILL[k], deps = dependents(k);
      const desc = `${s.name}. ${masteryLabel(prog[k] || 0)}. ${s.prereqs.length ? "Builds on " + s.prereqs.map(shortName).join(", ") + "." : "No prerequisites."}${deps.length ? " Opens " + deps.map(shortName).join(", ") + "." : ""}`;
      return `<button class="node" data-skill="${k}" aria-label="${esc(desc)}" title="${esc(masteryLabel(prog[k] || 0))}"><b>${esc(shortName(k))}</b>${nodeBadge(k)}</button>`;
    }).join("")}</div>`).join("")}</div></div>`;
  $("planned").innerHTML = `<h2>Coming to the map</h2><p class="k2">Next in the research plan. The generator can't make puzzles for these yet.</p><ul>${PLANNED.map((p) => `<li><a href="${p.url}" target="_blank" rel="noopener">${esc(p.name)}</a> <span class="k2">(${p.tier})</span></li>`).join("")}</ul>`;
  requestAnimationFrame(drawEdges);
}
function drawEdges() {
  const map = document.querySelector(".depmap");
  if (!map || !map.offsetParent) return;
  const box = map.getBoundingClientRect(), svg = map.querySelector("svg");
  const r = {};
  map.querySelectorAll(".node").forEach((n) => { const b = n.getBoundingClientRect(); r[n.dataset.skill] = { x: b.left - box.left, y: b.top - box.top, w: b.width, h: b.height }; });
  let paths = "";
  for (const s of SKILLS) for (const p of s.prereqs) {
    const a = r[p], b = r[s.key];
    if (!a || !b) continue;
    let d;
    if (colOf(p) === colOf(s.key)) {
      // Same column: a bracket down the left side.
      const x1 = a.x, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2;
      const gap = Math.round((y2 - y1) / (a.h + 10));
      const off = Math.min(20, 8 + 5 * Math.max(0, gap - 1));
      d = `M${x1} ${y1} C${x1 - off} ${y1} ${x2 - off} ${y2} ${x2 - 1} ${y2}`;
    } else {
      const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2, mid = (x1 + x2) / 2;
      d = `M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2 - 1} ${y2}`;
    }
    paths += `<path class="edge" data-from="${p}" data-to="${s.key}" d="${d}" marker-end="url(#ah)"/>`;
  }
  svg.innerHTML = `<defs><marker id="ah" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path class="arrowhead" d="M0 0L10 5L0 10z"/></marker><marker id="ah-on" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path class="arrowhead on" d="M0 0L10 5L0 10z"/></marker></defs>${paths}`;
}
function highlightPath(key) {
  const chain = key ? new Set([key, ...ancestors(key), ...descendants(key)]) : null;
  document.querySelectorAll(".node").forEach((n) => {
    n.classList.toggle("dim", !!chain && !chain.has(n.dataset.skill));
    n.classList.toggle("on", n.dataset.skill === key);
  });
  document.querySelectorAll(".edge").forEach((e) => {
    const on = chain && chain.has(e.dataset.from) && chain.has(e.dataset.to);
    e.classList.toggle("on", !!on);
    e.classList.toggle("dim", !!chain && !on);
    e.setAttribute("marker-end", on ? "url(#ah-on)" : "url(#ah)");
  });
}
window.addEventListener("resize", () => requestAnimationFrame(drawEdges));
function openSkill(key) {
  learnSkill = key;
  const s = SKILL[key], n = prog[key] || 0;
  const leadsTo = SKILLS.filter((x) => x.prereqs.includes(key));
  const link = (k) => `<button class="linky" data-skill="${k}">${esc(shortName(k))}</button>`;
  $("skill-view").innerHTML = `
    <div class="row"><button data-act="map">← Skills map</button></div>
    <div class="card">
      <h3>${esc(s.name)}</h3><span class="tag" style="margin-left:0">${s.tier}</span> ${badge(key)}
      <div class="bar" title="${n} of ${MASTERY.mastered}"><i style="width:${Math.min(100, (n / MASTERY.mastered) * 100)}%"></i></div>
      <p class="k2">${n} unassisted use${n === 1 ? "" : "s"}. ${MASTERY.gettingIt} = Getting it!, ${MASTERY.mastered} = Mastered.${medianTime(key) !== null ? ` Typical time to find: <b>${fmt(medianTime(key))}</b> (last ${times[key].length}, capped at 4:00).` : ""}</p>
      <p><b>${esc(s.short)}</b></p>
      ${s.explain.map((p) => `<p>${esc(p)}</p>`).join("")}
      <h2>Example</h2><div id="diagram"><p class="k2">Loading example…</p></div>
      <h2>Why it works</h2><p>${esc(s.why)}</p>
      <p class="arrow">${s.prereqs.length ? "Builds on: " + s.prereqs.map(link).join(", ") : "No prerequisites."}${leadsTo.length ? "<br>Opens: " + leadsTo.map((x) => link(x.key)).join(", ") : ""}</p>
      ${pathTo(key)}
      <h2>Sources</h2><ul>${s.sources.map((x) => `<li><a href="${x.url}" target="_blank" rel="noopener">${esc(x.label)}</a></li>`).join("")}</ul>
      <div class="row"><button class="p" data-act="exercise">Try the exercise</button><button data-act="example">Watch a worked example</button>${s.prereqs.length ? `<button data-act="bundle">Practise with ${s.prereqs.map((p) => esc(shortName(p))).join(" + ")}</button>` : ""}</div>
    </div>`;
  $("map-view").hidden = true;
  $("skill-view").hidden = false;
  $("board-view").hidden = true;
  loadBank().then((b) => {
    const el = $("diagram");
    if (!el || learnSkill !== key) return;
    const ex = b.examples && b.examples[key];
    el.innerHTML = ex ? diagram(ex) : '<p class="k2">No still example yet. Use "Watch a worked example" below.</p>';
  });
}

// A still picture of the moment the skill applies: pattern yellow, removed candidates red, answer green.
function diagram(ex) {
  const V = E.decode(ex.v), giv = [...ex.giv].map((c) => c === "1"), st = ex.step;
  const elim = new Map(st.elim.map(([i, m]) => [i, m])), cells = new Set(st.cells);
  let h = "";
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9), c = i % 9;
    let cls = "c";
    if (c % 3 === 2 && c < 8) cls += " br";
    if (r % 3 === 2 && r < 8) cls += " bb";
    if (giv[i]) cls += " g";
    if (cells.has(i)) cls += " inv";
    if (elim.has(i)) cls += " el";
    if (i === ex.target) cls += " tgt";
    let inner = "";
    if (V[i]) inner = `<span class="d">${V[i]}</span>`;
    else if (i === ex.target && !cells.has(i) && !elim.has(i)) inner = `<span class="d pre">${ex.digit}</span>`;
    else if (cells.has(i) || elim.has(i)) {
      const em = elim.get(i) || 0;
      inner = mini((d) => {
        const on = ex.c[i] & bit(d), x = on && em & bit(d), k = on && st.f.includes(d);
        return `<i class="${x ? "x" : k ? "k" : ""}">${on ? d : ""}</i>`;
      });
    }
    h += `<div class="${cls}">${inner}</div>`;
  }
  const then = st.place ? "" : ` Then ${rc(ex.target)} can only be ${ex.digit}.`;
  return `<figure class="diagram"><div class="board-mini" role="img" aria-label="Example position for ${esc(SKILL[st.t].name)}">${h}</div>
    <figcaption><span class="k2">Yellow: the pattern. Red, struck through: candidates removed. Green: the cell it solves.</span><br>${st.text}${then}</figcaption></figure>`;
}
// The learning path that leads to a skill, easiest first.
function pathTo(key) {
  const anc = [...ancestors(key)];
  if (!anc.length) return "";
  const steps = ORDER.filter((k) => anc.includes(k));
  const done = steps.filter((k) => (prog[k] || 0) >= MASTERY.gettingIt).length;
  return `<p class="path">Learning path (${done} of ${steps.length} at Getting it! or better): ${steps.map((k) => ((prog[k] || 0) >= MASTERY.gettingIt ? "<b>" + esc(shortName(k)) + " ✓</b>" : esc(shortName(k)))).join(" → ")} → <b>${esc(shortName(key))}</b></p>`;
}
function closeSkill() {
  learnSkill = null;
  $("skill-view").hidden = true;
  $("map-view").hidden = false;
  $("board-view").hidden = true;
  pause(G);
  renderMap();
  highlightPath(null);
}

// ---------- Practice picker ----------
function renderPicker() {
  $("practice-picker").innerHTML = TIERS.map((tier, n) => `<section class="tier t${n + 1}"><h2>${tier}</h2><div class="pick">${SKILLS.filter((s) => s.tier === tier).map((s) => `<label><input type="checkbox" value="${s.key}" ${settings.practice.includes(s.key) ? "checked" : ""}><span>${esc(shortName(s.key))}</span>${badge(s.key)}</label>`).join("")}</div></section>`).join("");
}
function pickWeakest() {
  // Two least-practised skills whose prerequisites have at least been started.
  const ready = SKILLS.filter((s) => s.prereqs.every((p) => (prog[p] || 0) > 0) || s.prereqs.length === 0);
  const pool = ready.length ? ready : SKILLS;
  settings.practice = pool.slice().sort((a, b) => (prog[a.key] || 0) - (prog[b.key] || 0) || a.level - b.level).slice(0, 2).map((s) => s.key);
  saveSettings();
  renderPicker();
}

// ---------- tabs and board header ----------
function boardHead() {
  let h = "";
  if (tab === "learn" && G && (G.mode === "exercise" || G.mode === "example")) {
    h = `<div class="row"><button data-act="skill">← ${esc(shortName(G.key))}</button><button class="p" data-act="${G.mode}">${G.mode === "exercise" ? "Another exercise" : "Another example"}</button></div>`;
  } else if (tab === "practice") {
    h = `<div class="row"><button class="p" id="pr-again">New practice puzzle</button></div>`;
  }
  $("board-head").innerHTML = h;
}
function setTab(t) {
  pause(G);
  tab = t;
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === t));
  $("play-view").hidden = t !== "play";
  $("learn-view").hidden = t !== "learn";
  $("practice-view").hidden = t !== "practice";
  G = games[t];
  sel = null; foc = 0; view = null; demo = null; exSel = null; rew = null; pop = null;
  er("");
  setCard("");
  if (t === "learn") {
    $("board-view").hidden = true;
    if (learnSkill) openSkill(learnSkill); else closeSkill();
    return;
  }
  if (t === "practice") renderPicker();
  $("board-view").hidden = !G;
  boardHead();
  if (G) { resume(G); render(); }
  if (t === "play" && !G) newPlay();
}
function showLearnBoard() {
  $("skill-view").hidden = true;
  $("map-view").hidden = true;
  $("board-view").hidden = false;
}

// ---------- events ----------
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button,.c");
  if (!b) return;
  if (b.dataset.tab) return setTab(b.dataset.tab);
  if (b.dataset.skill) return openSkill(b.dataset.skill);
  const act = b.dataset.act;
  if (act === "map") return closeSkill();
  if (act === "bundle") {
    const key = learnSkill;
    settings.practice = [key, ...SKILL[key].prereqs];
    saveSettings();
    setTab("practice");
    return newPractice();
  }
  if (act === "skill") { pause(G); return openSkill(G.key); }
  if (act === "exercise" || act === "example") {
    const key = tab === "learn" ? (learnSkill || (G && G.key)) : G && G.key;
    if (!key) return;
    tab = "learn";
    learnSkill = key;
    showLearnBoard();
    return act === "exercise" ? newExercise(key) : newExample(key);
  }
  switch (b.id) {
    case "play-new": return newPlay();
    case "pr-go": case "pr-again": return newPractice();
    case "pr-weak": return pickWeakest();
    case "pr-clear": settings.practice = []; saveSettings(); return renderPicker();
    case "nt": notesOn = !notesOn; return render();
    case "fast": settings.fast = !settings.fast; saveSettings(); return render();
    case "theme": settings.theme = { auto: "light", light: "dark", dark: "auto" }[settings.theme] || "auto"; saveSettings(); return applyTheme();
    case "export": {
      const data = { app: "sudoku-tutor", version: 1, exported: new Date().toISOString(), progress: prog, solved: solvedCount, best, times, settings };
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
      a.download = `sudoku-tutor-progress-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      $("reset-msg").textContent = "Progress saved to a file.";
      return;
    }
    case "import": return $("import-file").click();
    case "reset": {
      if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Tap again to reset"; $("reset-msg").textContent = "This clears skill counts, badges and best times on this device."; return; }
      prog = {}; saveProg(); solvedCount = 0; store.set("sdt-solved", 0); times = {}; store.set("sdt-times", times);
      for (const k of Object.keys(best)) delete best[k];
      store.set("sdt-best", best);
      delete b.dataset.armed; b.textContent = "Reset my progress"; $("reset-msg").textContent = "Progress reset.";
      renderPlayBadges(); renderMap(); return render();
    }
    case "erase": return erase();
    case "undo": return undo();
    case "redo": return redo();
    case "check": return checkNow();
    case "hint": return hint();
    case "fill": if (!G || G.fin !== null) return; pushHist(); G.N = Int16Array.from(G.S.C); return render();
    case "pa": {
      credit(pop.s.t);
      pushHist();
      for (const [i, m] of pop.s.elim) G.N[i] &= ~m;
      const one = pop.s.elim.map((q) => q[0]).find((i) => pc(G.N[i]) === 1);
      view = null;
      setCard(one !== undefined ? `<div class="card"><b>${rc(one)} now has one note: ${dg(G.N[one])[0]}.</b> Turn Notes off and enter it.</div>` : "");
      return render();
    }
    case "pn": G.dismissed.add(pop.key); view = null; setCard(""); return render();
    case "show": { const c = view.c; put(c.target, c.digit, true); setCard('<div class="card"><b>Filled in.</b> Finish the puzzle, or try the exercise for this skill.</div>'); return solved() ? finishGame() : render(); }
    case "watch": return startDemo(view.c);
    case "rwb": return startDemo(rew.c, rew.snap, true);
    case "rwx": rew = null; return render();
    case "da": return seeAll();
    case "dback": exSel = null; if (demo && demo.all) seeAll(); else if (demo) demoCard(); else if (view) relCard(view); return render();
    case "dn": return nextStage();
    case "dp": demo.auto = true; return nextStage();
    case "dr": Object.assign(demo, { all: false, i: -1, auto: false }); return nextStage();
    case "dc": clearTimeout(demo && demo.timer); demo = null; setCard(""); return render();
  }
  if (b.dataset.k !== undefined) {
    const s = avail[+b.dataset.k];
    if (!s) return;
    view = { step: s, target: s.place ? s.place[0] : null, c: { target: s.place ? s.place[0] : null } };
    setCard(`<div class="card"><b>${esc(SKILL[s.t].name)}</b><p class="k2">${esc(SKILL[s.t].short)}</p><p class="k2">The highlighted cells are where it applies.</p></div>`);
    return render();
  }
  if (b.dataset.d) return enter(+b.dataset.d);
  if (b.classList.contains("c") && G) {
    sel = +b.dataset.i;
    if (cellVal(sel) && !demo) foc = cellVal(sel);
    $("g").focus({ preventScroll: true });
    if (!explain(sel)) render();
  }
});

document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "import-file" && t.files[0]) {
    t.files[0].text().then((txt) => {
      try {
        const d = JSON.parse(txt);
        if (d.app !== "sudoku-tutor" || typeof d.progress !== "object") throw new Error("not a Sudoku Tutor progress file");
        prog = d.progress || {}; saveProg();
        solvedCount = +d.solved || 0; store.set("sdt-solved", solvedCount);
        for (const k of Object.keys(best)) delete best[k];
        Object.assign(best, d.best || {}); store.set("sdt-best", best);
        times = d.times || {}; store.set("sdt-times", times);
        $("reset-msg").textContent = "Progress loaded from the file.";
        renderPlayBadges(); renderMap(); render();
      } catch (err) { $("reset-msg").textContent = "Couldn't read that file: " + err.message + "."; }
      t.value = "";
    });
    return;
  }
  if (t.id === "diff") { settings.diff = t.value; saveSettings(); return newPlay(); }
  if (t.id === "set-check") { settings.checkAsGo = t.checked; saveSettings(); if (G && checking()) { for (let i = 0; i < 81; i++) if (G.wrong[i] && !G.revealed.has(i)) { G.revealed.add(i); G.mist++; } } return render(); }
  if (t.id === "set-timer") { settings.showTimer = t.checked; saveSettings(); return render(); }
  if (t.closest("#practice-picker")) {
    settings.practice = [...document.querySelectorAll("#practice-picker input:checked")].map((x) => x.value);
    saveSettings();
  }
});
document.addEventListener("mouseover", (e) => { const b = e.target.closest(".node"); if (b) highlightPath(b.dataset.skill); });
document.addEventListener("mouseout", (e) => { const b = e.target.closest(".node"); if (b && !b.contains(e.relatedTarget)) highlightPath(null); });
document.addEventListener("focusin", (e) => { const b = e.target.closest && e.target.closest(".node"); if (b) highlightPath(b.dataset.skill); });
document.addEventListener("focusout", (e) => { if (e.target.closest && e.target.closest(".node")) highlightPath(null); });
// Right-click (or long-press) a button with a tip to read it.
document.addEventListener("contextmenu", (e) => {
  const b = e.target.closest("[data-tip]");
  if (!b) return;
  e.preventDefault();
  b.classList.add("tip");
  setTimeout(() => b.classList.remove("tip"), 3500);
});

document.addEventListener("keydown", (e) => {
  if (!G || $("board-view").hidden) return;
  if (e.target.matches && e.target.matches("input, select, textarea")) return;
  const k = e.key;
  if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === "z") { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
  if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === "y") { e.preventDefault(); return redo(); }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const mv = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[k];
  if (mv !== undefined) {
    e.preventDefault();
    if (sel === null) sel = 0;
    else {
      const r = Math.floor(sel / 9), c = sel % 9;
      if (k === "ArrowUp") sel = ((r + 8) % 9) * 9 + c;
      if (k === "ArrowDown") sel = ((r + 1) % 9) * 9 + c;
      if (k === "ArrowLeft") sel = r * 9 + ((c + 8) % 9);
      if (k === "ArrowRight") sel = r * 9 + ((c + 1) % 9);
    }
    foc = cellVal(sel) || 0;
    if (!explain(sel)) render();
    return;
  }
  if (/^[1-9]$/.test(k)) { e.preventDefault(); return enter(+k); }
  if (k === "Backspace" || k === "Delete" || k === "0") { e.preventDefault(); return erase(); }
  if (k === "n" || k === "N") { notesOn = !notesOn; return render(); }
});

document.addEventListener("visibilitychange", () => { if (document.hidden) pause(G); else if (G && !$("board-view").hidden) resume(G); });
setInterval(() => { if (G && G.fin === null && !$("board-view").hidden) updStatus(); }, 1000);

function applyTheme() {
  const t = settings.theme;
  if (t === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t);
  const label = { auto: "🌓 Auto", light: "☀️ Light", dark: "🌙 Dark" }[t];
  $("theme").textContent = label;
  $("theme").setAttribute("aria-label", `Colour theme: ${t}. Tap to change.`);
}
function renderPlayBadges() {
  const got = earnedBadges(solvedCount), next = nextBadge(solvedCount);
  $("play-badges").innerHTML = `<span>Puzzles solved: <b>${solvedCount}</b></span>${got.map((t) => `<span class="medal" title="${t} puzzles solved">🏅 ${t}</span>`).join("")}<span>Next badge at ${next}</span>`;
}

// ---------- start ----------
$("diff").value = settings.diff;
$("set-check").checked = settings.checkAsGo;
$("set-timer").checked = settings.showTimer;
applyTheme();
renderPlayBadges();
renderMap();
setTab("play");

// Read-only hook for automated browser tests.
window.__sudokuTutor = { game: () => G };
