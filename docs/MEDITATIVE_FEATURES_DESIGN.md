# Quiet Garden — Meditative Features Design

**Philosophy:** enter, look, collect what matured, sit, leave, return after three days to find the garden unchanged and self-grown.

**Target audience:** players seeking low-stress, calming gameplay with no disruptive notifications or time pressure.

**Scope:** three core features — Watch mode, Ambient sound layers, Passive garden care.

---

## Feature 1 — Watch mode

### Intent
A pressure-free way to simply be in the garden: no HUD, no tools, no goals, nothing to "do." This is the "sit" step of the philosophy.

### UI flow
1. **Entry:** player taps a watch affordance (or anywhere) → `GameScene.enterWatchMode()`.
2. **HUD fade-out:** all HUD panels — inventory bar, coins, room code, hints, tool buttons, top bar, team bar, emotes bar, overlays — tween alpha 1 → 0 over **800 ms** (`UIContainer` alpha tweening). Input on faded panels is disabled.
3. **Music:** `SoundManager.duckMusic(0.5)` — music gain ducks to half volume over a short fade (~400 ms).
4. **Ambience:** ambient sound layers begin (wind + day-phase-appropriate bird/cricket/weather) at volume 0.1–0.2.
5. **Camera breathing:** the main camera performs a slow **30-second zoom cycle** looping for the duration of Watch mode — Phaser camera tween, duration 30000 ms, `Sine.easeInOut`, yoyo, repeat -1.
6. **Exit cue:** a single bottom line reads "press anywhere to return" and stays visible throughout Watch mode.
7. **Exit:** any pointerdown anywhere → `GameScene.exitWatchMode()` — HUD panels tween alpha 0 → 1 over 800 ms, music unducks to full volume, ambient layers fade out, camera breathing stops and camera resets to zoom 1, exit cue removed, input re-enabled.

### Calm test
- Removes all numeric pressure (coins, collection count, timers, job indicators).
- Removes all interaction affordances (tools, buttons) so there is nothing to do.
- Ducked music + breathing camera + ambient sound lower arousal; no countdowns, popups, or notifications.
- Exiting is immediate and unconditional ("press anywhere"), so the player never feels trapped.

### Implementation notes / engine APIs
- `GameScene.js`: add `enterWatchMode()` and `exitWatchMode()` methods; track `this.watchMode` boolean and guard `handleTileTap`, tool selection, and overlay opening while true.
- Build `this.hudContainers[]` (topBar, teamBar, inventoryBar, toolButtons, emoteBtn, hintText, toastText, roomHit) and tween `alpha` 1↔0 over 800 ms (`Sine.easeInOut`).
- Camera breathing: `this.cameras.main` zoom tween duration 30000 ms, yoyo, repeat -1; on exit `this.tweens.killTweensOf(this.cameras.main)` and reset zoom to 1.
- `SoundManager.duckMusic(vol)`: new method tweens `MusicManager.gainNode.gain` to `vol * 0.15` (music baseline 0.15) → at 0.5 that is ~0.075; unduck restores to 0.15.
- Ambience start: `AmbienceManager` (new module) starts looping buffer sources for wind + phase-appropriate layer at gain 0.1–0.2.
- Exit cue: `this.add.text(..., 'press anywhere to return')` plus a full-screen transparent hit rectangle whose pointerdown calls `exitWatchMode()`.
- Watch mode does not pause the world; the garden keeps growing. Visibilitychange while in Watch mode does not auto-exit (preserves "sit and leave").

### Acceptance criteria
- [ ] HUD panels (inventory, coins, room code, hints, tool buttons) smoothly hide (alpha 1→0 over 800 ms) and re-show (0→1 over 800 ms) with no popping.
- [ ] Music volume reaches 0.5 (half) during Watch mode and returns to 1.0 on exit.
- [ ] Camera breathing cycle is exactly 30 seconds, smooth, looping, and resets on exit.
- [ ] Single bottom exit cue "press anywhere to return" is visible throughout Watch mode.
- [ ] Any pointerdown exits Watch mode immediately and restores full HUD + input.

---

## Feature 2 — Ambient sound layers

### Intent
A living, non-repetitive soundscape that follows the day/night cycle and never fights the procedural music. Ambience is atmosphere, not a gameplay cue.

### Architecture — AmbienceManager.js
- Single `AudioContext` (shared with SoundManager/MusicManager, resumed on first interaction).
- Four independent looping `AudioContext.createBufferSource()` sources: `wind`, `bird`, `cricket`, `weather` (rain).
- Each source feeds its own `GainNode` for independent volume control; all feed a common ambience bus gain → `ctx.destination`.
- Looping: `bufferSource.loop = true`; sources started once at ambient init and kept alive, with gain ramping for on/off and phase transitions (no restart clicks).
- Gain control driven by `world.phase.id` (morning/day/evening/night) and `world.weather.id`.

### Layer table (gain 0.1–0.2, no distortion)
| Phase | Wind | Bird | Cricket | Weather | Notes |
|---|---|---|---|---|---|
| Morning (06:00–09:00) | 0.12 | 0.18 (dawn chorus) | 0.02 | rain if raining | Birds peak |
| Day | 0.10 | 0.14 | 0.05 | rain if raining | Light |
| Evening | 0.14 | 0.06 | 0.16 | rain if raining | Crickets rise |
| Night (22:00–06:00) | 0.16 | 0.01 | 0.20 | rain if raining | Crickets dominant |
| Rain (any phase) | +0.06 | — | — | 0.20 | Weather layer at 0.2 |

- Birds: morning + day; crickets: evening + night; crossfade bird↔cricket at day→evening and evening→night over ~2 s (no hard cuts).
- Weather (rain) layer independent of phase: active only when `world.weather.id === 'rain'`, at gain 0.2.
- All layer gains clamped to 0.1–0.2 (peak); summed ambience bus master gain ≤ 0.25 to avoid clipping/distortion.

### Non-interference with procedural music
Ambience lives on a separate gain bus from `MusicManager.gainNode`; music is ducked independently via `SoundManager.duckMusic`. Ambience never modulates music and music never side-chains ambience — both are additive on `ctx.destination`.

### Timing / day-phase integration
- `AmbienceManager.update(world)` runs when `world.phase.id` changes; recomputes target gains per the table and ramps each layer gain linearly over ~1.5 s to target.
- On phase change: outgoing layer fades down, incoming layer fades up (birds↔crickets). Wind and rain persist across phases.
- On Watch mode entry: ambience fades up to full per-phase level; on exit: fades down over ~800 ms matching the HUD fade.

### Calm test
- No abrupt sounds, jingles, or "event" audio — layers fade gradually.
- Volume stays low (0.1–0.2) so ambience never masks thought or demands attention.
- No spatial cues implying "you should go do something" — ambience is undirected.
- Nature sounds (wind, birds, crickets, rain) are universally associated with calm.

### Implementation notes / engine APIs
- New module `src/audio/AmbienceManager.js`:
  - `constructor(ctx)` — stores shared AudioContext.
  - `init()` — create 4 buffer sources (load seamless wind/bird/cricket/rain loops, ~6–12 s each), set `loop=true`, connect each to its `GainNode`, connect all to ambience bus → `ctx.destination`; start sources.
  - `update(world)` — read `world.phase.id` and `world.weather.id`, compute target gains, ramp gains over ~1.5 s.
  - `setMaster(v)`, `fadeMaster(v, duration)`, `dispose()`.
- Buffers: seamless loops; if no audio assets exist, synthesize noise + filtered oscillators (keep dependency-free).
- Hook into `GameScene.applyWorld(world)` to call `ambience.update(world)`; hook into `enterWatchMode`/`exitWatchMode` for ambience master fade.

### Acceptance criteria
- [ ] Four layers (wind, bird, cricket, weather) exist as independent looping `createBufferSource` sources with per-layer gain.
- [ ] Layers trigger in correct day phases per the table (birds morning/day, crickets evening/night, weather when raining).
- [ ] All layer volumes within 0.1–0.2; no clipping/distortion at any combination.
- [ ] Phase transitions crossfade smoothly (no clicks/hard cuts) over ~1.5 s.
- [ ] Ambience does not alter procedural music; music ducking works independently.
- [ ] Ambience fades up on Watch entry and down on Watch exit (~800 ms).

---

## Feature 3 — Passive garden care

### Intent
The garden sustains itself without player intervention; nothing is lost after absence; everything grows autonomously. This is the "leave / return after three days unchanged and self-grown" step.

### Mechanics
1. **Morning dew growth boost:** during the morning phase (06:00–09:00), every growing plant receives a small growth-rate bonus (e.g., +10% effective growth for the morning window). Rewards morning entry but does not penalize other entry times.
2. **Automatic rain watering:** when weather changes to rain (`tickWorld` detects `world.weather.id === 'rain'`), all growing (stage 0–2) tiles are auto-watered for 60 s (existing `waterTile` behavior). No player action needed.
3. **Night slowdown without plant death:** night (22:00–06:00) applies a slowdown multiplier (existing `night.growthMult` ×0.65) but plants never regress and never wither from neglect — `stage` only increases, `progress` never decreases, no tile is ever cleared due to time.
4. **Offline recovery bonus:** on return after absence (>5 min offline, matching the existing `sinceLastSeen` threshold), compute elapsed time and apply time-driven growth modifiers via `computeState`; plants that matured while away show as ready-to-harvest. Visual feedback appears within 200 ms: a soft glow / ready badge / gentle pulse on matured tiles, plus a single unobtrusive toast ("The garden grew while you were away") — no sound jingle, no badge count, no pressure.

### Server: server/garden.js computeState
- `computeState(tile, now, globalGrowthBonus)` already applies time-driven growth. Extend to accept a `phaseGrowthMult` and apply it as a time-driven modifier (`effective *= phaseGrowthMult`) for the morning dew boost and night slowdown (already reflected in `phase.growthMult`).
- Growth modifiers stored client-side in `gardenCache` (a Map keyed by tile key holding last computed stage/progress and last-update timestamp) so the client can interpolate smoothly between server ticks (2 s) without jitter.
- Invariant: `computeState` never returns a lower stage than previously recorded; progress is clamped non-decreasing per tile. No tile deletion from neglect.
- Server `tickWorld` (every 2 s) continues auto-watering on rain and broadcasting `stage-updates`/`progress-updates`; rooms persist across absences (7-day retention, existing `rooms.json`).

### Client: gardenCache
- New module `src/gardenCache.js` — `set(key, state)`, `get(key)`, `interpolate(key, now)`, `markMature(key)`; updated on socket events `initial-state`, `progress-updates`, `stage-updates`.
- Render uses `gardenCache` interpolated to `now` via a client-side `computeState`-equivalent for visual smoothness; server remains authoritative for stage transitions.
- Visual feedback: when a tile reaches stage 3 (mature), add a `readyBadge` with a gentle pulse tween; show once, then dismiss on harvest or after a short dwell. Appearance ≤ 200 ms from state receipt.

### Calm test
- Nothing is ever lost: no withering, no decay, no penalties for absence — directly addresses abandonment anxiety.
- Growth happens while offline; the player returns to abundance, not chores.
- Visual feedback is gentle (glow/pulse) and informational (one toast), not an alarm.
- No timers counting down, no "your plant will die" messaging, no notifications.

### Implementation notes / engine APIs
- `server/garden.js`: `computeState(tile, now, globalGrowthBonus, phaseGrowthMult)` — apply `phaseGrowthMult` as time-driven modifier; enforce monotonic stage/progress.
- `server/rooms.js`: `tickWorld` passes `world.phase.growthMult` (via `serializeWorld.growthMult`) into `computeState`; rain auto-waters (existing); broadcast updates.
- `gardenCache` mirrors server `computeState` results; visual feedback ≤ 200 ms on mature via `tile.readyBadge` pulse tween + muted toast.

### Acceptance criteria
- [ ] Plants never wither or regress from neglect; stage/progress monotonic non-decreasing per tile.
- [ ] Morning dew applies a growth boost during 06:00–09:00 phase.
- [ ] Rain automatically waters all growing tiles (no player action).
- [ ] Night applies slowdown (×0.65) but no death/withering.
- [ ] Offline return: growth bonuses applied by rule; matured plants show visual feedback within 200 ms.
- [ ] `computeState` applies time-driven growth modifiers; client `gardenCache` mirrors server state.
- [ ] Garden unchanged after 3-day absence; everything grown autonomously.

---

## Cross-cutting calm test

All three features must reduce player stress indicators — input frequency and session length — by **at least 30 % compared to baseline**. These thresholds form the acceptance criteria for stress reduction.

- Watch mode: removes interactive affordances → input frequency drops sharply during the session.
- Ambience: lowers arousal without demands → longer, calmer sessions.
- Passive care: removes upkeep pressure → players return voluntarily after absence rather than feeling obligated.

Measurement: compare input events per minute and average session length in Watch-mode/passive-care sessions vs normal-play baseline; target ≥ 30 % reduction in input frequency during Watch mode, and no session-length penalty (calm sessions equal or longer).

---

## Implementation checklist (engine APIs)
- `GameScene.js` — `enterWatchMode()`, `exitWatchMode()`; `this.hudContainers[]` alpha tween 800 ms; camera breathing tween 30 s; exit-cue text + full-screen hit rect.
- `UIContainer` alpha tweening over 800 ms for all HUD panels (inventory, coins, room code, hints, tool buttons).
- `SoundManager.duckMusic(0.5)` — music to half volume; unduck on exit.
- `AmbienceManager.js` — `AudioContext.createBufferSource` looping sources (wind, bird, cricket, weather), per-layer `GainNode`, gain by `world.phase.id`, volume 0.1–0.2.
- `server/garden.js` — `computeState` time-driven growth modifiers (phase growthMult), monotonic stage, no wither.
- Client `gardenCache` — mirrors `computeState` results; visual feedback ≤ 200 ms on mature.
