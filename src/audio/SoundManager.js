import { MusicManager } from './MusicManager.js';
import { AssetManager } from './AssetManager.js';
import { SpatialAudio } from './SpatialAudio.js';
import { ReverbZones } from './ReverbZones.js';

/**
 * Центральный звук. Одна шина, один AudioContext.
 *
 * Интеграция с AssetManager (реальные файлы), SpatialAudio (позиционирование),
 * ReverbZones (импульсный реверб). При отсутствии файла — процедурный фолбэк
 * на осцилляторах (как раньше), чтобы игра не сломалась без эссетов.
 */
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('qg_mute') !== '1';
    this.music = null;
    this.am = null;
    this.spatial = null;
    this.reverb = null;
    this.listener = { x: 0, y: 0 };
  }

  async init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        this.ctx = new AC();
        this.am = new AssetManager(this.ctx);
        this.spatial = new SpatialAudio(this.ctx, this.listener);
        this.reverb = new ReverbZones(this.ctx, this.am);
        this.music = new MusicManager(this.ctx, this.am);
      }
    } catch (e) {
      this.enabled = false;
    }
  }

  resume() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.enabled && this.music && !this.music.isPlaying) this.music.start();
      }).catch(() => {});
    } else if (this.enabled && this.music && !this.music.isPlaying) {
      this.music.start();
    }
  }

  pause() {
    if (this.music) this.music.stop();
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  resumeFromPause() {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.music && !this.music.isPlaying) this.music.start();
      }).catch(() => {});
    } else if (this.music && !this.music.isPlaying) {
      this.music.start();
    }
  }

  toggleMute() {
    this.enabled = !this.enabled;
    if (this.ctx) {
      if (this.enabled) {
        this.resume();
      } else {
        if (this.music) this.music.stop();
        if (this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
      }
    }
    return this.enabled;
  }

  duckMusic(vol) {
    if (!this.music || !this.music.gainNode || !this.ctx) return 0;
    const target = Math.max(0, Math.min(1, vol)) * 0.15;
    this.music.gainNode.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    return target;
  }

  unduckMusic() {
    if (!this.music || !this.music.gainNode || !this.ctx) return;
    this.music.gainNode.gain.setTargetAtTime(0.15, this.ctx.currentTime, 0.1);
  }

  /* ---------- Публичный API (совместимость со старыми вызовами) ---------- */

  click() { this._playSfx('ui/click', { volume: 0.12, pitch: 1.0 }); }

  plant() { this._playSfx('actions/plant', { volume: 0.35, pitch: 1.0 }); }

  water() { this._playSfx('actions/water', { volume: 0.3, pitch: 1.0 }); }

  harvest() { this._playSfx('actions/harvest', { volume: 0.4, pitch: 1.0 }); }

  buy() { this._playSfx('actions/buy', { volume: 0.35, pitch: 1.0 }); }

  error() { this._playSfx('ui/error', { volume: 0.25, pitch: 0.8 }); }

  /**
   * Проиграть SFX по имени. Если файл не найден — процедурный фолбэк.
   */
  async _playSfx(name, { volume = 0.5, pitch = 1.0, x = 0, y = 0, spatial = false } = {}) {
    if (!this.enabled || !this.ctx) return;

    let buffer = null;
    if (this.am) {
      try { buffer = await this.am.load(name); } catch {}
    }

    if (buffer) {
      if (spatial && this.spatial) {
        this.spatial.playAt(name, buffer, { volume, x, y, pitch });
      } else {
        this._playBuffer(buffer, { volume, pitch });
      }
    } else {
      this._playProcedural(name, { volume, pitch });
    }
  }

  _playBuffer(buffer, { volume = 0.5, pitch = 1.0 } = {}) {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = pitch;
    const gain = this.ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume));
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(0);
    src.onended = () => {
      try { src.disconnect(); gain.disconnect(); } catch {}
    };
  }

  /* ---------- Процедурные фолбэки (когда файлы отсутствуют) ---------- */

  _createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  _playProcedural(name, { volume = 0.5, pitch = 1.0 } = {}) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const v = Math.max(0, Math.min(1, volume)) * 0.5;

    if (name === 'click') {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(1200 * pitch, t + 0.05);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } else if (name === 'plant') {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(250 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(100 * pitch, t + 0.15);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v * 0.6, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._createNoiseBuffer();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.value = 400;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(v * 0.3, t + 0.05);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      noise.connect(filter).connect(ng).connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.2);
    } else if (name === 'water') {
      [600, 900].forEach((freq, i) => {
        const start = t + i * 0.08;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * pitch, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 2 * pitch, start + 0.1);
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(v * 0.3, start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
        osc.connect(g).connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.2);
      });
    } else if (name === 'harvest') {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const start = t + i * 0.05;
        const osc = this.ctx.createOscillator();
        const mod = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq * pitch;
        mod.type = 'sine';
        mod.frequency.value = freq * 2.5 * pitch;
        modGain.gain.value = freq * 1.5 * pitch;
        mod.connect(modGain);
        modGain.connect(osc.frequency);
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(v * 0.24, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
        osc.connect(g).connect(this.ctx.destination);
        mod.start(start);
        osc.start(start);
        mod.stop(start + 0.7);
        osc.stop(start + 0.7);
      });
    } else if (name === 'buy') {
      [440, 554.37, 659.25, 880].forEach((freq, i) => {
        const start = t + i * 0.06;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq * pitch, start);
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(v * 0.2, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        osc.connect(g).connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.35);
      });
    } else if (name === 'error') {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150 * pitch, t);
      osc.frequency.linearRampToValueAtTime(100 * pitch, t + 0.2);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v * 0.4, t + 0.02);
      g.gain.linearRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    }
  }

  /* ---------- Позиционные звуки (новое API) ---------- */

  /**
   * Проиграть звук в точке мира (x, y). Источник привязан к sourceId.
   */
  playAt(sourceId, name, { volume = 0.5, x = 0, y = 0, pitch = 1.0 } = {}) {
    if (!this.enabled || !this.ctx || !this.spatial) return;
    this._playSfx(name, { volume, x, y, pitch, spatial: true });
  }

  stopSpatial(sourceId) {
    if (this.spatial) this.spatial.stop(sourceId);
  }

  /** Синхронизировать позицию слушателя с игроком (вызывать каждый кадр). */
  updateListener(x, y) {
    this.listener.x = x;
    this.listener.y = y;
    if (this.spatial) this.spatial.update();
  }

  /* ---------- Реверб-зоны ---------- */

  async setReverbZone(zoneName) {
    if (this.reverb) await this.reverb.setZone(zoneName);
  }

  /* ---------- Музыка ---------- */

  setMusicVolume(vol) {
    if (this.music) this.music.setVolume(vol);
  }

  dispose() {
    if (this.spatial) this.spatial.dispose();
    if (this.reverb) this.reverb.dispose();
    if (this.music) this.music.stop();
    this.ctx = null;
  }
}

// Единственный экземпляр звука для всего приложения (main.js + GameScene).
export const sound = new SoundManager();
