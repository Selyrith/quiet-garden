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

  // Ветер: мягкое покачивание травы по синусу
  g._windPhase = Math.random() * Math.PI * 2;
  g._windSpeed = 0.5 + Math.random() * 0.5;
  g._windAmp = 2 + Math.random() * 3;

  return g;
}

/**
 * Обновляет покачивание травы на ветру (вызывать из update цикла).
 */
export function updateGrassWind(scene, tiles, delta) {
  const time = scene.time.now / 1000;
  for (const [, tile] of tiles) {
    const g = tile.grassGfx;
    if (!g) continue;
    const sway = Math.sin(time * g._windSpeed + g._windPhase) * g._windAmp;
    g.x = tile.rect.x + sway;
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
