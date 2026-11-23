// Sudoku Tutor engine: grid helpers, technique finders, logic solver and generators.
// Pure JavaScript with no DOM access, so it runs in the page, in a Web Worker and in Node tests.

import { SKILL } from "./skills.js";

// ---------- grid helpers ----------
export const rnd = (n) => Math.floor(Math.random() * n);
export const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const bit = (d) => 1 << d;
export const pc = (m) => {
  let n = 0;
  while (m) {
    n += m & 1;
    m >>= 1;
  }
  return n;
};
export const dg = (m) => {
  const r = [];
  for (let d = 1; d <= 9; d++) if (m & bit(d)) r.push(d);
  return r;
};
export const rc = (i) => "R" + (Math.floor(i / 9) + 1) + "C" + (i % 9 + 1);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// U: the 27 units (9 rows, 9 columns, 9 boxes) as lists of cell indexes 0..80.
export const U = [];
for (let r = 0; r < 9; r++) U.push([...Array(9)].map((_, c) => r * 9 + c));
for (let c = 0; c < 9; c++) U.push([...Array(9)].map((_, r) => r * 9 + c));
for (let b = 0; b < 9; b++) {
  const r0 = Math.floor(b / 3) * 3, c0 = b % 3 * 3;
  U.push([0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => (r0 + Math.floor(k / 3)) * 9 + c0 + k % 3));
}
export const UN = (u) => u < 9 ? "row " + (u + 1) : u < 18 ? "column " + (u - 8) : "box " + (u - 17);
// P[a][b] = 1 when cells a and b share a unit ("see" each other).
export const P = Array.from({ length: 81 }, () => new Uint8Array(81));
for (const u of U) for (const a of u) for (const b of u) if (a !== b) P[a][b] = 1;

// A state S is { V: values (0 = empty), C: candidate bitmasks (bit d set = digit d possible) }.
export function mk(V) {
  const C = new Int16Array(81);
  for (let i = 0; i < 81; i++) if (!V[i]) {
    let m = 1022;
    for (let j = 0; j < 81; j++) if (P[i][j] && V[j]) m &= ~bit(V[j]);
    C[i] = m;
  }
  return { V, C };
}
export function place(S, i, d) {
  S.V[i] = d;
  S.C[i] = 0;
  for (let j = 0; j < 81; j++) if (P[i][j]) S.C[j] &= ~bit(d);
}
export function apply(S, s) {
  if (s.place) place(S, s.place[0], s.place[1]);
  for (const [i, m] of s.elim || []) S.C[i] &= ~m;
}
const empt = (S, u) => U[u].filter((i) => !S.V[i]);

// ---------- technique finders ----------
// Each finder takes a state and returns the first step it finds, or null.
// A step is { t: skill key, place?: [cell, digit], elim?: [[cell, mask]], cells, tgt, f: key digits, text }.
function fFull(S2) {
  for (let u = 0; u < 27; u++) {
    const e = empt(S2, u);
    if (e.length === 1) {
      let m = 1022;
      for (const i of U[u]) if (S2.V[i]) m &= ~bit(S2.V[i]);
      const d = dg(m)[0];
      return { t: "fullhouse", place: [e[0], d], cells: U[u], tgt: [e[0]], f: [d], text: `${cap(UN(u))} has only one empty cell, ${rc(e[0])}. The one digit it\u2019s missing is ${d}.` };
    }
  }
  return null;
}
function fLast(S2) {
  for (let d = 1; d <= 9; d++) {
    const pl = [];
    for (let i = 0; i < 81; i++) if (S2.V[i] === d) pl.push(i);
    if (pl.length === 8) {
      const c = [];
      for (let i = 0; i < 81; i++) if (!S2.V[i] && S2.C[i] & bit(d)) c.push(i);
      if (c.length === 1) return { t: "lastdigit", place: [c[0], d], cells: pl, tgt: [c[0]], f: [d], text: `The digit ${d} is already placed 8 times (highlighted), so the 9th must go in ${rc(c[0])}.` };
    }
  }
  return null;
}
function fScan(S2) {
  for (let d = 1; d <= 9; d++) for (let u = 18; u < 27; u++) {
    const c = U[u].filter((i) => !S2.V[i] && S2.C[i] & bit(d));
    if (c.length === 1) {
      const pl = [];
      for (let i = 0; i < 81; i++) if (S2.V[i] === d) pl.push(i);
      return { t: "scanning", place: [c[0], d], cells: pl, tgt: [c[0]], f: [d], text: `Look at every ${d} already placed (highlighted). Their rows and columns block ${d} from all but one empty cell in ${UN(u)}: ${rc(c[0])}.` };
    }
  }
  return null;
}
function fNaked(S2) {
  for (let i = 0; i < 81; i++) if (!S2.V[i] && pc(S2.C[i]) === 1) {
    const d = dg(S2.C[i])[0];
    return { t: "naked1", place: [i, d], cells: [i], tgt: [i], f: [d], text: `${rc(i)} has only one candidate left: ${d}. Every other digit already appears in its row, column or box.` };
  }
  return null;
}
function fHidden(S2) {
  for (let u = 0; u < 27; u++) for (let d = 1; d <= 9; d++) {
    const c = U[u].filter((i) => !S2.V[i] && S2.C[i] & bit(d));
    if (c.length === 1) return { t: "hidden1", place: [c[0], d], cells: U[u], tgt: [c[0]], f: [d], text: `In ${UN(u)}, the digit ${d} fits in only one cell: ${rc(c[0])}. The cell may have other candidates, but ${d} has nowhere else to go in this unit.` };
  }
  return null;
}
function fNP(S2) {
  for (let u = 0; u < 27; u++) {
    const e = U[u].filter((i) => !S2.V[i] && pc(S2.C[i]) === 2);
    for (let a = 0; a < e.length; a++) for (let b = a + 1; b < e.length; b++) if (S2.C[e[a]] === S2.C[e[b]]) {
      const m = S2.C[e[a]], el = [];
      for (const j of U[u]) if (!S2.V[j] && j !== e[a] && j !== e[b] && S2.C[j] & m) el.push([j, S2.C[j] & m]);
      if (el.length) {
        const [x, y] = dg(m);
        return { t: "nakedpair", elim: el, cells: [e[a], e[b]], tgt: el.map((q) => q[0]), f: [x, y], text: `${rc(e[a])} and ${rc(e[b])} both hold only {${x},${y}}. Those two digits must fill those two cells, so ${x} and ${y} can be removed from the other cells in ${UN(u)} (struck through in red).` };
      }
    }
  }
  return null;
}
function fHP(S2) {
  for (let u = 0; u < 27; u++) {
    const pos = {};
    for (let d = 1; d <= 9; d++) pos[d] = U[u].filter((i) => !S2.V[i] && S2.C[i] & bit(d));
    for (let a = 1; a < 9; a++) for (let b = a + 1; b <= 9; b++) {
      const pa = pos[a], pb = pos[b];
      if (pa.length === 2 && pb.length === 2 && pa[0] === pb[0] && pa[1] === pb[1]) {
        const m = bit(a) | bit(b), el = [];
        for (const j of pa) if (S2.C[j] & ~m) el.push([j, S2.C[j] & ~m]);
        if (el.length) return { t: "hiddenpair", elim: el, cells: pa, tgt: pa, f: [a, b], text: `In ${UN(u)}, the digits ${a} and ${b} fit only in ${rc(pa[0])} and ${rc(pa[1])}. Those cells must hold ${a} and ${b}, so every other candidate can be removed from them.` };
      }
    }
  }
  return null;
}
function fPoint(S2) {
  for (let u = 18; u < 27; u++) for (let d = 1; d <= 9; d++) {
    const c = U[u].filter((i) => !S2.V[i] && S2.C[i] & bit(d));
    if (c.length < 2) continue;
    for (const line of [0, 1]) {
      const k = c.map((i) => line ? i % 9 : Math.floor(i / 9));
      if (k.every((v) => v === k[0])) {
        const el = [];
        for (const j of U[(line ? 9 : 0) + k[0]]) if (!U[u].includes(j) && !S2.V[j] && S2.C[j] & bit(d)) el.push([j, bit(d)]);
        if (el.length) return { t: "pointing", elim: el, cells: c, tgt: el.map((q) => q[0]), f: [d], text: `In ${UN(u)}, ${d} can only go in ${UN((line ? 9 : 0) + k[0])} (${c.map(rc).join(", ")}). So that box\u2019s ${d} is in this line, and ${d} can be removed from the rest of the line.` };
      }
    }
  }
  return null;
}
function fClaim(S2) {
  for (let u = 0; u < 18; u++) for (let d = 1; d <= 9; d++) {
    const c = U[u].filter((i) => !S2.V[i] && S2.C[i] & bit(d));
    if (c.length < 2) continue;
    const b = c.map((i) => Math.floor(i / 27) * 3 + Math.floor(i % 9 / 3));
    if (b.every((v) => v === b[0])) {
      const el = [];
      for (const j of U[18 + b[0]]) if (!U[u].includes(j) && !S2.V[j] && S2.C[j] & bit(d)) el.push([j, bit(d)]);
      if (el.length) return { t: "claiming", elim: el, cells: c, tgt: el.map((q) => q[0]), f: [d], text: `In ${UN(u)}, ${d} can only go inside ${UN(18 + b[0])} (${c.map(rc).join(", ")}). So that box\u2019s ${d} is in this line, and ${d} can be removed from the box\u2019s other cells.` };
    }
  }
  return null;
}
function fX(S2) {
  for (let d = 1; d <= 9; d++) for (const line of [0, 1]) {
    const two = [];
    for (let k = 0; k < 9; k++) {
      const c = U[(line ? 9 : 0) + k].filter((i) => !S2.V[i] && S2.C[i] & bit(d));
      if (c.length === 2) two.push(c);
    }
    const key = (i) => line ? Math.floor(i / 9) : i % 9;
    for (let a = 0; a < two.length; a++) for (let b = a + 1; b < two.length; b++) {
      const A = two[a], B = two[b];
      if (key(A[0]) === key(B[0]) && key(A[1]) === key(B[1])) {
        const el = [];
        for (const q of [key(A[0]), key(A[1])]) for (const j of U[(line ? 0 : 9) + q]) if (!A.includes(j) && !B.includes(j) && !S2.V[j] && S2.C[j] & bit(d)) el.push([j, bit(d)]);
        if (el.length) {
          const w = line ? "columns" : "rows", x = line ? "rows" : "columns";
          return { t: "xwing", elim: el, cells: [...A, ...B], tgt: el.map((q) => q[0]), f: [d], text: `In two ${w}, the digit ${d} has exactly two possible cells each (${[...A, ...B].map(rc).join(", ")}), lined up in the same two ${x}. ${d} must take one diagonal of this rectangle, so ${d} can be removed from the rest of those two ${x}.` };
        }
      }
    }
  }
  return null;
}
function fXY(S2) {
  for (let p = 0; p < 81; p++) {
    if (S2.V[p] || pc(S2.C[p]) !== 2) continue;
    const w = [];
    for (let q = 0; q < 81; q++) if (P[p][q] && !S2.V[q] && pc(S2.C[q]) === 2 && pc(S2.C[q] & S2.C[p]) === 1) w.push(q);
    for (let a = 0; a < w.length; a++) for (let b = a + 1; b < w.length; b++) {
      const q1 = w[a], q2 = w[b], x = S2.C[q1] & ~S2.C[p];
      if (x !== (S2.C[q2] & ~S2.C[p])) continue;
      if ((S2.C[q1] & S2.C[p]) === (S2.C[q2] & S2.C[p])) continue;
      const el = [];
      for (let j = 0; j < 81; j++) if (j !== p && j !== q1 && j !== q2 && !S2.V[j] && P[q1][j] && P[q2][j] && S2.C[j] & x) el.push([j, x]);
      if (el.length) {
        const c = dg(x)[0], [A, B] = dg(S2.C[p]);
        return { t: "xywing", elim: el, cells: [p, q1, q2], tgt: el.map((q) => q[0]), f: [c], text: `Pivot ${rc(p)} holds {${A},${B}}. Wing ${rc(q1)} holds {${dg(S2.C[q1])}} and wing ${rc(q2)} holds {${dg(S2.C[q2])}}. Whichever way the pivot goes, one wing must be ${c}, so ${c} can be removed from every cell that sees both wings.` };
      }
    }
  }
  return null;
}
function fSw(S2) {
  for (let d = 1; d <= 9; d++) for (const line of [0, 1]) {
    const key = (i) => line ? Math.floor(i / 9) : i % 9, ls = [];
    for (let k = 0; k < 9; k++) {
      const c = U[(line ? 9 : 0) + k].filter((i) => !S2.V[i] && S2.C[i] & bit(d));
      if (c.length >= 2 && c.length <= 3) ls.push(c);
    }
    for (let a = 0; a < ls.length; a++) for (let b = a + 1; b < ls.length; b++) for (let c = b + 1; c < ls.length; c++) {
      const cs = [...ls[a], ...ls[b], ...ls[c]], ks = [...new Set(cs.map(key))];
      if (ks.length !== 3) continue;
      const el = [];
      for (const q of ks) for (const j of U[(line ? 0 : 9) + q]) if (!cs.includes(j) && !S2.V[j] && S2.C[j] & bit(d)) el.push([j, bit(d)]);
      if (el.length) {
        const w = line ? "columns" : "rows", x = line ? "rows" : "columns";
        return { t: "swordfish", elim: el, cells: cs, tgt: el.map((q) => q[0]), f: [d], text: `In three ${w}, the digit ${d} has only two or three possible cells each (${cs.map(rc).join(", ")}), all inside the same three ${x}. So ${d} is used up inside those three ${x}, and can be removed from every other cell in them.` };
      }
    }
  }
  return null;
}
function fXYZ(S2) {
  for (let p = 0; p < 81; p++) {
    if (S2.V[p] || pc(S2.C[p]) !== 3) continue;
    const w = [];
    for (let q = 0; q < 81; q++) if (P[p][q] && !S2.V[q] && pc(S2.C[q]) === 2 && (S2.C[q] & ~S2.C[p]) === 0) w.push(q);
    for (let a = 0; a < w.length; a++) for (let b = a + 1; b < w.length; b++) {
      const q1 = w[a], q2 = w[b], z = S2.C[q1] & S2.C[q2];
      if (pc(z) !== 1 || (S2.C[q1] | S2.C[q2]) !== S2.C[p]) continue;
      const el = [];
      for (let j = 0; j < 81; j++) if (j !== p && j !== q1 && j !== q2 && !S2.V[j] && P[p][j] && P[q1][j] && P[q2][j] && S2.C[j] & z) el.push([j, z]);
      if (el.length) {
        const c = dg(z)[0];
        return { t: "xyzwing", elim: el, cells: [p, q1, q2], tgt: el.map((q) => q[0]), f: [c], text: `Pivot ${rc(p)} holds {${dg(S2.C[p])}}. Wing ${rc(q1)} holds {${dg(S2.C[q1])}} and wing ${rc(q2)} holds {${dg(S2.C[q2])}}. Whatever the pivot becomes, ${c} lands in the pivot or one wing, so ${c} can be removed from every cell that sees all three.` };
      }
    }
  }
  return null;
}
function fSky(S2) {
  for (let d = 1; d <= 9; d++) for (const line of [0, 1]) {
    const key = (i) => line ? Math.floor(i / 9) : i % 9, two = [];
    for (let k = 0; k < 9; k++) {
      const c = U[(line ? 9 : 0) + k].filter((i) => !S2.V[i] && S2.C[i] & bit(d));
      if (c.length === 2) two.push(c);
    }
    for (let a = 0; a < two.length; a++) for (let b = a + 1; b < two.length; b++) {
      const A = two[a], B = two[b];
      for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) {
        if (key(A[x]) !== key(B[y]) || key(A[1 - x]) === key(B[1 - y])) continue;
        const r1 = A[1 - x], r2 = B[1 - y], el = [];
        for (let j = 0; j < 81; j++) if (j !== r1 && j !== r2 && !S2.V[j] && P[r1][j] && P[r2][j] && S2.C[j] & bit(d)) el.push([j, bit(d)]);
        if (el.length) return { t: "skyscraper", sk: { A, B, r1, r2, line }, elim: el, cells: [...A, ...B], tgt: el.map((q) => q[0]), f: [d], text: `In two ${line ? "columns" : "rows"}, ${d} has just two possible cells each (${[...A, ...B].map(rc).join(", ")}). Two of them share a ${line ? "row" : "column"}, so at least one of the other two, ${rc(r1)} or ${rc(r2)}, must be ${d}. Remove ${d} from every cell that sees both.` };
      }
    }
  }
  return null;
}

// k-element combinations of an array.
function combos(arr, k, start = 0, pick = [], out = []) {
  if (pick.length === k) { out.push(pick.slice()); return out; }
  for (let i = start; i <= arr.length - (k - pick.length); i++) { pick.push(arr[i]); combos(arr, k, i + 1, pick, out); pick.pop(); }
  return out;
}
const WORD = { 3: "three", 4: "four" };

// Naked triple/quad: k cells of a unit whose candidates together are only k digits.
function nakedSubset(S, k, t) {
  for (let u = 0; u < 27; u++) {
    const e = U[u].filter((i) => !S.V[i] && pc(S.C[i]) >= 2 && pc(S.C[i]) <= k);
    if (e.length < k) continue;
    for (const cells of combos(e, k)) {
      let m = 0;
      for (const i of cells) m |= S.C[i];
      if (pc(m) !== k) continue;
      const el = [];
      for (const j of U[u]) if (!S.V[j] && !cells.includes(j) && S.C[j] & m) el.push([j, S.C[j] & m]);
      if (!el.length) continue;
      const ds = dg(m);
      return { t, elim: el, cells, tgt: el.map((q) => q[0]), f: ds, text: `${cells.map(rc).join(", ")} in ${UN(u)} hold only the digits {${ds.join(",")}} between them. Those ${WORD[k]} digits must fill those ${WORD[k]} cells, so they can be removed from the other cells in ${UN(u)} (struck through in red).` };
    }
  }
  return null;
}
// Hidden triple/quad: k digits of a unit that fit only the same k cells.
function hiddenSubset(S, k, t) {
  for (let u = 0; u < 27; u++) {
    const pos = {}, ds = [];
    for (let d = 1; d <= 9; d++) {
      const c = U[u].filter((i) => !S.V[i] && S.C[i] & bit(d));
      if (c.length >= 2 && c.length <= k) { pos[d] = c; ds.push(d); }
    }
    if (ds.length < k) continue;
    for (const combo of combos(ds, k)) {
      const cells = [...new Set(combo.flatMap((d) => pos[d]))];
      if (cells.length !== k) continue;
      let m = 0;
      for (const d of combo) m |= bit(d);
      const el = [];
      for (const j of cells) if (S.C[j] & ~m) el.push([j, S.C[j] & ~m]);
      if (!el.length) continue;
      return { t, elim: el, cells, tgt: cells, f: combo, text: `In ${UN(u)}, the digits ${combo.join(", ")} fit only in ${cells.map(rc).join(", ")}. Those ${WORD[k]} cells must hold those ${WORD[k]} digits, so every other candidate can be removed from them.` };
    }
  }
  return null;
}
const fNT = (S) => nakedSubset(S, 3, "nakedtriple");
const fHT = (S) => hiddenSubset(S, 3, "hiddentriple");
const fNQ = (S) => nakedSubset(S, 4, "nakedquad");
const fHQ = (S) => hiddenSubset(S, 4, "hiddenquad");

// W-Wing: two {A,B} cells that don't see each other, joined by a strong link on B.
function fW(S) {
  const bi = [];
  for (let i = 0; i < 81; i++) if (!S.V[i] && pc(S.C[i]) === 2) bi.push(i);
  for (let a = 0; a < bi.length; a++) for (let b = a + 1; b < bi.length; b++) {
    const p = bi[a], q = bi[b];
    if (S.C[p] !== S.C[q] || P[p][q]) continue;
    const [x, y] = dg(S.C[p]);
    for (const [link, other] of [[x, y], [y, x]]) {
      for (let u = 0; u < 27; u++) {
        const c = U[u].filter((i) => !S.V[i] && S.C[i] & bit(link));
        if (c.length !== 2 || c.includes(p) || c.includes(q)) continue;
        const ends = P[p][c[0]] && P[q][c[1]] ? c : P[p][c[1]] && P[q][c[0]] ? [c[1], c[0]] : null;
        if (!ends) continue;
        const el = [];
        for (let j = 0; j < 81; j++) if (j !== p && j !== q && !S.V[j] && P[p][j] && P[q][j] && S.C[j] & bit(other)) el.push([j, bit(other)]);
        if (!el.length) continue;
        return { t: "wwing", elim: el, cells: [p, q, ...ends], tgt: el.map((z) => z[0]), f: [link, other], text: `${rc(p)} and ${rc(q)} both hold only {${x},${y}} and don't see each other. In ${UN(u)}, ${link} can only go in ${rc(ends[0])} or ${rc(ends[1])}, which see ${rc(p)} and ${rc(q)}. If neither were ${other}, both would be ${link} and ${UN(u)} would have nowhere for its ${link}. So one of them is ${other}, and cells that see both can't be ${other}.` };
      }
    }
  }
  return null;
}

// Simple Colouring: chains of conjugate pairs for one digit, coloured alternately.
function fColour(S) {
  for (let d = 1; d <= 9; d++) {
    const b = bit(d), adj = new Map();
    for (let u = 0; u < 27; u++) {
      const c = U[u].filter((i) => !S.V[i] && S.C[i] & b);
      if (c.length !== 2) continue;
      for (const [x, y] of [[c[0], c[1]], [c[1], c[0]]]) {
        if (!adj.has(x)) adj.set(x, new Set());
        adj.get(x).add(y);
      }
    }
    const col = new Map();
    for (const start of adj.keys()) {
      if (col.has(start)) continue;
      const comp = [start];
      col.set(start, 0);
      for (let k = 0; k < comp.length; k++) for (const y of adj.get(comp[k])) if (!col.has(y)) { col.set(y, 1 - col.get(comp[k])); comp.push(y); }
      if (comp.length < 4) continue;
      const A = comp.filter((x) => col.get(x) === 0), B = comp.filter((x) => col.get(x) === 1);
      // Colour wrap: two cells of one colour see each other, so that colour is false.
      for (const [same, other] of [[A, B], [B, A]]) {
        let clash = null;
        for (let i = 0; i < same.length && !clash; i++) for (let j = i + 1; j < same.length; j++) if (P[same[i]][same[j]]) { clash = [same[i], same[j]]; break; }
        if (clash) return { t: "colouring", elim: same.map((x) => [x, b]), cells: comp, tgt: same, f: [d], text: `Join the places where ${d} has only two options in a unit and colour them in turns. ${rc(clash[0])} and ${rc(clash[1])} share a colour and see each other, so that colour can't be ${d}. Remove ${d} from ${same.map(rc).join(", ")}; the other colour (${other.map(rc).join(", ")}) holds the ${d}s.` };
      }
      // Colour trap: a cell that sees both colours can't be the digit.
      const el = [];
      for (let j = 0; j < 81; j++) {
        if (S.V[j] || !(S.C[j] & b) || col.has(j)) continue;
        if (A.some((x) => P[x][j]) && B.some((x) => P[x][j])) el.push([j, b]);
      }
      if (el.length) return { t: "colouring", elim: el, cells: comp, tgt: el.map((q) => q[0]), f: [d], text: `Join the places where ${d} has only two options in a unit and colour them in turns: ${A.map(rc).join(", ")} one colour, ${B.map(rc).join(", ")} the other. One colour holds the ${d}s. ${el.map((q) => rc(q[0])).join(", ")} see${el.length === 1 ? "s" : ""} a cell of each colour, so ${el.length === 1 ? "it" : "they"} can't be ${d}.` };
    }
  }
  return null;
}

// Jellyfish: a digit's candidates in four lines all sit inside four crossing lines.
function fJelly(S) {
  for (let d = 1; d <= 9; d++) for (const line of [0, 1]) {
    const key = (i) => (line ? Math.floor(i / 9) : i % 9), ls = [];
    for (let k = 0; k < 9; k++) {
      const c = U[(line ? 9 : 0) + k].filter((i) => !S.V[i] && S.C[i] & bit(d));
      if (c.length >= 2 && c.length <= 4) ls.push(c);
    }
    if (ls.length < 4) continue;
    for (const four of combos(ls, 4)) {
      const cs = four.flat(), ks = [...new Set(cs.map(key))];
      if (ks.length !== 4) continue;
      const el = [];
      for (const q of ks) for (const j of U[(line ? 0 : 9) + q]) if (!cs.includes(j) && !S.V[j] && S.C[j] & bit(d)) el.push([j, bit(d)]);
      if (!el.length) continue;
      const w = line ? "columns" : "rows", x = line ? "rows" : "columns";
      return { t: "jellyfish", elim: el, cells: cs, tgt: el.map((q) => q[0]), f: [d], text: `In four ${w}, the digit ${d} has only two to four possible cells each (${cs.map(rc).join(", ")}), all inside the same four ${x}. So ${d} is used up inside those four ${x}, and can be removed from every other cell in them.` };
    }
  }
  return null;
}

// Unique Rectangle type 1. Assumes the puzzle has one solution (all puzzles here do).
function fUR(S) {
  const boxOf = (i) => Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3);
  for (let r1 = 0; r1 < 9; r1++) for (let r2 = r1 + 1; r2 < 9; r2++) for (let c1 = 0; c1 < 9; c1++) for (let c2 = c1 + 1; c2 < 9; c2++) {
    const cells = [r1 * 9 + c1, r1 * 9 + c2, r2 * 9 + c1, r2 * 9 + c2];
    if (cells.some((i) => S.V[i])) continue;
    if (new Set(cells.map(boxOf)).size !== 2) continue;
    for (let f = 0; f < 4; f++) {
      const others = cells.filter((_, k) => k !== f), m = S.C[others[0]];
      if (pc(m) !== 2 || others.some((i) => S.C[i] !== m)) continue;
      const four = cells[f];
      if ((S.C[four] & m) !== m || S.C[four] === m) continue;
      const [a, b] = dg(m);
      return { t: "uniquerect", elim: [[four, m]], cells, tgt: [four], f: [a, b], text: `${others.map(rc).join(", ")} hold only {${a},${b}}, and ${rc(four)} holds ${a} and ${b} plus more. The four cells sit in two rows, two columns and two boxes. If ${rc(four)} were ${a} or ${b}, the ${a}s and ${b}s could swap and the puzzle would have two solutions. It has one, so remove ${a} and ${b} from ${rc(four)}.` };
    }
  }
  return null;
}

// BUG+1: every empty cell has two candidates except one with three. Assumes one solution.
function fBUG(S) {
  let three = -1;
  for (let i = 0; i < 81; i++) {
    if (S.V[i]) continue;
    const n = pc(S.C[i]);
    if (n === 2) continue;
    if (n === 3 && three < 0) { three = i; continue; }
    return null;
  }
  if (three < 0) return null;
  for (const x of dg(S.C[three])) {
    let ok = true;
    for (let u = 0; u < 27 && ok; u++) for (let d = 1; d <= 9 && ok; d++) {
      const n = U[u].filter((i) => !S.V[i] && S.C[i] & bit(d)).length;
      const extra = d === x && U[u].includes(three);
      if (!(n === 0 || n === 2 || (extra && n === 3))) ok = false;
    }
    if (ok) return { t: "bug", place: [three, x], cells: [three], tgt: [three], f: [x], text: `Every empty cell has exactly two candidates except ${rc(three)}, which has three. Each digit appears twice in every row, column and box, except ${x}, which appears three times around ${rc(three)}. Without that extra ${x} the grid would have two solutions, so ${rc(three)} must be ${x}.` };
  }
  return null;
}

// ---------- technique registry ----------
// Solving order: easiest first. Matches the original site's order.
export const ORDER = ["fullhouse", "lastdigit", "scanning", "naked1", "hidden1", "nakedpair", "hiddenpair", "pointing", "claiming", "nakedtriple", "hiddentriple", "xwing", "swordfish", "nakedquad", "hiddenquad", "xywing", "xyzwing", "skyscraper", "wwing", "colouring", "jellyfish", "uniquerect", "bug"];
export const FINDERS = {
  fullhouse: fFull, lastdigit: fLast, scanning: fScan, naked1: fNaked, hidden1: fHidden,
  nakedpair: fNP, hiddenpair: fHP, pointing: fPoint, claiming: fClaim, xwing: fX,
  swordfish: fSw, xywing: fXY, xyzwing: fXYZ, skyscraper: fSky,
  nakedtriple: fNT, hiddentriple: fHT, nakedquad: fNQ, hiddenquad: fHQ, wwing: fW, colouring: fColour,
  jellyfish: fJelly, uniquerect: fUR, bug: fBUG,
};
// Uniqueness techniques assume a single solution, so they're never used to decide whether a
// clue can be removed: that check must prove uniqueness by logic alone.
export const UNIQUENESS = new Set(["uniquerect", "bug"]);
export const level = (k) => SKILL[k].level;
export const keysUpTo = (maxL) => ORDER.filter((k) => level(k) <= maxL);
export const keysBelow = (L) => ORDER.filter((k) => level(k) < L);

const toList = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

// Next logical step using only `allowed` techniques. `prefer` techniques are tried first;
// among them, ones not yet in `used` come first so every preferred technique gets a turn.
export function nextStep(S, allowed, prefer, used) {
  const allow = new Set(allowed);
  const pf = toList(prefer).filter((k) => allow.has(k));
  if (pf.length) {
    const fresh = used ? pf.filter((k) => !used[k]) : pf;
    const rest = used ? pf.filter((k) => used[k]) : [];
    for (const k of [...fresh, ...rest]) {
      const s = FINDERS[k](S);
      if (s) return s;
    }
  }
  for (const k of ORDER) if (allow.has(k)) {
    const s = FINDERS[k](S);
    if (s) return s;
  }
  return null;
}

// Solve as far as `allowed` techniques reach. Returns { ok, hard, used, steps? }.
export function solve(V, allowed, prefer, keepSteps) {
  const S = mk(V.slice()), used = {}, steps = [];
  let hard = 0;
  for (;;) {
    if (S.V.every((x) => x)) return { ok: true, hard, used, steps, V: S.V };
    const s = nextStep(S, allowed, prefer, used);
    if (!s) return { ok: false, hard, used, steps, V: S.V };
    used[s.t] = (used[s.t] || 0) + 1;
    hard = Math.max(hard, level(s.t));
    if (keepSteps) steps.push(s);
    apply(S, s);
  }
}

// Which techniques could be used at some point while solving (for the "in this puzzle" labels).
export function profile(V0) {
  const T = mk(V0.slice()), could = {};
  for (let g = 0; g < 200 && !T.V.every((x) => x); g++) {
    let s = null;
    for (const k of ORDER) {
      const r = FINDERS[k](T);
      if (r) {
        could[k] = 1;
        if (!s) s = r;
      }
    }
    if (!s) break;
    apply(T, s);
  }
  return { could };
}

// Random complete grid.
export function fullGrid() {
  const g = new Array(81).fill(0), R = Array(9).fill(0), Cc = Array(9).fill(0), B = Array(9).fill(0);
  function go(i) {
    if (i === 81) return true;
    const r = Math.floor(i / 9), c = i % 9, b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      const m = bit(d);
      if (R[r] & m || Cc[c] & m || B[b] & m) continue;
      g[i] = d; R[r] |= m; Cc[c] |= m; B[b] |= m;
      if (go(i + 1)) return true;
      g[i] = 0; R[r] &= ~m; Cc[c] &= ~m; B[b] &= ~m;
    }
    return false;
  }
  go(0);
  return g;
}

// Remove clues in random order while the puzzle stays solvable with `allowed`.
// Logic-solvable means uniquely solvable, so every puzzle made here has one answer.
function carve(sol, allowed, prefer) {
  allowed = allowed.filter((k) => !UNIQUENESS.has(k));
  const V = sol.slice();
  for (const i of shuffle([...Array(81).keys()])) {
    const d = V[i];
    V[i] = 0;
    if (!solve(V, allowed, prefer).ok) V[i] = d;
  }
  return V;
}

// Search for the best puzzle within `ms` milliseconds. `score(V, sol)` returns { ok, sc, ...extra }.
function search(ms, allowed, prefer, score) {
  const t0 = Date.now();
  let best = null;
  do {
    const sol = fullGrid();
    const V = carve(sol, allowed, prefer);
    const r = score(V, sol);
    if (!best || r.sc > best.sc) best = { V, sol, ...r };
    if (r.ok) break;
  } while (Date.now() - t0 < ms);
  return best;
}

// Play: a puzzle whose hardest required technique is between minL and maxL.
export function generateLevel(minL, maxL, ms = 2500) {
  const allowed = keysUpTo(maxL);
  return search(ms, allowed, null, (V) => {
    const r = solve(V, allowed);
    return { ok: r.hard >= minL, sc: r.hard, hard: r.hard, used: r.used };
  });
}

// One target technique (used by worked examples). Same behaviour as the original generator.
export function generateWith(need, ms = 2500) {
  const allowed = keysUpTo(level(need));
  return search(ms, allowed, need, (V) => {
    const r = solve(V, allowed, need);
    const n = r.used[need] || 0;
    return { ok: n > 0, sc: n * 100 + r.hard, hard: r.hard, used: r.used };
  });
}

// Practice Skills: a puzzle that uses every selected skill and nothing harder than singles otherwise.
// If a selected skill is above the singles, the puzzle can't be finished with singles alone.
export function generatePractice(keys, ms = 4000) {
  keys = ORDER.filter((k) => keys.includes(k));
  const basics = keysUpTo(2);
  const allowed = ORDER.filter((k) => basics.includes(k) || keys.includes(k));
  const advanced = keys.filter((k) => level(k) > 2);
  return search(ms, allowed, keys, (V) => {
    const r = solve(V, allowed, keys);
    const covered = keys.filter((k) => r.used[k]);
    const needs = advanced.length ? !solve(V, basics).ok : true;
    return {
      ok: r.ok && covered.length === keys.length && needs,
      sc: covered.length * 100 + (needs ? 50 : 0) + r.hard,
      covered, hard: r.hard, used: r.used,
    };
  });
}

// Learn exercise: a nearly finished puzzle where the target skill is the obstacle.
// It can be finished with the skill plus easier techniques, but not with the easier ones alone.
// Clues are added back until nothing more can be filled without losing that property.
export function buildExercise(key, ms = 4000) {
  const easier = keysBelow(level(key)).filter((k) => k !== key);
  const allowed = [...easier, key];
  const good = (V) => {
    const r = solve(V, allowed, key);
    return r.ok && (r.used[key] || 0) > 0 && !solve(V, easier).ok;
  };
  // Carve a puzzle that uses the skill, then play the easier techniques until they get stuck.
  // The stuck position is the exercise when the skill is what gets it moving again.
  const carveWith = keysUpTo(level(key));
  const t0 = Date.now();
  let start = null, n = 0;
  do {
    const sol = fullGrid();
    // Alternate: carve with only easier + skill, or carve wider and stop where easier ones stall.
    const V0 = carve(sol, n++ % 2 ? carveWith : allowed, key);
    const stuck = Array.from(solve(V0, easier).V);
    if (good(stuck)) { start = { V: stuck, sol, ok: true }; break; }
    if (!start) start = { V: V0, sol, ok: false };
  } while (Date.now() - t0 < ms);
  const V = start.V.slice(), sol = start.sol;
  if (start.ok) {
    for (const i of shuffle([...Array(81).keys()].filter((i) => !V[i]))) {
      V[i] = sol[i];
      if (!good(V)) V[i] = 0;
    }
  }
  return { V, sol, ok: start.ok, empty: V.filter((x) => !x).length };
}

// ---------- hints and lessons ----------
// Cells that are a naked or hidden single in state T: Map cell -> digit.
export function singles(T) {
  const o = new Map();
  for (let i = 0; i < 81; i++) if (!T.V[i] && pc(T.C[i]) === 1) o.set(i, dg(T.C[i])[0]);
  for (let u = 0; u < 27; u++) for (let d = 1; d <= 9; d++) {
    const c = U[u].filter((i) => !T.V[i] && T.C[i] & bit(d));
    if (c.length === 1) o.set(c[0], d);
  }
  return o;
}

// The next placement and the hardest technique that led to it.
export function hintChain(S0, allowed, prefer) {
  const T = { V: S0.V.slice(), C: S0.C.slice() }, steps = [];
  const pf = toList(prefer);
  for (let g = 0; g < 200; g++) {
    const s = nextStep(T, allowed, pf);
    if (!s) return null;
    steps.push(s);
    apply(T, s);
    if (s.place) {
      const non = steps.filter((x) => !x.place);
      const key = (pf.length && steps.find((x) => pf.includes(x.t))) ||
        (non.length ? non.reduce((x, y) => (level(y.t) >= level(x.t) ? y : x)) : s);
      return { key, target: s.place[0], digit: s.place[1], lv: level(key.t) };
    }
  }
  return null;
}

// A hint that teaches: the hardest technique that, on its own, unlocks a new single.
export function chainHard(S0, allowed) {
  const pre = singles(S0), allow = new Set(allowed);
  for (const k of [...ORDER].reverse()) {
    if (!allow.has(k) || level(k) < 3) continue;
    const s = FINDERS[k](S0);
    if (!s || !s.elim) continue;
    const T = { V: S0.V.slice(), C: S0.C.slice() };
    apply(T, s);
    for (const [i, d] of singles(T)) if (!pre.has(i)) return { key: s, target: i, digit: d, lv: level(k) };
  }
  return null;
}

// Which skills did a player show by correctly filling cell i from state S0?
// Finds the lowest level of techniques that reaches the cell, then credits the technique that
// placed it plus any technique of that level the placement can't do without.
function reaches(S0, i, allowed) {
  const T = { V: S0.V.slice(), C: S0.C.slice() }, steps = [];
  for (let g = 0; g < 160; g++) {
    const s = nextStep(T, allowed);
    if (!s) return null;
    steps.push(s);
    apply(T, s);
    if (s.place && s.place[0] === i) return steps;
    if (T.V[i]) return steps;
  }
  return null;
}
export function exhibited(S0, i) {
  for (let L = 1; L <= 6; L++) {
    const allowed = keysUpTo(L), steps = reaches(S0, i, allowed);
    if (!steps) continue;
    const last = steps[steps.length - 1], out = [last.t];
    if (L >= 3) {
      const cands = [...new Set(steps.filter((x) => !x.place && level(x.t) === L).map((x) => x.t))];
      const needed = cands.filter((k) => !reaches(S0, i, allowed.filter((a) => a !== k)));
      out.push(...(needed.length ? needed : cands.slice(0, 1)));
    }
    return [...new Set(out)];
  }
  return [];
}

// Worked example for one skill: generate a puzzle, play forward to the point where the skill is
// the next thing to use, then fill in unrelated cells so the board is quieter.
export function buildExample(key, ms = 2500) {
  const p = generateWith(key, ms);
  const forced = p.ok;
  const L = forced ? level(key) : Math.max(1, p.hard);
  const allowed = keysUpTo(L), pref = forced ? key : null;
  let S = mk(p.V.slice());
  const giv = p.V.map((x) => !!x);
  let c = null;
  for (let n = 0; n < 90; n++) {
    const h = hintChain(S, allowed, pref);
    if (!h) break;
    if (pref ? h.key.t === pref : h.lv >= L) { c = h; break; }
    place(S, h.target, h.digit);
    giv[h.target] = true;
  }
  if (c) {
    const sig = (x) => x.key.t + x.key.cells.join(","), want = sig(c);
    for (const i of shuffle([...Array(81).keys()].filter((i) => !S.V[i]))) {
      if (S.V[i] || i === c.target) continue;
      if (S.V.filter((x) => !x).length <= 6) break;
      const T = { V: S.V.slice(), C: S.C.slice() };
      place(T, i, p.sol[i]);
      const c2 = hintChain(T, allowed, pref);
      if (c2 && sig(c2) === want) { S = T; giv[i] = true; c = c2; }
    }
  }
  return { V: Array.from(S.V), C: Array.from(S.C), giv, sol: p.sol, chain: c, forced, level: L };
}

// ---------- puzzle variety ----------
// Relabel digits and shuffle rows/columns within bands/stacks, bands, stacks, plus optional transpose.
// Every technique is unchanged by these moves, so a stored puzzle keeps its lesson but looks new.
export function transform(V, sol) {
  const digits = [0, ...shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])];
  const order = () => shuffle([0, 1, 2]).flatMap((b) => shuffle([0, 1, 2]).map((r) => b * 3 + r));
  const rows = order(), cols = order(), flip = Math.random() < 0.5;
  const map = (G) => {
    const out = new Array(81);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      let sr = rows[r], sc = cols[c];
      if (flip) [sr, sc] = [sc, sr];
      out[r * 9 + c] = digits[G[sr * 9 + sc]];
    }
    return out;
  };
  return { V: map(V), sol: map(sol) };
}

export const encode = (G) => G.map((d) => d || ".").join("");
export const decode = (s) => [...s].map((ch) => (ch === "." ? 0 : +ch));
