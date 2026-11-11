/**
 * Фоновая музыка Quiet Garden.
 *
 * Реальный аудио-слейс garden_loop.ogg через AssetManager, проигрывается циклом
 * на отдельной gain-шине (музыкальная шина отделена от ambience-шины AmbienceManager).
 * Процедурные ноты (кромешный пентатоник) оформлены какsoft overlay —
 * играют тихо поверхループ, чтобы не было пустоты при загрузке или если эссет не подгрузился.
 *
 * Lookahead-планировщик для процедурных нот сохранён (тик 25 мс, lookahead 150 мс).
 */
export class MusicManager {
  constructor(audioContext, am) {
    this.ctx = audioContext;
    this.am = am;
    this.isPlaying = false;
    this.timer = null;
    this.gainNode = null;
    this.scale = [261.63, 293.66, 329.63, 392.00, 440.00]; // C4 D4 E4 G4 A4

    this.nextNoteTime = 0;
    this.lookahead = 0.15;    // сек вперёд
    this.tickMs = 25;         // мс между планировщиками
    this.minInterval = 2.5;
    this.maxInterval = 5.0;

    // Реальныйループ (buffer source, зациклен).
    this.loopSource = null;
    this.loopBuffer = null;
    this.loopLoaded = false;
  }

  async start() {
    if (!this.ctx || this.isPlaying) return;
    this.isPlaying = true;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.15;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    this.gainNode.connect(filter);
    filter.connect(this.ctx.destination);

    // Пытаемся загрузить реальныйループ.
    if (this.am) {
      try {
        this.loopBuffer = await this.am.load('music/garden_loop');
        // Если пока грузили — нас остановили, выходим без создания источников
        if (!this.isPlaying) return;
        this._startLoop();
        this.loopLoaded = true;
      } catch (e) {
        if (!this.isPlaying) return;
        this.loopLoaded = false;
        console.warn('[MusicManager] real loop not loaded, procedural fallback:', e.message);
      }
    }

    if (!this.isPlaying) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this._tick();
  }

  _startLoop() {
    if (!this.loopBuffer || !this.ctx) return;
    // Останавливаем старый источник, если был.
    if (this.loopSource) {
      try { this.loopSource.stop(); this.loopSource.disconnect(); } catch {}
    }

    this.loopSource = this.ctx.createBufferSource();
    this.loopSource.buffer = this.loopBuffer;
    this.loopSource.loop = true;
    this.loopSource.connect(this.gainNode);
    this.loopSource.start(0);
  }

  _tick() {
    if (!this.isPlaying) return;
    if (!this.gainNode) return;
    const horizon = this.ctx.currentTime + this.lookahead;
    while (this.nextNoteTime < horizon) {
      this._scheduleNote(this.nextNoteTime);
      this.nextNoteTime += this.minInterval + Math.random() * (this.maxInterval - this.minInterval);
    }
    this.timer = setTimeout(() => this._tick(), this.tickMs);
  }

  _scheduleNote(when) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    const noteIdx = Math.floor(Math.random() * this.scale.length);
    let freq = this.scale[noteIdx];
    if (Math.random() > 0.8) freq *= 2;
    if (Math.random() > 0.7) freq /= 2;

    osc.type = 'sine';
    osc.frequency.value = freq;

    // Процедурные ноты тихо — overlay поверх реальногоループ.
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(0.12, when + 0.1);
    env.gain.exponentialRampToValueAtTime(0.001, when + 3.0);

    osc.connect(env);
    env.connect(this.gainNode);

    osc.start(when);
    osc.stop(when + 3.1);
  }

  setVolume(vol) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(vol * 0.15, this.ctx.currentTime, 0.1);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.loopSource) {
      try { this.loopSource.stop(); this.loopSource.disconnect(); } catch {}
      this.loopSource = null;
    }
    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch {}
      this.gainNode = null;
    }
    this.loopLoaded = false;
  }
}
