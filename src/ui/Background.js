import { bakeTexture, dropTexture, mixColor } from './BakeTexture.js';
import { DS } from './DesignSystem.js';

/**
 * Процедурный фон: небо по фазам дня, три слоя холмов, солнце/луна/звёзды, облака.
 *
 * Всё статичное запекается в текстуры (см. design/reference/web/PHASER-TEXTURES.md):
 * раньше каждый кадр держал в сцене десяток `Graphics`, а смена фазы дня
 * перерисовывала градиент полосами. Теперь — одна `Image` на фазу.
 *
 * Что остаётся анимируемым: позиции/альфа солнца, луны и звёзд; дрейф облаков.
 * Это твины над `Image`, без перерисовки геометрии.
 */

/** Небо по фазам: верхний и нижний цвет градиента. */
const SKY_GRADIENTS = {
  morning: [0xfff0d0, 0xb5e2ff],
  day:     [0x4facfe, 0xa1c4fd],
  evening: [0xff9050, 0x4facfe],
  night:   [0x1a1a4a, 0x0a0a2a]
};

/** Палитра холмов от дальнего к ближнему. */
const HILL_COLORS = [0x86b88c, 0x6da573, 0x558a5c];

function bakeSky(scene, key, w, h, top, bottom) {
  return bakeTexture(scene, key, w, h, (g) => {
    // 28 полос вместо 10 — градиент без видимых ступеней.
    const steps = 28;
    const band = Math.ceil(h / steps) + 1;
    for (let i = 0; i < steps; i++) {
      const color = mixColor(top, bottom, i / (steps - 1));
      g.fillStyle(color, 1);
      g.fillRect(0, Math.floor((h * i) / steps), w, band);
    }
  });
}

function bakeHills(scene, key, w, h, color, layers) {
  return bakeTexture(scene, key, w, h, (g) => {
    g.fillStyle(color, 1);
    for (const [cx, cy, rw, rh] of layers) {
      g.fillEllipse(cx * w, cy * h, rw * w, rh * h);
    }
  });
}

function bakeSun(scene, key, radius) {
  const size = radius * 4;
  return bakeTexture(scene, key, size, size, (g) => {
    const c = size / 2;
    // Мягкий ореол в три слоя (аддитивно смотрится как свет).
    g.fillStyle(0xfff3c4, 0.10);
    g.fillCircle(c, c, radius * 1.9);
    g.fillStyle(0xfff6d8, 0.22);
    g.fillCircle(c, c, radius * 1.35);
    g.fillStyle(0xfffbe8, 0.95);
    g.fillCircle(c, c, radius * 0.72);
  });
}

function bakeMoon(scene, key, radius) {
  const size = radius * 4;
  return bakeTexture(scene, key, size, size, (g) => {
    const c = size / 2;
    g.fillStyle(0xdfe6f5, 0.16);
    g.fillCircle(c, c, radius * 1.8);
    g.fillStyle(0xe8eef9, 0.9);
    g.fillCircle(c, c, radius * 0.7);
    // Кратеры — мягкие пятна, не «дырки».
    g.fillStyle(0xc3cde0, 0.55);
    g.fillCircle(c - radius * 0.22, c - radius * 0.12, radius * 0.13);
    g.fillCircle(c + radius * 0.24, c + radius * 0.18, radius * 0.09);
    g.fillCircle(c + radius * 0.10, c - radius * 0.26, radius * 0.07);
  });
}

function bakeStars(scene, key, w, h) {
  return bakeTexture(scene, key, w, h, (g) => {
    // Детерминированный «звёздный» узор: не мерцает между фазами.
    let seed = 20260101;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 90; i++) {
      const sx = rnd() * w;
      const sy = rnd() * h * 0.55;
      const r = 0.4 + rnd() * 1.5;
      g.fillStyle(0xfdfbf2, 0.25 + rnd() * 0.65);
      g.fillCircle(sx, sy, r);
    }
  });
}

function bakeCloud(scene, key, w, h, alpha) {
  return bakeTexture(scene, key, w, h, (g) => {
    // Пушистое облако из перекрывающихся кругов — мягче прямоугольников.
    g.fillStyle(0xffffff, alpha);
    g.fillCircle(w * 0.28, h * 0.66, h * 0.30);
    g.fillCircle(w * 0.50, h * 0.52, h * 0.40);
    g.fillCircle(w * 0.72, h * 0.66, h * 0.28);
    g.fillRect(w * 0.20, h * 0.62, w * 0.62, h * 0.30);
    // Светлая кромка сверху.
    g.fillStyle(0xfffdf7, alpha * 0.55);
    g.fillCircle(w * 0.48, h * 0.46, h * 0.26);
  });
}

/** Пересобирает текстуры под текущий размер экрана. */
function rebuildTextures(bg, w, h) {
  const scene = bg.scene;

  // Старые ключи могли быть под другой размер — сносим, чтобы не течь.
  for (const key of bg.ownedTextures) dropTexture(scene, key);
  bg.ownedTextures.clear();

  bg.keys.sky = {};
  for (const [phase, [top, bottom]] of Object.entries(SKY_GRADIENTS)) {
    const key = `bg_sky_${phase}_${w}x${h}`;
    bakeSky(scene, key, w, h, top, bottom);
    bg.ownedTextures.add(key);
    bg.keys.sky[phase] = key;
  }

  bg.keys.hills = [];
  const hillLayers = [
    [[0.20, 0.80, 1.20, 0.60], [0.80, 0.80, 1.20, 0.60]],
    [[0.50, 0.90, 1.50, 0.70]],
    [[0.10, 1.05, 1.00, 0.50], [0.90, 1.05, 1.00, 0.50]]
  ];
  hillLayers.forEach((layers, i) => {
    const key = `bg_hill_${i}_${w}x${h}`;
    bakeHills(scene, key, w, h, HILL_COLORS[i], layers);
    bg.ownedTextures.add(key);
    bg.keys.hills.push(key);
  });

  const sunR = Math.max(26, Math.round(Math.min(w, h) * 0.05));
  const moonR = Math.max(22, Math.round(Math.min(w, h) * 0.045));

  bg.keys.sun = `bg_sun_${sunR}`;
  bakeSun(scene, bg.keys.sun, sunR);
  bg.ownedTextures.add(bg.keys.sun);

  bg.keys.moon = `bg_moon_${moonR}`;
  bakeMoon(scene, bg.keys.moon, moonR);
  bg.ownedTextures.add(bg.keys.moon);

  bg.keys.stars = `bg_stars_${w}x${h}`;
  bakeStars(scene, bg.keys.stars, w, h);
  bg.ownedTextures.add(bg.keys.stars);

  bg.keys.clouds = [
    `bg_cloud_a_${w}`,
    `bg_cloud_b_${w}`,
    `bg_cloud_c_${w}`
  ];
  const cloudSizes = [[90, 46, 0.82], [66, 34, 0.72], [124, 60, 0.9]];
  bg.keys.clouds.forEach((key, i) => {
    const [cw, ch, alpha] = cloudSizes[i];
    bakeCloud(scene, key, cw, ch, alpha);
    bg.ownedTextures.add(key);
  });
}

/** Ставит запечённые текстуры на уже созданные Image. */
function applyTextures(bg, w, h) {
  bg.skyImage.setTexture(bg.keys.sky[bg.phase || 'day']);
  bg.hills.forEach((hillsImage, i) => hillsImage.setTexture(bg.keys.hills[i]));
  bg.sun.setTexture(bg.keys.sun);
  bg.moon.setTexture(bg.keys.moon);
  bg.stars.setTexture(bg.keys.stars);
  bg.clouds.forEach((cloud, i) => {
    cloud.setTexture(bg.keys.clouds[i]);
    cloud.setPosition(bg.cloudStartX[i] ?? -120, bg.cloudY[i] ?? h * 0.12);
  });
}

/**
 * Создаёт фон и возвращает объект состояния для updateSky.
 */
export function drawBackground(scene) {
  const cam = scene.cameras.main;
  const w = Math.max(1, Math.round(cam.width));
  const h = Math.max(1, Math.round(cam.height));

  const bg = {
    scene,
    W: w,
    H: h,
    phase: 'day',
    weather: 'sunny',
    ownedTextures: new Set(),
    keys: { sky: {}, hills: [], clouds: [] },
    cloudStartX: [-120, w * 0.42, w * 0.72],
    cloudY: [h * 0.10, h * 0.15, h * 0.05]
  };

  rebuildTextures(bg, w, h);

  // --- слои, снизу вверх ---
  bg.skyImage = scene.add.image(0, 0, bg.keys.sky.day)
    .setOrigin(0).setDisplaySize(w, h).setDepth(DS.depth.bg);

  bg.hills = bg.keys.hills.map((key) => scene.add.image(0, 0, key)
    .setOrigin(0).setDisplaySize(w, h).setDepth(DS.depth.bg + 2));

  bg.stars = scene.add.image(0, 0, bg.keys.stars)
    .setOrigin(0).setDisplaySize(w, h * 0.55).setDepth(DS.depth.bg + 4).setAlpha(0);

  bg.sun = scene.add.image(w * 0.85, h * 0.15, bg.keys.sun)
    .setOrigin(0.5).setDepth(DS.depth.bg + 5);
  bg.moon = scene.add.image(w * 0.15, h * 0.15, bg.keys.moon)
    .setOrigin(0.5).setDepth(DS.depth.bg + 5).setAlpha(0);

  bg.clouds = bg.keys.clouds.map((key, i) => {
    const cloud = scene.add.image(bg.cloudStartX[i], bg.cloudY[i], key)
      .setOrigin(0).setDepth(DS.depth.bg + 3);
    const duration = 44000 + i * 13000;
    scene.tweens.add({
      targets: cloud,
      x: w + 160,
      duration,
      repeat: -1,
      onRepeat: () => { cloud.x = -160; }
    });
    return cloud;
  });

  // Совместимость со старым кодом: skyContainer и sky ссылаются на слой неба.
  bg.skyContainer = bg.skyImage;
  bg.sky = bg.skyImage;

  return bg;
}

/** Пересобирает фон под новый размер экрана (вызывается из handleResize). */
export function resizeBackground(bg) {
  if (!bg) return;
  const cam = bg.scene.cameras.main;
  const w = Math.max(1, Math.round(cam.width));
  const h = Math.max(1, Math.round(cam.height));
  if (w === bg.W && h === bg.H) return;

  bg.W = w;
  bg.H = h;
  bg.cloudStartX = [-120, w * 0.42, w * 0.72];
  bg.cloudY = [h * 0.10, h * 0.15, h * 0.05];

  rebuildTextures(bg, w, h);
  applyTextures(bg, w, h);

  bg.skyImage.setDisplaySize(w, h);
  for (const hillsImage of bg.hills) hillsImage.setDisplaySize(w, h);
  bg.stars.setDisplaySize(w, h * 0.55);
}

/**
 * Плавно анимирует солнце/луну/звёзды по небу в зависимости от фазы дня.
 * Текстуры не перерисовываются: меняется только выбранная картинка неба.
 *
 * Оптимизация: твины и подмена текстуры запускаются только при смене фазы/погоды,
 * а не при каждом тике мира.
 */
export function updateSky(scene, bg, world) {
  if (!bg || !world) return;

  const phase = world.phase?.id || 'day';
  const weatherId = world.weather?.id || 'sunny';
  const isBadWeather = ['rain', 'fog', 'cloudy'].includes(weatherId);

  if (bg._lastPhase === phase && bg._lastWeather === weatherId && bg._skyTweensRunning) return;

  const W = bg.W;
  const H = bg.H;

  // Целевые позиции солнца по фазе (x, y в долях W/H)
  let sunX = 0.85, sunY = 0.15;
  let moonX = 0.15, moonY = 0.15;
  let sunAlpha = 1, moonAlpha = 0, starsAlpha = 0;

  if (phase === 'morning') {
    sunX = 0.30; sunY = 0.25;
  } else if (phase === 'day') {
    sunX = 0.85; sunY = 0.15;
  } else if (phase === 'evening') {
    sunX = 0.92; sunY = 0.35;
    sunAlpha = isBadWeather ? 0 : 0.6;
    moonAlpha = 0.4;
    starsAlpha = 0.1;
  } else if (phase === 'night') {
    sunAlpha = 0;
    moonAlpha = 1;
    starsAlpha = isBadWeather ? 0.2 : 1;
  }

  // Погода скрывает светила
  if (isBadWeather && phase !== 'night') {
    sunAlpha = 0;
    moonAlpha = 0.2;
    starsAlpha = 0;
  }

  const { sun, moon, stars } = bg;
  scene.tweens.killTweensOf(sun);
  scene.tweens.killTweensOf(moon);
  scene.tweens.killTweensOf(stars);

  scene.tweens.add({
    targets: sun,
    x: W * sunX, y: H * sunY,
    alpha: sunAlpha,
    duration: 3000, ease: 'Sine.easeInOut'
  });
  scene.tweens.add({
    targets: moon,
    x: W * moonX, y: H * moonY,
    alpha: moonAlpha,
    duration: 3000, ease: 'Sine.easeInOut'
  });
  scene.tweens.add({
    targets: stars,
    alpha: starsAlpha,
    duration: 3000, ease: 'Sine.easeInOut'
  });

  bg._lastPhase = phase;
  bg._lastWeather = weatherId;
  bg._skyTweensRunning = true;

  // Небо: одна подмена текстуры на фазу, без перерисовки градиента.
  if (bg.phase !== phase) {
    bg.phase = phase;
    bg.skyImage.setTexture(bg.keys.sky[phase]);
  }
}