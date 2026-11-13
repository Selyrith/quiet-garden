/**
 * Процедурный уютный декор сада: пруд, фонарики, скамейка, кустики, ореолы света.
 *
 * ВАЖНО: декор ставится НЕ поверх грядок, а на полосы платформы вокруг сетки
 * (`computeDecorBands` в GardenFrame.js) — иначе 64 непрозрачные грядки
 * перекрывали его, и «декора не было видно». Геометрия полос приходит из
 * `decorGeometry`, поэтому декор всегда попадает в видимую зону.
 *
 * Почему процедурно, а не спрайтами: растения рисуются кодом
 * (PlantTextureFactory + PixelArt), и растровые объекты из внешних паков
 * выбивались из единого стиля. Плюс на них не было лицензии.
 *
 * Всё запекается один раз в текстуры и живёт в `scene.gardenDecor`.
 * В кадре ничего не перерисовывается.
 *
 * Приёмы (см. design/reference/web/TECHNIQUES.md):
 *  - объём через запечённый свет сверху-слева и тень снизу-справа;
 *  - мягкая тень-«кайма» под объектами (имитация ambient occlusion);
 *  - свет — аддитивные ореолы (BlendModes.ADD), без шейдеров и без normal maps.
 */

import Phaser from 'phaser';
import { DS } from './DesignSystem.js';
import { bakeTexture, hexColor } from './BakeTexture.js';
import { decorGeometry } from './GardenFrame.js';

/** Мягкая эллиптическая тень под объектом (имитация AO). */
function drawSoftShadow(g, cx, cy, w, h, alpha = 0.22) {
  const dark = hexColor(DS.colors.garden.soilDark);
  g.fillStyle(dark, alpha * 0.5);
  g.fillEllipse(cx, cy + 1, w, h);
  g.fillStyle(dark, alpha * 0.35);
  g.fillEllipse(cx, cy, w * 0.82, h * 0.78);
}

/** Текстура пруда: тёмная вода + блик + камни по кромке. */
export function bakePondTexture(scene, key, size = 96) {
  return bakeTexture(scene, key, size, size, (g) => {
    const cx = size / 2;
    const cy = size / 2;
    const rx = size * 0.40;
    const ry = size * 0.32;

    drawSoftShadow(g, cx, cy + ry * 0.35, rx * 2.3, ry * 1.5, 0.16);

    // Каменная кромка.
    const stone = hexColor(DS.colors.garden.bench);
    const stoneDark = hexColor(DS.colors.garden.fence);
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10;
      const sx = cx + Math.cos(a) * rx * 1.02;
      const sy = cy + Math.sin(a) * ry * 1.02;
      const r = size * 0.055 + ((i * 7) % 5) * 0.6;
      g.fillStyle(stoneDark, 1);
      g.fillCircle(sx, sy + 1, r);
      g.fillStyle(stone, 1);
      g.fillCircle(sx - r * 0.2, sy - r * 0.2, r * 0.78);
    }

    // Вода.
    g.fillStyle(hexColor(DS.colors.garden.water.deep), 1);
    g.fillEllipse(cx, cy, rx * 2, ry * 2);
    g.fillStyle(hexColor(DS.colors.garden.water.light), 0.75);
    g.fillEllipse(cx - rx * 0.12, cy - ry * 0.15, rx * 1.25, ry * 1.1);

    // Блик: светлая дуга сверху-слева.
    g.lineStyle(Math.max(1.5, size * 0.025), hexColor(DS.colors.garden.water.highlight), 0.55);
    g.strokeEllipse(cx - rx * 0.18, cy - ry * 0.28, rx * 0.9, ry * 0.55);
  });
}

/** Текстура фонаря: столбик + тёплое стекло. */
export function bakeLanternTexture(scene, key, w = 22, h = 30) {
  return bakeTexture(scene, key, w, h, (g) => {
    const pole = hexColor(DS.colors.garden.lantern.pole);
    const core = hexColor(DS.colors.garden.lantern.core);
    const glow = hexColor(DS.colors.garden.lantern.glow);

    g.fillStyle(hexColor(DS.colors.garden.soilDark), 0.2);
    g.fillEllipse(w / 2 + 1.5, h - 1.5, w * 0.55, 3);

    g.fillStyle(pole, 1);
    g.fillRect(w / 2 - 1.5, h * 0.45, 3, h * 0.55);

    g.fillStyle(pole, 1);
    g.fillRoundedRect(w * 0.24, h * 0.16, w * 0.52, h * 0.34, 2);
    g.fillStyle(glow, 0.95);
    g.fillRoundedRect(w * 0.31, h * 0.2, w * 0.38, h * 0.25, 1.5);
    g.fillStyle(core, 1);
    g.fillCircle(w / 2, h * 0.32, Math.max(1.4, w * 0.1));
    g.fillStyle(pole, 1);
    g.fillTriangle(w * 0.2, h * 0.17, w * 0.8, h * 0.17, w * 0.5, h * 0.05);
  });
}

/** Текстура скамейки: сиденье, спинка, ножки. */
export function bakeBenchTexture(scene, key, w = 40, h = 20) {
  return bakeTexture(scene, key, w, h, (g) => {
    const wood = hexColor(DS.colors.garden.bench);
    const woodDark = hexColor(DS.colors.garden.fence);
    const edge = hexColor(DS.colors.garden.path);

    g.fillStyle(hexColor(DS.colors.garden.soilDark), 0.22);
    g.fillEllipse(w / 2 + 1.5, h - 2, w * 0.92, 4);

    g.fillStyle(woodDark, 1);
    g.fillRect(w * 0.16, h * 0.55, 2.5, h * 0.42);
    g.fillRect(w * 0.82, h * 0.55, 2.5, h * 0.42);

    g.fillStyle(wood, 1);
    g.fillRoundedRect(w * 0.06, h * 0.52, w * 0.88, h * 0.18, 2);
    g.fillStyle(edge, 0.6);
    g.fillRect(w * 0.08, h * 0.53, w * 0.84, 1.5);

    g.fillStyle(wood, 1);
    g.fillRoundedRect(w * 0.08, h * 0.2, w * 0.84, h * 0.13, 2);
    g.fillStyle(woodDark, 0.8);
    g.fillRect(w * 0.08, h * 0.32, w * 0.84, 1.5);
  });
}

/** Текстура кустика для кромки платформы. */
export function bakeShrubTexture(scene, key, size = 28) {
  return bakeTexture(scene, key, size, size, (g) => {
    const leafDark = 0x3f6b46;
    const leaf = hexColor(DS.colors.garden.grass);
    const leafLight = 0x8fcf8a;

    drawSoftShadow(g, size / 2 + 1, size * 0.85, size * 0.7, size * 0.22, 0.2);

    g.fillStyle(leafDark, 1);
    g.fillCircle(size * 0.35, size * 0.62, size * 0.24);
    g.fillCircle(size * 0.65, size * 0.62, size * 0.22);
    g.fillStyle(leaf, 1);
    g.fillCircle(size * 0.35, size * 0.55, size * 0.2);
    g.fillCircle(size * 0.64, size * 0.56, size * 0.18);
    g.fillStyle(leafLight, 0.85);
    g.fillCircle(size * 0.3, size * 0.47, size * 0.11);
  });
}

/** Мягкий ореол света (аддитивный блендинг). */
export function bakeGlowTexture(scene, key = 'garden_glow', size = 96) {
  return bakeTexture(scene, key, size, size, (g) => {
    const c = size / 2;
    const rings = [
      [0.5, 0.05],
      [0.40, 0.09],
      [0.30, 0.14],
      [0.20, 0.20],
      [0.10, 0.34]
    ];
    for (const [r, a] of rings) {
      g.fillStyle(0xfff2c0, a);
      g.fillCircle(c, c, size * r);
    }
  });
}

/**
 * Создаёт (или пересоздаёт) декор сада.
 *
 * @param {Phaser.Scene} scene
 * @param {object} layout результат computeLayout
 * @param {{side: number, bottom: number}} bands ширины полос платформы
 * @returns {Phaser.GameObjects.GameObject[]} созданные объекты
 */
export function createGardenDecor(scene, layout, bands) {
  const geo = decorGeometry(layout, bands);
  const tile = layout.grid.tileSize;
  const decor = [];
  const lights = [];

  const pondKey = bakePondTexture(scene, 'garden_pond');
  const lanternKey = bakeLanternTexture(scene, 'garden_lantern');
  const benchKey = bakeBenchTexture(scene, 'garden_bench');
  const shrubKey = bakeShrubTexture(scene, 'garden_shrub');
  const glowKey = bakeGlowTexture(scene);

  const addGlow = (x, y, size, depth) => {
    const glow = scene.add.image(x, y, glowKey)
      .setOrigin(0.5)
      .setDepth(depth)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(size, size)
      .setAlpha(0);
    decor.push(glow);
    lights.push(glow);
    return glow;
  };

  const addLantern = (x, y) => {
    const lantern = scene.add.image(x, y, lanternKey)
      .setOrigin(0.5).setDepth(DS.depth.decor);
    lantern.setDisplaySize(Math.max(12, tile * 0.42), Math.max(16, tile * 0.58));
    decor.push(lantern);
    addGlow(x, y - tile * 0.16, tile * 1.5, DS.depth.decor + 1);
  };

  const stripY = geo.bottomStripY;
  const bottomStripH = geo.bottomStripH;

  // --- нижняя полоса: пруд, скамейка, фонари ---
  if (bottomStripH > 8) {
    const pondSize = Math.min(bottomStripH * 1.05, tile * 1.7, geo.width * 0.3);
    const pondX = geo.left + geo.width * 0.82;
    const pondY = stripY;

    const pond = scene.add.image(pondX, pondY, pondKey)
      .setOrigin(0.5).setDepth(DS.depth.decor);
    pond.setDisplaySize(pondSize, pondSize * 0.78);
    decor.push(pond);
    addGlow(pondX, pondY, pondSize * 1.15, DS.depth.decor + 1);

    const bench = scene.add.image(pondX - pondSize * 0.72, pondY, benchKey)
      .setOrigin(0.5).setDepth(DS.depth.decor);
    bench.setDisplaySize(Math.max(22, pondSize * 0.72), Math.max(12, pondSize * 0.36));
    decor.push(bench);

    // Фонари в нижних углах полосы.
    addLantern(geo.left + geo.width * 0.12, stripY);
    addLantern(geo.left + geo.width * 0.38, stripY);
  }

  // --- боковые полосы: фонари + кустики ---
  if (bands.side > 6) {
    const sideX = (left) => left ? geo.left + bands.side / 2 : geo.left + geo.width - bands.side / 2;
    // top-ish и bottom-ish точки боковых полос, но только в зоне грядок.
    const y1 = geo.top + geo.height * 0.18;
    const y2 = geo.top + geo.height * 0.52;

    addLantern(sideX(true), y1);
    addLantern(sideX(false), y2);

    for (const [x, y] of [
      [sideX(true), y2],
      [sideX(false), y1],
      [geo.left + geo.width * 0.06, geo.top + geo.height * 0.02],
      [geo.left + geo.width * 0.94, geo.top + geo.height * 0.03]
    ]) {
      const shrub = scene.add.image(x, y, shrubKey)
        .setOrigin(0.5).setDepth(DS.depth.decor);
      const s = Math.max(12, Math.min(tile * 0.6, bands.side * 1.4));
      shrub.setDisplaySize(s, s);
      decor.push(shrub);
    }
  }

  scene.gardenLights = lights;
  // Новые ореолы созданы с alpha 0 — сбрасываем кэш фазы, чтобы
  // updateGardenLights сразу выставил актуальную яркость.
  scene._lastLightPhase = null;
  return decor;
}

/** Целевая сила свечения по фазе дня. */
const LIGHT_LEVELS = { morning: 0.18, day: 0, evening: 0.7, night: 1 };

/**
 * Зажигает фонари вечером и ночью, гасит днём.
 * Твин запускается только при смене фазы — не на каждом тике мира.
 *
 * @param {Phaser.Scene} scene
 * @param {string} phase 'morning' | 'day' | 'evening' | 'night'
 */
export function updateGardenLights(scene, phase) {
  const lights = scene.gardenLights;
  if (!lights || !lights.length) return;
  if (scene._lastLightPhase === phase) return;
  scene._lastLightPhase = phase;

  const target = LIGHT_LEVELS[phase] ?? 0;
  for (const glow of lights) {
    scene.tweens.killTweensOf(glow);
    scene.tweens.add({
      targets: glow,
      alpha: target,
      duration: 2200,
      ease: 'Sine.easeInOut'
    });
  }
}
