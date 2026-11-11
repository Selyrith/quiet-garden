/**
 * Аудио-реквизит: загрузка и кэширование декодированных AudioBuffer.
 * Все эссеты лежат в /assets/audio/, мета — в *.audio.meta.json рядом.
 * При отсутствии файла возвращается null — вызывающий должен иметь фолбэк.
 */
export class AssetManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.cache = new Map(); // name -> AudioBuffer
    this.loading = new Map(); // name -> Promise
    this.meta = new Map(); // name -> meta object
  }

  /**
   * Загрузить один эссет по имени (без расширения). Ищет .wav / .mp3 / .ogg.
   */
  async load(name) {
    if (this.cache.has(name)) return this.cache.get(name);
    if (this.loading.has(name)) return this.loading.get(name);

    const promise = this._loadBuffer(name);
    this.loading.set(name, promise);
    try {
      const buffer = await promise;
      this.cache.set(name, buffer);
      return buffer;
    } finally {
      this.loading.delete(name);
    }
  }

  async _loadBuffer(name) {
    const ctx = this.ctx;
    const exts = ['.wav', '.mp3', '.ogg'];
    let lastErr = null;

    for (const ext of exts) {
      const url = `/assets/audio/${name}${ext}`;
      try {
        const res = await fetch(url);
        if (!res.ok) { lastErr = new Error(`${url}: ${res.status}`); continue; }
        const ab = await res.arrayBuffer();
        const buffer = await ctx.decodeAudioData(ab);
        this.meta.set(name, await this._fetchMeta(name));
        return buffer;
      } catch (e) {
        lastErr = e;
      }
    }

    throw lastErr || new Error(`audio asset not found: ${name}`);
  }

  async _fetchMeta(name) {
    try {
      const res = await fetch(`/assets/audio/${name}.audio.meta.json`);
      if (!res.ok) return null;
      return await res.json();
    } catch {}
    return null;
  }

  getMeta(name) {
    return this.meta.get(name) || null;
  }

  has(name) {
    return this.cache.has(name);
  }
}
