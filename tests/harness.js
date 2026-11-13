import Phaser from './phaser-shim.js';

/**
 * Мини-харнесс для headless-проверки оверлеев в jsdom.
 *
 * phaser-test-utils не подходит: он делает `import * as Phaser from 'phaser'`
 * и падает на этой сборке Phaser. Здесь делается то же самое, но вручную:
 * HEADLESS-игра, принудительная готовность текстур (jsdom не грузит
 * base64-изображения) и ручной шаг игрового цикла.
 *
 * Ещё одна дырка jsdom: `CanvasRenderingContext2D.measureText` возвращает
 * нулевую ширину, поэтому у любого Phaser.Text ширина и высота равны нулю —
 * вёрстку по прямоугольникам текста проверить невозможно. Ставим честную
 * оценку метрик (по кеглю и длине строки), чтобы `getBounds()` у текста был
 * непустым.
 */

function installTextMetrics() {
  if (typeof document === 'undefined') return;

  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx || typeof ctx.measureText !== 'function') return;
  if (ctx.measureText('MM').width > 0) return; // метрики настоящие — не трогаем

  const proto = Object.getPrototypeOf(ctx);
  proto.measureText = function measureText(text) {
    const fontPx = Number((/(\d+(?:\.\d+)?)px/.exec(this.font || '') || [])[1]) || 16;
    const width = String(text).length * fontPx * 0.52;
    return {
      width,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: width,
      actualBoundingBoxAscent: fontPx * 0.72,
      actualBoundingBoxDescent: fontPx * 0.24,
    };
  };
}

installTextMetrics();

function forceTextureReady(game) {
  const textures = game.textures;
  if (textures._pending === 0) return;
  for (const key of ['__DEFAULT', '__MISSING', '__WHITE']) {
    if (!textures.exists(key)) textures.createCanvas(key, 1, 1);
  }
  textures._pending = 0;
  textures.off('load');
  textures.off('error');
  textures.emit('ready');
}

export function bootScene(width, height, createScene = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('scene create timed out')), 10000);

    const game = new Phaser.Game({
      type: Phaser.HEADLESS,
      width,
      height,
      audio: { noAudio: true },
      banner: false,
      scene: {
        key: 'test',
        create() {
          clearTimeout(timer);
          resolve({ game, scene: this });
        },
        ...createScene,
      },
    });

    forceTextureReady(game);
    game.loop.start();

    const poll = () => {
      const scenes = game.scene.getScenes(false);
      if (scenes.length && scenes[0].sys.settings.status >= 5) {
        game.loop.stop();
        clearTimeout(timer);
        resolve({ game, scene: scenes[0] });
        return;
      }
      setTimeout(poll, 2);
    };
    setTimeout(poll, 2);
  });
}

export function step(game, frames = 1) {
  let time = game.loop.now || 0;
  for (let i = 0; i < frames; i++) {
    time += 1000 / 60;
    game.headlessStep(time, 1000 / 60);
  }
}