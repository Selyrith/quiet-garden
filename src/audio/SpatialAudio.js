/**
 * Пространственное аудио: PannerNode с HRTF, модель расстояния inverse.
 * Источник привязан к координатам тайла (x, y) в世界的 пространстве.
 * refDistance = 5 клеток, maxDistance = 40, rolloff = 1.
 */
export class SpatialAudio {
  constructor(ctx, listener) {
    this.ctx = ctx;
    this.listeners = listener; // { x, y } объект, читается каждый кадр
    this.panners = new Map(); // sourceId -> { panner, gain, bufferSource }
  }

  /**
   * Воспроизвести буфер в точке мира.
   * sourceId — уникальный id источника (например, 'player-1' или 'tile-5,3').
   * Если источник с таким id уже играет — перезапускается.
   */
  playAt(sourceId, buffer, { volume = 0.5, x = 0, y = 0, loop = false, pitch = 1.0 } = {}) {
    this.stop(sourceId);

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 5;
    panner.maxDistance = 40;
    panner.rolloffFactor = 1;
    panner.positionX.setValueAtTime(x, this.ctx.currentTime);
    panner.positionY.setValueAtTime(y, this.ctx.currentTime);
    panner.positionZ.setValueAtTime(0, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume));

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = loop;
    src.playbackRate.value = pitch;

    src.connect(panner);
    panner.connect(gain);
    gain.connect(this.ctx.destination);

    src.start(0);
    if (loop && buffer.duration) src.stop(this.ctx.currentTime + buffer.duration + 0.5);

    this.panners.set(sourceId, { panner, gain, src });

    src.onended = () => {
      this.panners.delete(sourceId);
    };

    return src;
  }

  /**
   * Обновить позицию существующего источника (вызывать каждый кадр или при перемещении).
   */
  setPosition(sourceId, x, y) {
    const p = this.panners.get(sourceId);
    if (!p) return;
    const t = this.ctx.currentTime;
    p.panner.positionX.setValueAtTime(x, t);
    p.panner.positionY.setValueAtTime(y, t);
  }

  setVolume(sourceId, volume) {
    const p = this.panners.get(sourceId);
    if (!p) return;
    p.gain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime, 0.05);
  }

  stop(sourceId) {
    const p = this.panners.get(sourceId);
    if (!p) return;
    try { p.src.stop(); p.src.disconnect(); } catch {}
    try { p.panner.disconnect(); } catch {}
    try { p.gain.disconnect(); } catch {}
    this.panners.delete(sourceId);
  }

  stopAll() {
    for (const id of [...this.panners.keys()]) this.stop(id);
  }

  /**
   * Синхронизировать позицию слушателя с позицией игрока (каждый кадр через update).
   */
  update() {
    if (!this.listeners) return;
    const l = this.listeners;
    // Слушатель в центре экрана, ось Y инвертирована (Phaser y вниз, Web Audio y вверх)
    this.ctx.listener.positionX.setValueAtTime(l.x || 0, this.ctx.currentTime);
    this.ctx.listener.positionY.setValueAtTime(-(l.y || 0), this.ctx.currentTime);
    this.ctx.listener.positionZ.setValueAtTime(0, this.ctx.currentTime);
    this.ctx.listener.forwardX.setValueAtTime(0, this.ctx.currentTime);
    this.ctx.listener.forwardY.setValueAtTime(-1, this.ctx.currentTime);
    this.ctx.listener.forwardZ.setValueAtTime(0, this.ctx.currentTime);
    this.ctx.listener.upX.setValueAtTime(0, this.ctx.currentTime);
    this.ctx.listener.upY.setValueAtTime(0, this.ctx.currentTime);
    this.ctx.listener.upZ.setValueAtTime(1, this.ctx.currentTime);
  }

  dispose() {
    this.stopAll();
  }
}
