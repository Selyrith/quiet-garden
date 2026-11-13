/**
 * Рамка сада, дорожки и полоса-«платформа» под декор — одна запечённая текстура.
 *
 * Почему полоса (band): декор (пруд, фонари, скамейка, кустики) нельзя ставить
 * внутри квадрата сетки — 64 непрозрачные грядки его перекрывают. Поэтому вокруг
 * грядок рисуется деревянная платформа: узкие поля слева/справа и широкая
 * полоса снизу (там между сеткой и нижним стеком HUD реально есть место).
 * Ширины считает `computeDecorBands` из фактического свободного места, чтобы
 * на узком телефоне платформа не ушла за край экрана.
 *
 * До этого рамка рисовалась `Graphics` один раз в абсолютных координатах: при
 * ресайзе `rebuildGridLayout()` двигал только прямоугольник, а линии дорожек
 * оставались на старых местах — сетка «разъезжалась». Теперь это текстура,
 * привязанная к размеру сетки, и Image, который просто масштабируется.
 *
 * Приёмы: design/reference/web/GAME-REFS.md §2 (drop shadows), §3 (ambient occlusion);
 * design/reference/web/TECHNIQUES.md A3/A5.
 */

import { DS } from './DesignSystem.js';
import { LAYOUT } from './Layout.js';
import { bakeTexture, hexColor } from './BakeTexture.js';

/** Тень вокруг платформы: место под мягкое затемнение. */
export const GARDEN_FRAME_SHADOW = 14;

/** Детерминированный ГПСЧ: деталь мира не «дрожит» между перезапусками. */
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

/** Верхняя граница нижнего стека HUD (панель инструментов / ряд кнопок). */
function bottomStackTop(layout) {
  let top = layout.h - layout.margin;
  for (const band of layout.bands) {
    if (typeof band.y === 'number') top = Math.min(top, band.y);
  }
  return top;
}

/**
 * Ширины полос платформы вокруг грядок.
 *
 * @param {object} layout результат computeLayout
 * @returns {{side: number, bottom: number}}
 */
export function computeDecorBands(layout) {
  const g = layout.grid;
  const tile = g.tileSize;

  const left = Math.max(0, g.x - layout.margin);
  const right = Math.max(0, layout.w - layout.margin - g.right);
  const bottomRoom = Math.max(0, bottomStackTop(layout) - g.bottom - LAYOUT.stackGap);

  // Боковые поля узкие (на телефоне это просто центровка сетки),
  // но их хватает на фонарь/кустик.
  const side = Math.max(0, Math.min(Math.round(tile * 0.45), Math.floor(Math.min(left, right)) - 1));
  // Снизу места заметно больше — там живут пруд и скамейка.
  const bottom = Math.max(0, Math.min(Math.round(tile * 1.5), Math.floor(bottomRoom)));

  return { side, bottom };
}

/**
 * Запекает платформу: внешняя тень, деревянный бортик, полосы декора,
 * земляная подложка под грядками, дорожки.
 *
 * @param {Phaser.Scene} scene
 * @param {number} size размер сетки в пикселях (tileSize * 8)
 * @param {{side?: number, bottom?: number}} bands ширины полос декора
 * @returns {{key: string, totalW: number, totalH: number, bands: {side:number,bottom:number}}}
 */
export function bakeGardenFrame(scene, size, bands = {}) {
  // Округляем до чётного, чтобы не плодить текстуры на каждый пиксель ресайза.
  const gridSize = Math.max(16, Math.round(size / 2) * 2);
  const side = Math.max(0, Math.round(bands.side || 0));
  const bottom = Math.max(0, Math.round(bands.bottom || 0));

  const innerW = gridSize + side * 2;
  const innerH = gridSize + bottom; // сверху полосы нет: там указатель сада
  const totalW = innerW + GARDEN_FRAME_SHADOW * 2;
  const totalH = innerH + GARDEN_FRAME_SHADOW * 2;
  const key = `garden_frame_${gridSize}_${side}_${bottom}`;

  // Тёплая деревянная платформа в тон почве: по референсу (Stardew Valley,
  // Garden Story) всё поле — единая тёплая масса, а не чёрная плита.
  const boost = (hex, k) => {
    const r = Math.min(255, Math.round(((hex >> 16) & 0xFF) * k));
    const g2 = Math.min(255, Math.round(((hex >> 8) & 0xFF) * k));
    const b = Math.min(255, Math.round((hex & 0xFF) * k));
    return (r << 16) | (g2 << 8) | b;
  };
  const frameDark = boost(hexColor(DS.colors.garden.soilDark), 1.30);
  const frameWood = boost(hexColor(DS.colors.garden.soilLight), 1.35);
  const frameWoodDark = boost(hexColor(DS.colors.garden.fence), 1.25);
  const pathColor = hexColor(DS.colors.garden.path);
  const grass = hexColor(DS.colors.garden.grass);

  const x0 = GARDEN_FRAME_SHADOW;
  const y0 = GARDEN_FRAME_SHADOW;
  const gx = x0 + side;
  const gy = y0;
  const grid = 8;
  const cell = gridSize / grid;

  bakeTexture(scene, key, totalW, totalH, (g) => {
    // 1. Внешняя мягкая тень: платформа «стоит» на траве.
    g.fillStyle(frameDark, 0.10);
    g.fillRoundedRect(x0 - 8, y0 - 6, innerW + 16, innerH + 18, 26);
    g.fillStyle(frameDark, 0.18);
    g.fillRoundedRect(x0 - 4, y0 - 2, innerW + 8, innerH + 12, 20);

    // 2. Деревянный бортик платформы.
    g.fillStyle(frameWoodDark, 1);
    g.fillRoundedRect(x0 - 3, y0 - 3, innerW + 6, innerH + 6, 16);
    g.fillStyle(frameWood, 1);
    g.fillRoundedRect(x0 - 1, y0 - 1, innerW + 2, innerH + 2, 14);

    // 3. Полосы декора — приглушённая трава, на которой стоят объекты.
    if (side > 0 || bottom > 0) {
      g.fillStyle(grass, 0.5);
      g.fillRoundedRect(x0, y0, innerW, innerH, 12);
      // Тёплый переход к земляной подложке грядок.
      g.lineStyle(2, frameDark, 0.22);
      g.strokeRoundedRect(gx - 1, gy - 1, gridSize + 2, gridSize + 2, 10);
    }

    // 4. Земляная подложка под грядками.
    g.fillStyle(frameDark, 0.92);
    g.fillRoundedRect(gx, gy, gridSize, gridSize, 8);

    // 5. Свет сверху-слева, тень снизу-справа (объём платформы).
    g.lineStyle(2, pathColor, 0.4);
    g.beginPath();
    g.moveTo(x0 + 8, y0 - 1);
    g.lineTo(x0 + innerW - 8, y0 - 1);
    g.strokePath();
    g.beginPath();
    g.moveTo(x0 - 1, y0 + 8);
    g.lineTo(x0 - 1, y0 + innerH - 8);
    g.strokePath();
    g.lineStyle(2, frameDark, 0.5);
    g.beginPath();
    g.moveTo(x0 + innerW - 8, y0 + innerH - 1);
    g.lineTo(x0 + 8, y0 + innerH - 1);
    g.strokePath();

    // 6. Межи между грядками.
    //
    // БЫЛО: тонкие волосяные линии 1px alpha 0.2 — сетка читалась как
    // таблица, а 64 грядки сливались в одну тёмную плиту.
    // СТАЛО: настоящие борозды шириной 3px — тёмная канавка + светлая
    // кромка сверху (свет падает сверху-слева), плюс тень под каждой
    // межевой линией. Грядки читаются как отдельные вспаханные полосы.
    const GROOVE = 3;
    for (let i = 1; i < grid; i++) {
      const line = Math.round(i * cell);

      // Тень от предыдущей грядки на меже.
      g.fillStyle(frameDark, 0.55);
      g.fillRect(gx + line - GROOVE / 2, gy, GROOVE, gridSize);

      // Канавка: тёмная полоса.
      g.fillStyle(0x2C1B10, 0.5);
      g.fillRect(gx + line - GROOVE / 2, gy, GROOVE, gridSize);
      g.fillRect(gx, gy + line - GROOVE / 2, gridSize, GROOVE);

      // Светлая кромка по верхнему/левому краю межи — объём.
      g.fillStyle(pathColor, 0.28);
      g.fillRect(gx + line - GROOVE / 2, gy, 1, gridSize);
      g.fillRect(gx, gy + line - GROOVE / 2, gridSize, 1);
    }
    g.lineStyle(2, hexColor(DS.colors.brand.secondary), 0.28);
    g.strokeRoundedRect(gx - 1, gy - 1, gridSize + 2, gridSize + 2, 8);

    // 7. Поле «утоплено»: тень по верхнему краю и подсветка по нижнему.
    g.fillGradientStyle(frameDark, frameDark, frameDark, frameDark, 0.35, 0.35, 0, 0);
    g.fillRect(gx, gy, gridSize, Math.max(6, cell * 0.18));
    g.fillGradientStyle(pathColor, pathColor, pathColor, pathColor, 0, 0, 0.16, 0.16);
    g.fillRect(gx, gy + gridSize - Math.max(5, cell * 0.14), gridSize, Math.max(5, cell * 0.14));

    // 8. Жизнь вокруг грядок: трава, камешки, мелкие цветы.
    //    Всё рисуется В ПРЕДЕЛАХ уже выделенных полос (side / bottom),
    //    поэтому раскладка и позиции декора не меняются.
    const detailBands = [];
    if (side > 0) {
      detailBands.push([x0 + 2, y0 + 8, side - 4, innerH - 16]);
      detailBands.push([x0 + innerW - side + 2, y0 + 8, side - 4, innerH - 16]);
    }
    if (bottom > 8) detailBands.push([x0 + 10, y0 + gridSize + 4, innerW - 20, bottom - 8]);

    const rng = mulberry32(1000 + Math.round(gridSize) + side * 7 + bottom * 13);
    const grassDark = hexColor(DS.colors.garden.grass);

    for (const [bx, by, bw, bh] of detailBands) {
      if (bw <= 6 || bh <= 6) continue;

      // Травинки: пучки по 3 линии.
      const tufts = Math.max(6, Math.round((bw * bh) / 1400));
      for (let i = 0; i < tufts; i++) {
        const tx = bx + rng() * bw;
        const ty = by + rng() * bh;
        g.lineStyle(1.6, grassDark, 0.55);
        for (let k = -1; k <= 1; k++) {
          g.beginPath();
          g.moveTo(tx + k * 2.2, ty);
          g.lineTo(tx + k * 3.4, ty - 5 - rng() * 3);
          g.strokePath();
        }
      }

      // Камешки: сплюснутый эллипс + светлая кромка сверху.
      const pebbles = Math.max(3, Math.round((bw * bh) / 5200));
      for (let i = 0; i < pebbles; i++) {
        const px = bx + rng() * bw;
        const py = by + rng() * bh;
        const r = 2 + rng() * 2.6;
        g.fillStyle(frameDark, 0.35);
        g.fillEllipse(px, py + 1, r * 2.2, r * 1.4);
        g.fillStyle(pathColor, 1);
        g.fillEllipse(px, py, r * 2, r * 1.3);
        g.fillStyle(0xFFFBF2, 0.55);
        g.fillEllipse(px - r * 0.25, py - r * 0.3, r * 0.9, r * 0.5);
      }

      // Мелкие цветы: 4 лепестка + сердцевина.
      const flowers = Math.max(1, Math.round((bw * bh) / 9000));
      const petals = [0xE8A2B8, 0xE8C55A, 0xA7C9E8, 0xE59A6B];
      for (let i = 0; i < flowers; i++) {
        const fx = bx + 4 + rng() * Math.max(1, bw - 8);
        const fy = by + 4 + rng() * Math.max(1, bh - 8);
        const petal = petals[Math.floor(rng() * petals.length)];
        const pr = 1.8 + rng() * 0.9;
        g.fillStyle(petal, 0.95);
        for (let k = 0; k < 4; k++) {
          const a = (Math.PI / 2) * k + 0.3;
          g.fillCircle(fx + Math.cos(a) * pr, fy + Math.sin(a) * pr, pr * 0.85);
        }
        g.fillStyle(0xFFF3B0, 1);
        g.fillCircle(fx, fy, pr * 0.6);
      }
    }
  });

  return { key, totalW, totalH, bands: { side, bottom } };
}

/**
 * Геометрия платформы в мировых координатах: где стоит декор.
 *
 * @param {object} layout
 * @param {{side:number,bottom:number}} bands
 * @returns {{left:number,top:number,width:number,height:number,centerX:number,centerY:number,bottomStripY:number,sideStripW:number}}
 */
export function decorGeometry(layout, bands) {
  const g = layout.grid;
  const left = g.x - bands.side;
  const top = g.y;
  const width = g.size + bands.side * 2;
  const height = g.size + bands.bottom;
  return {
    left,
    top,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
    bottomStripY: g.bottom + bands.bottom / 2,
    bottomStripH: bands.bottom,
    sideStripW: bands.side
  };
}
