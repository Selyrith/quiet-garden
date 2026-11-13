/**
 * Запекание процедурной графики в текстуры.
 *
 * Зачем: `Graphics` в кадре — это перестройка геометрии и лишние вызовы.
 * Всё статичное (градиент неба, холмы, рамка сада, почва грядки) выгоднее
 * один раз нарисовать в текстуру и показывать обычным `Image`.
 *
 * Ключ кэшируется в Texture Manager — повторный вызов с тем же ключом
 * не создаёт текстуру заново (см. design/reference/web/PHASER-TEXTURES.md).
 */

/** '#rrggbb' → 0xrrggbb */
export function hexColor(css) {
  const value = String(css).trim();
  if (value.startsWith('#')) return parseInt(value.slice(1), 16);
  return Number(value);
}

/**
 * Запекает `Graphics` в текстуру.
 *
 * @param {Phaser.Scene} scene
 * @param {string} key ключ текстуры
 * @param {number} w ширина
 * @param {number} h высота
 * @param {(g: Phaser.GameObjects.Graphics) => void} draw
 * @returns {string} ключ текстуры
 */
export function bakeTexture(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return key;

  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
  g.destroy();

  return key;
}

/** Удаляет текстуру, если она есть (для пересборки под новый размер). */
export function dropTexture(scene, key) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
}

/** Линейная интерполяция двух 0xrrggbb цветов. */
export function mixColor(from, to, t) {
  const fr = (from >> 16) & 255;
  const fg = (from >> 8) & 255;
  const fb = from & 255;
  const tr = (to >> 16) & 255;
  const tg = (to >> 8) & 255;
  const tb = to & 255;
  const r = Math.round(fr + (tr - fr) * t);
  const g = Math.round(fg + (tg - fg) * t);
  const b = Math.round(fb + (tb - fb) * t);
  return (r << 16) | (g << 8) | b;
}

/**
 * Детерминированный ГПСЧ (тот же алгоритм, что в GardenFrame/SoilTexture).
 * Вынесен сюда, чтобы декор панелей не «дрожал» между перезапусками.
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
