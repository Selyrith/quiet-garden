/**
 * Stress-indicator telemetry for the Quiet Garden calm test.
 *
 * Tracks two indicators the design document uses to judge calm:
 *   1. Input frequency  — interactions per minute (pointerdown/keydown).
 *   2. Session length   — total active time in the garden per session.
 *
 * Both are sampled over sliding windows so we can compare a baseline
 * (normal play) window against a Watch-mode window and assert a ≥30%
 * reduction when the meditative features are active.
 */
export class StressMetrics {
  constructor() {
    // Counters
    this.inputCount = 0;
    this.sessionStart = Date.now();
    this.lastWindowStart = Date.now();
    this.lastWindowInputs = 0;

    // Running totals
    this.totalSessionMinutes = 0;

    // Watch-mode accounting
    this.watchModeSessions = 0;
    this.watchModeTotalMinutes = 0;
  }

  // Call once on scene start to begin tracking.
  start() {
    this.sessionStart = Date.now();
    this.lastWindowStart = Date.now();
    this.lastWindowInputs = 0;
    this.inputCount = 0;
  }

  // Call once per frame / on visibility change to keep session length accurate.
  tick() {
    const now = Date.now();
    const elapsedMs = now - this.sessionStart;
    this.totalSessionMinutes = elapsedMs / 60000;
  }

  recordInput() {
    this.inputCount += 1;
    this.lastWindowInputs += 1;
  }

  // Inputs per minute over the trailing 60-second window.
  inputsPerMinute(windowMs = 60000) {
    const now = Date.now();
    if (now - this.lastWindowStart >= windowMs) {
      this.lastWindowStart = now;
      this.lastWindowInputs = 0;
    }
    const elapsedMin = Math.max(now - this.lastWindowStart, 1) / 60000;
    return (this.lastWindowInputs / elapsedMin);
  }

  // Overall session inputs per minute.
  sessionInputsPerMinute() {
    const min = Math.max(this.totalSessionMinutes, 1 / 60);
    return this.inputCount / min;
  }

  // Session length in minutes.
  sessionLengthMinutes() {
    return Date.now() - this.sessionStart > 0
      ? (Date.now() - this.sessionStart) / 60000
      : 0;
  }

  enterWatchMode() {
    this.watchModeSessions += 1;
    this._watchStart = Date.now();
  }

  exitWatchMode() {
    if (!this._watchStart) return;
    this.watchModeTotalMinutes += (Date.now() - this._watchStart) / 60000;
    this._watchStart = null;
  }

  watchModeAverageLengthMinutes() {
    return this.watchModeSessions
      ? this.watchModeTotalMinutes / this.watchModeSessions
      : 0;
  }

  reset() {
    this.inputCount = 0;
    this.sessionStart = Date.now();
    this.lastWindowStart = Date.now();
    this.lastWindowInputs = 0;
  }
}
