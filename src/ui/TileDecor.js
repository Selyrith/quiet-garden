/**
 * Вспомогательные функции оформления грядок:
 * трава на пустых грядках, капли воды на политых.
 * Используется из GameScene.drawGrid и GameSceneTiles.
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Рисует пучки травы на пустой грядке.
 * Позиция пучков детерминирована координатой тайла —
 * при перезагрузке трава выглядит одинаково.
 */
export function drawGrassTufts(scene, cx, cy, tileSize, seed) {
  const g = scene.add.graphics().setDepth(2);
  g.setPosition(cx, cy);
  const rng = mulberry32(seed * 31 + 1);
  const count = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    const px = (rng() - 0.5) * tileSize * 0.65;
    const py = (rng() - 0.1) * tileSize * 0.4;
    const h = 3 + Math.floor(rng() * 4);
    g.fillStyle(0x3d8b37, 0.85);
    g.fillRect(px - 1, py - h, 2, h);
    g.fillStyle(0x4caf50, 0.75);
    g.fillRect(px, py - h + 1, 1, h - 1);
  }

  // Ветер: фаза общая для всего сада (не своя у каждой травинки) — тогда
  // это читается как порыв, а не как случайный шум. Лёгкий разброс фазы
  // по координате тайла сохраняет естественность.
  g._windPhase = (seed * 0.37) % (Math.PI * 2);
  g._windAmp = 1.4 + (seed % 7) * 0.22;

  return g;
}

/**
 * Обновляет покачивание травы на ветру (вызывать из update цикла).
 *
 * Ветер — медленная огибающая (порывы) поверх общего синуса:
 *   gust = 0.55 + 0.45 * sin(t * 0.31)   — сила порыва
 *   sway = sin(t * 1.4 + phase) * amp * gust
 * Перед старой версией: у каждой травинки была своя случайная скорость,
 * и сад «шумел», а не «дышал».
 */
export function updateGrassWind(scene, tiles, delta) {
  const t = scene.time.now / 1000;
  const gust = 0.55 + 0.45 * Math.sin(t * 0.31);
  for (const [, tile] of tiles) {
    const g = tile.grassGfx;
    if (!g) continue;
    const sway = Math.sin(t * 1.4 + g._windPhase) * g._windAmp * gust;
    g.x = sway;
  }
}

/**
 * Полупрозрачный синий оверлей с каплями — визуальный индикатор полива.
 * Изначально невидим; показывается через updateWetOverlay.
 */
export function createWetOverlay(scene, localX, localY, tileSize, seed = 0) {
  const container = scene.add.container(localX, localY).setDepth(3);
  const bg = scene.add.rectangle(0, 0, tileSize - 4, tileSize - 4, 0x3d8b9e, 0.22);
  container.add(bg);

  const droplets = scene.add.graphics();
  const rng = mulberry32(seed * 41 + 7);
  for (let i = 0; i < 4; i++) {
    const dx = (rng() - 0.5) * tileSize * 0.7;
    const dy = (rng() - 0.5) * tileSize * 0.6;
    const r = 1.5 + rng() * 1;
    droplets.fillStyle(0x9cd4ff, 0.85);
    droplets.fillCircle(dx, dy, r);
    droplets.fillStyle(0xffffff, 0.9);
    droplets.fillCircle(dx - 0.5, dy - 0.5, r * 0.35);
  }
  container.add(droplets);

  container.setAlpha(0).setVisible(false);
  return container;
}
