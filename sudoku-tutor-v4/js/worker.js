// Runs puzzle generation off the main thread so the page never freezes.
import * as E from "./engine.js";

const JOBS = {
  level: ([minL, maxL, ms]) => E.generateLevel(minL, maxL, ms),
  practice: ([keys, ms]) => E.generatePractice(keys, ms),
  exercise: ([key, ms]) => E.buildExercise(key, ms),
  example: ([key, ms]) => E.buildExample(key, ms),
};

self.onmessage = (e) => {
  const { id, job, args } = e.data;
  try {
    self.postMessage({ id, result: JOBS[job](args) });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.stack || err) });
  }
};
