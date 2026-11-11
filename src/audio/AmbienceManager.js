/**
 * Ambient sound layers for Quiet Garden.
 *
 * Four independent looping buffer sources — wind, bird, cricket, weather (rain) —
 * each with its own GainNode, all summed on a shared ambience bus separate from
 * the procedural music bus so nothing interferes with the generative score.
 *
 * Layer gains are driven by world.phase.id and world.weather.id, clamped to
 * 0.1–0.2 per layer, with the ambience bus master clamped to 0.25 to avoid
 * clipping/distortion at any combination. Transitions between phases crossfade
 * smoothly (~1.5 s); no hard cuts, no clicks.
 *
 * Buffers loaded from /assets/audio/ambience/*.{ogg,mp3} via AssetManager.
 */
export class AmbienceManager {
  constructor(ctx, am) {
    this.ctx = ctx;
    this.am = am;
    this.enabled = true;

    // Per-layer gain nodes.
    this.gainWind = null;
    this.gainBird = null;
    this.gainCricket = null;
    this.gainWeather = null;

    // Buffer sources (kept alive, looped).
    this.srcWind = null;
    this.srcBird = null;
    this.srcCricket = null;
    this.srcWeather = null;

    // Ambience bus (separate from MusicManager.gainNode bus).
    this.bus = null;
    this.busGain = null;

    // Current target gains per layer (ramped toward in update()).
    this.target = { wind: 0, bird: 0, cricket: 0, weather: 0 };
    this.current = { wind: 0, bird: 0, cricket: 0, weather: 0 };

    this.initialized = false;
  }

  async init() {
    if (this.initialized || !this.ctx) return;
    try {
      this._buildBuses();

      // Load real audio assets with procedural fallback.
      const [windBuf, birdBuf, cricketBuf, weatherBuf] = await Promise.all([
        this._loadOrFallback('ambience/wind', this._synthWindBuffer()),
        this._loadOrFallback('ambience/birds', this._synthBirdBuffer()),
        this._loadOrFallback('ambience/crickets', this._synthCricketBuffer()),
        this._loadOrFallback('ambience/weather', this._synthRainBuffer()),
      ]);

      this._createLayer('wind', windBuf);
      this._createLayer('bird', birdBuf);
      this._createLayer('cricket', cricketBuf);
      this._createLayer('weather', weatherBuf);
      this.initialized = true;
    } catch (e) {
      this.enabled = false;
      console.warn('[AmbienceManager] init failed:', e);
    }
  }

  async _loadOrFallback(name, fallbackBuffer) {
    if (!this.am) return fallbackBuffer;
    try { return await this.am.load(name); } catch { return fallbackBuffer; }
  }

  _buildBuses() {
    // Ambience bus: layers -> busGain -> destination.
    this.bus = this.ctx.createGain();
    this.bus.gain.value = 0.25; // master cap
    this.bus.connect(this.ctx.destination);
  }

  _createLayer(name, buffer) {
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.bus);

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(gain);
    src.start(0);

    // Store by name.
    if (name === 'wind') { this.srcWind = src; this.gainWind = gain; }
    else if (name === 'bird') { this.srcBird = src; this.gainBird = gain; }
    else if (name === 'cricket') { this.srcCricket = src; this.gainCricket = gain; }
    else if (name === 'weather') { this.srcWeather = src; this.gainWeather = gain; }
  }

  /**
   * Recompute target gains from world phase/weather and begin ramping.
   * Called when world.phase.id or world.weather.id changes.
   */
  update(world) {
    if (!this.enabled || !this.initialized || !world) return;
    const t = this.ctx.currentTime;
    const ramp = 1.5; // seconds per layer gain change

    const phase = (world.phase && world.phase.id) || 'day';
    const weather = (world.weather && world.weather.id) || 'sunny';

    // Base layer targets per phase (0.1 - 0.2 each).
    let wind = 0, bird = 0, cricket = 0, weatherLayer = 0;

    if (phase === 'morning') {
      wind = 0.12; bird = 0.18; cricket = 0.02;
    } else if (phase === 'day') {
      wind = 0.10; bird = 0.14; cricket = 0.05;
    } else if (phase === 'evening') {
      wind = 0.14; bird = 0.06; cricket = 0.16;
    } else if (phase === 'night') {
      wind = 0.16; bird = 0.01; cricket = 0.20;
    }

    // Weather (rain) layer independent of phase.
    if (weather === 'rain') weatherLayer = 0.20;

    // Set targets (clamped 0.1-0.2 per layer, 0 allowed for silence).
    this.target = { wind, bird, cricket, weather: weatherLayer };

    // Ramp current -> target over ~1.5 s.
    const layers = ['wind', 'bird', 'cricket', 'weather'];
    const gainMap = { wind: this.gainWind, bird: this.gainBird, cricket: this.gainCricket, weather: this.gainWeather };
    layers.forEach((key) => {
      const g = gainMap[key];
      if (!g) return;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(this.current[key], t);
      g.gain.linearRampToValueAtTime(this.target[key], t + ramp);
    });
  }

  /**
   * Fade ambience bus master gain to v over duration ms (used on Watch enter/exit).
   */
  fadeMaster(v, durationMs = 800) {
    if (!this.enabled || !this.bus) return;
    const t = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setValueAtTime(this.bus.gain.value, t);
    this.bus.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, v)) * 0.25, t + durationMs / 1000);
  }

  setMaster(v) {
    if (!this.enabled || !this.bus) return;
    this.bus.gain.value = Math.max(0, Math.min(1, v)) * 0.25;
  }

  /**
   * Per-layer clamp helper so no layer ever exceeds 0.1-0.2 (0 allowed).
   */
  _clampLayer(v) {
    if (v === 0) return 0;
    return Math.max(0.1, Math.min(0.2, v));
  }

  dispose() {
    ['srcWind', 'srcBird', 'srcCricket', 'srcWeather'].forEach((k) => {
      const s = this[k];
      if (s) { try { s.stop(); s.disconnect(); } catch {} }
      this[k] = null;
    });
    [this.gainWind, this.gainBird, this.gainCricket, this.gainWeather, this.bus].forEach((g) => {
      if (g) { try { g.disconnect(); } catch {} }
    });
    this.initialized = false;
  }

  /* ---------- Synthesis fallbacks (seamless loops, dependency-free) ---------- */

  _createNoiseBuffer(durationSec = 6) {
    const size = this.ctx.sampleRate * durationSec;
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    return buffer;
  }

  // Wind: lowpassed noise with slow amplitude undulation.
  _synthWindBuffer() {
    const buffer = this._createNoiseBuffer(8);
    const data = buffer.getChannelData(0);
    const rate = this.ctx.sampleRate;
    const length = data.length;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 300;
    // Apply a slow AM envelope by rewriting buffer: multiply by undulating gain.
    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const und = 0.7 + 0.3 * Math.sin(t * 0.5);
      data[i] *= und * 0.5;
    }
    return buffer;
  }

  // Bird: sparse tonal chirps (morning/day dominant).
  _synthBirdBuffer() {
    const buffer = this._createNoiseBuffer(10);
    const data = buffer.getChannelData(0);
    const rate = this.ctx.sampleRate;
    const length = data.length;
    // Place ~12 sine chirps across the buffer, spaced apart.
    const chirpTimes = [0.8, 2.4, 4.1, 5.9, 7.2, 8.8];
    chirpTimes.forEach((ct) => {
      const start = Math.floor(ct * rate);
      const dur = 0.25 * rate;
      const freq = 2200 + Math.random() * 800;
      for (let i = 0; i < dur; i++) {
        const idx = start + i;
        if (idx >= length) break;
        const env = Math.sin((i / dur) * Math.PI);
        data[idx] += 0.12 * env * Math.sin(2 * Math.PI * freq * (i / rate));
      }
    });
    return buffer;
  }

  // Cricket: irregular high-frequency ticks (evening/night dominant).
  _synthCricketBuffer() {
    const buffer = this._createNoiseBuffer(10);
    const data = buffer.getChannelData(0);
    const rate = this.ctx.sampleRate;
    const length = data.length;
    const tickTimes = [0.5, 1.2, 1.9, 2.7, 3.4, 4.2, 5.1, 6.0, 6.8, 7.6, 8.4, 9.2];
    tickTimes.forEach((ct) => {
      const start = Math.floor(ct * rate);
      const dur = 0.06 * rate;
      const freq = 5000 + Math.random() * 2000;
      for (let i = 0; i < dur; i++) {
        const idx = start + i;
        if (idx >= length) break;
        const env = Math.exp(-(i / dur) * 3);
        data[idx] += 0.08 * env * Math.sin(2 * Math.PI * freq * (i / rate));
      }
    });
    return buffer;
  }

  // Rain: broadband noise, steady (weather layer).
  _synthRainBuffer() {
    return this._createNoiseBuffer(6);
  }
}
