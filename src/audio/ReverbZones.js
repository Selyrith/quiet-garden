/**
 * Реверб-зоны через ConvolverNode.
 * Импульсные отклики загружаются из /assets/audio/ir_*.
 * Переключение зоны кроссфейдит gain convolver-а за 0.5 с.
 */
export class ReverbZones {
  constructor(ctx, assetManager) {
    this.ctx = ctx;
    this.am = assetManager;

    this.convolver = this.ctx.createConvolver();
    this.wet = this.ctx.createGain();
    this.dry = this.ctx.createGain();

    this.dry.gain.value = 1.0;
    this.wet.gain.value = 0.0;

    this.convolver.connect(this.wet);
    this.dry.connect(this.ctx.destination);
    this.wet.connect(this.ctx.destination);

    this.currentIr = null;
    this.irCache = new Map();
  }

  /**
   * Загрузить импульс по имени (например, 'ir_garden_open').
   */
  async loadIr(name) {
    if (this.irCache.has(name)) return this.irCache.get(name);
    const buffer = await this.am.load(name);
    this.irCache.set(name, buffer);
    return buffer;
  }

  /**
   * Переключить зону реверба. name — имя IR или null (выключить реверб).
   */
  async setZone(name) {
    if (name === this.currentIr) return;
    const t = this.ctx.currentTime;

    if (name) {
      try {
        const ir = await this.loadIr(name);
        this.convolver.buffer = ir;
        this.wet.gain.cancelScheduledValues(t);
        this.wet.gain.setValueAtTime(this.wet.gain.value, t);
        this.wet.gain.linearRampToValueAtTime(0.35, t + 0.5);
        this.currentIr = name;
      } catch (e) {
        console.warn('[ReverbZones] failed to load IR', name, e);
        this.wet.gain.cancelScheduledValues(t);
        this.wet.gain.linearRampToValueAtTime(0, t + 0.5);
        this.currentIr = null;
      }
    } else {
      this.wet.gain.cancelScheduledValues(t);
      this.wet.gain.linearRampToValueAtTime(0, t + 0.5);
      this.currentIr = null;
    }
  }

  setWetLevel(v) {
    this.wet.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.1);
  }

  dispose() {
    try { this.convolver.disconnect(); } catch {}
    try { this.wet.disconnect(); } catch {}
    try { this.dry.disconnect(); } catch {}
  }
}
