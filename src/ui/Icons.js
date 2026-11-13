import { bakeTexture } from './BakeTexture.js';
import { DS } from './DesignSystem.js';

/**
 * Иконки интерфейса — нарисованы кодом, а не эмодзи.
 *
 * Почему: эмодзи выглядят по-разному в каждом браузере и ОС (на Android —
 * Noto, на iOS — Apple, на Windows — Segoe), не принимают цвет темы, «прыгают»
 * по базовой линии и выглядят как вставка из мессенджера. Для игры нужен
 * единый набор с тёмным контуром — тем же приёмом, что и у растений
 * (см. PlantTextureFactory: у каждого объекта тёмный контур).
 *
 * Все иконки пекутся один раз в текстуры 64×64 и дальше используются как
 * обычные Image — дёшево и одинаково на всех устройствах.
 */

const SIZE = 64;

/** Ключи текстур. */
export const ICON = {
  seed: 'ui-icon-seed',
  water: 'ui-icon-water',
  harvest: 'ui-icon-harvest',
  hand: 'ui-icon-hand',
  coin: 'ui-icon-coin',
  menu: 'ui-icon-menu',
  sound: 'ui-icon-sound',
  soundOff: 'ui-icon-sound-off',
  emote: 'ui-icon-emote',
  book: 'ui-icon-book',
  goals: 'ui-icon-goals',
  roles: 'ui-icon-roles',
  settings: 'ui-icon-settings',
  close: 'ui-icon-close',
  plus: 'ui-icon-plus',
  eye: 'ui-icon-eye',
  paw: 'ui-icon-paw',
};

const INK = 0x2C1B10;      // контур
const CREAM = 0xFFF6E0;    // светлая кромка
const FOREST = 0x3D7A52;
const FOREST_D = 0x2C5438;
const GOLD = 0xE8C55A;
const GOLD_D = 0xC79E38;
const SOIL = 0x8A5A33;
const SKY = 0x7BBAD4;

/** Общий контур: рисуем фигуру чуть больше и тёмным — потом основную сверху. */
function withOutline(g, drawShape, grow = 2.5) {
  g.fillStyle(INK, 1);
  drawShape(g, grow);
  drawShape(g, 0);
}

function drawSeed(g, grow = 0) {
  // Земляной орешек + росток.
  withOutline(g, (gg, k) => {
    gg.fillStyle(k > 0 ? INK : SOIL, 1);
    gg.fillEllipse(SIZE / 2, SIZE * 0.66, SIZE * 0.34 + k * 2, SIZE * 0.42 + k * 2);
  });
  // Блик на орешке.
  g.fillStyle(0xC98A5A, 0.9);
  g.fillEllipse(SIZE * 0.42, SIZE * 0.58, SIZE * 0.1, SIZE * 0.14);
  // Стебель.
  g.lineStyle(4, INK, 1);
  g.beginPath();
  g.moveTo(SIZE / 2, SIZE * 0.46);
  g.lineTo(SIZE / 2, SIZE * 0.3);
  g.strokePath();
  g.lineStyle(2.5, FOREST, 1);
  g.beginPath();
  g.moveTo(SIZE / 2, SIZE * 0.46);
  g.lineTo(SIZE / 2, SIZE * 0.3);
  g.strokePath();
  // Два листа.
  g.fillStyle(INK, 1);
  g.fillEllipse(SIZE * 0.34, SIZE * 0.3, SIZE * 0.26, SIZE * 0.16);
  g.fillEllipse(SIZE * 0.66, SIZE * 0.26, SIZE * 0.26, SIZE * 0.16);
  g.fillStyle(FOREST, 1);
  g.fillEllipse(SIZE * 0.34, SIZE * 0.3, SIZE * 0.21, SIZE * 0.12);
  g.fillStyle(0x6FBF87, 1);
  g.fillEllipse(SIZE * 0.66, SIZE * 0.26, SIZE * 0.21, SIZE * 0.12);
}

function drawWater(g) {
  // Капля: контур, тело, блик.
  withOutline(g, (gg, k) => {
    gg.fillStyle(k > 0 ? INK : SKY, 1);
    gg.fillCircle(SIZE * 0.5, SIZE * 0.6, SIZE * 0.26 + k);
    gg.fillTriangle(
      SIZE * 0.5, SIZE * 0.2 - k,
      SIZE * 0.26 - k, SIZE * 0.6,
      SIZE * 0.74 + k, SIZE * 0.6,
    );
  });
  g.fillStyle(0xBFE3F2, 1);
  g.fillCircle(SIZE * 0.42, SIZE * 0.58, SIZE * 0.09);
  g.fillStyle(0xFFFFFF, 0.8);
  g.fillCircle(SIZE * 0.4, SIZE * 0.54, SIZE * 0.045);
}

function drawHarvest(g) {
  // Серп: изогнутое лезвие + рукоять.
  g.lineStyle(11, INK, 1);
  g.beginPath();
  g.arc(SIZE * 0.5, SIZE * 0.48, SIZE * 0.26, Math.PI * 1.05, Math.PI * 1.75, false);
  g.strokePath();
  g.lineStyle(6.5, 0xE4E4E4, 1);
  g.beginPath();
  g.arc(SIZE * 0.5, SIZE * 0.48, SIZE * 0.26, Math.PI * 1.05, Math.PI * 1.75, false);
  g.strokePath();
  // Рукоять.
  g.lineStyle(12, INK, 1);
  g.beginPath();
  g.moveTo(SIZE * 0.47, SIZE * 0.72);
  g.lineTo(SIZE * 0.38, SIZE * 0.88);
  g.strokePath();
  g.lineStyle(7, 0x96663F, 1);
  g.beginPath();
  g.moveTo(SIZE * 0.47, SIZE * 0.72);
  g.lineTo(SIZE * 0.38, SIZE * 0.88);
  g.strokePath();
  // Пучок колосьев у лезвия.
  g.fillStyle(GOLD, 1);
  for (let i = 0; i < 3; i++) {
    g.fillCircle(SIZE * (0.64 + i * 0.05), SIZE * (0.3 + i * 0.06), 3.4);
  }
}

function drawHand(g) {
  // Ладонь: округлый «блок» + четыре пальца + большой.
  withOutline(g, (gg, k) => {
    gg.fillStyle(k > 0 ? INK : 0xF2C9A0, 1);
    gg.fillRoundedRect(SIZE * 0.3 - k, SIZE * 0.4 - k, SIZE * 0.42 + k * 2, SIZE * 0.34 + k * 2, 9 + k);
    for (let i = 0; i < 4; i++) {
      gg.fillRoundedRect(
        SIZE * (0.31 + i * 0.1) - k,
        SIZE * 0.2 - k,
        SIZE * 0.085 + k * 2,
        SIZE * 0.26 + k * 2,
        5 + k,
      );
    }
    gg.fillRoundedRect(SIZE * 0.19 - k, SIZE * 0.44 - k, SIZE * 0.14 + k * 2, SIZE * 0.2 + k * 2, 7 + k);
  });
  g.fillStyle(0xFFE4C8, 0.9);
  g.fillRoundedRect(SIZE * 0.34, SIZE * 0.44, SIZE * 0.28, 8, 4);
}

function drawCoin(g) {
  withOutline(g, (gg, k) => {
    gg.fillStyle(k > 0 ? INK : GOLD, 1);
    gg.fillCircle(SIZE / 2, SIZE / 2, SIZE * 0.3 + k);
  });
  g.fillStyle(GOLD_D, 1);
  g.fillCircle(SIZE / 2, SIZE / 2, SIZE * 0.22);
  g.fillStyle(GOLD, 1);
  g.fillCircle(SIZE / 2, SIZE / 2, SIZE * 0.18);
  // Блик.
  g.fillStyle(0xFFF3B0, 0.95);
  g.fillEllipse(SIZE * 0.42, SIZE * 0.42, SIZE * 0.12, SIZE * 0.08);
  // «Зёрнышко» на монете.
  g.fillStyle(GOLD_D, 0.95);
  g.fillEllipse(SIZE / 2, SIZE / 2, SIZE * 0.07, SIZE * 0.11);
}

function drawMenu(g) {
  withOutline(g, (gg, k) => {
    gg.fillStyle(k > 0 ? INK : CREAM, 1);
    for (let i = 0; i < 3; i++) {
      gg.fillRoundedRect(SIZE * 0.26 - k, SIZE * (0.3 + i * 0.15) - k, SIZE * 0.48 + k * 2, SIZE * 0.08 + k * 2, 4 + k);
    }
  });
  g.fillStyle(0xD9C9B4, 1);
  for (let i = 0; i < 3; i++) {
    g.fillRoundedRect(SIZE * 0.28, SIZE * (0.3 + i * 0.15) + 1, SIZE * 0.44, SIZE * 0.03, 2);
  }
}

function drawSound(g, off = false) {
  withOutline(g, (gg, k) => {
    gg.fillStyle(k > 0 ? INK : CREAM, 1);
    gg.fillRect(SIZE * 0.22 - k, SIZE * 0.4 - k, SIZE * 0.14 + k * 2, SIZE * 0.2 + k * 2);
    gg.fillTriangle(
      SIZE * 0.36, SIZE * 0.4 - k,
      SIZE * 0.36, SIZE * 0.6 + k,
      SIZE * 0.54 + k, SIZE * 0.28 - k,
    );
    gg.fillTriangle(
      SIZE * 0.36, SIZE * 0.4 - k,
      SIZE * 0.54 + k, SIZE * 0.28 - k,
      SIZE * 0.54 + k, SIZE * 0.72 + k,
    );
    gg.fillTriangle(
      SIZE * 0.36, SIZE * 0.6 + k,
      SIZE * 0.54 + k, SIZE * 0.72 + k,
      SIZE * 0.36, SIZE * 0.6 + k,
    );
  });

  if (off) {
    g.lineStyle(5, 0xC2654A, 1);
    g.beginPath();
    g.moveTo(SIZE * 0.62, SIZE * 0.36);
    g.lineTo(SIZE * 0.84, SIZE * 0.64);
    g.moveTo(SIZE * 0.84, SIZE * 0.36);
    g.lineTo(SIZE * 0.62, SIZE * 0.64);
    g.strokePath();
  } else {
    g.lineStyle(4, INK, 1);
    g.beginPath();
    g.arc(SIZE * 0.54, SIZE * 0.5, SIZE * 0.14, -0.9, 0.9, false);
    g.strokePath();
    g.beginPath();
    g.arc(SIZE * 0.54, SIZE * 0.5, SIZE * 0.24, -0.9, 0.9, false);
    g.strokePath();
  }
}

function drawEmote(g) {
  withOutline(g, (gg, k) => {
    gg.fillStyle(k > 0 ? INK : CREAM, 1);
    gg.fillRoundedRect(SIZE * 0.18 - k, SIZE * 0.24 - k, SIZE * 0.64 + k * 2, SIZE * 0.42 + k * 2, 14 + k);
    gg.fillTriangle(
      SIZE * 0.36 - k, SIZE * 0.64,
      SIZE * 0.52 + k, SIZE * 0.64,
      SIZE * 0.3 - k, SIZE * 0.82 + k,
    );
  });
  // Три точки.
  g.fillStyle(0x8A7A66, 1);
  for (let i = -1; i <= 1; i++) {
    g.fillCircle(SIZE / 2 + i * SIZE * 0.14, SIZE * 0.45, 3.2);
  }
}

function drawBook(g) {
  withOutline(g, (gg, k) => {
    gg.fillStyle(k > 0 ? INK : FOREST, 1);
    gg.fillRoundedRect(SIZE * 0.2 - k, SIZE * 0.22 - k, SIZE * 0.6 + k * 2, SIZE * 0.58 + k * 2, 6 + k);
  });
  // Страница.
  g.fillStyle(CREAM, 1);
  g.fillRoundedRect(SIZE * 0.28, SIZE * 0.28, SIZE * 0.44, SIZE * 0.44, 3);
  g.lineStyle(1.5, 0xB8A98F, 1);
  for (let i = 0; i < 3; i++) {
    g.lineBetween(SIZE * 0.32, SIZE * (0.36 + i * 0.1), SIZE * 0.68, SIZE * (0.36 + i * 0.1));
  }
  // Закладка.
  g.fillStyle(0xC2654A, 1);
  g.fillRect(SIZE * 0.54, SIZE * 0.22, 6, SIZE * 0.2);
}

function drawGoals(g) {
  withOutline(g, (gg, k) => {
    gg.fillStyle(k > 0 ? INK : CREAM, 1);
    gg.fillRoundedRect(SIZE * 0.22 - k, SIZE * 0.24 - k, SIZE * 0.56 + k * 2, SIZE * 0.54 + k * 2, 8 + k);
  });
  // Щиток-зажим сверху.
  g.fillStyle(0x96663F, 1);
  g.fillRoundedRect(SIZE * 0.36, SIZE * 0.17, SIZE * 0.28, 10, 4);
  // Галочка.
  g.lineStyle(6, FOREST, 1);
  g.beginPath();
  g.moveTo(SIZE * 0.34, SIZE * 0.52);
  g.lineTo(SIZE * 0.46, SIZE * 0.64);
  g.lineTo(SIZE * 0.68, SIZE * 0.38);
  g.strokePath();
}

function drawRoles(g) {
  withOutline(g, (gg, k) => {
    gg.fillStyle(k > 0 ? INK : CREAM, 1);
    gg.fillCircle(SIZE * 0.5, SIZE * 0.36, SIZE * 0.16 + k);
    gg.fillEllipse(SIZE * 0.5, SIZE * 0.72, SIZE * 0.44 + k * 2, SIZE * 0.3 + k * 2);
  });
  g.fillStyle(GOLD, 1);
  // Шляпа садовника.
  g.fillEllipse(SIZE * 0.5, SIZE * 0.24, SIZE * 0.44, SIZE * 0.12);
  g.fillRoundedRect(SIZE * 0.36, SIZE * 0.12, SIZE * 0.28, 14, 6);
  g.fillStyle(FOREST, 1);
  g.fillRect(SIZE * 0.36, SIZE * 0.22, SIZE * 0.28, 4);
}

function drawSettings(g) {
  withOutline(g, (gg, k) => {
    gg.fillStyle(k > 0 ? INK : CREAM, 1);
    gg.fillCircle(SIZE / 2, SIZE / 2, SIZE * 0.2 + k);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 / 8) * i;
      gg.fillRoundedRect(
        SIZE / 2 + Math.cos(a) * SIZE * 0.26 - 4 - k,
        SIZE / 2 + Math.sin(a) * SIZE * 0.26 - 4 - k,
        8 + k * 2, 8 + k * 2, 2,
      );
    }
  });
  g.fillStyle(0x8A7A66, 1);
  g.fillCircle(SIZE / 2, SIZE / 2, SIZE * 0.09);
}

function drawClose(g) {
  g.lineStyle(9, INK, 1);
  g.beginPath();
  g.moveTo(SIZE * 0.32, SIZE * 0.32);
  g.lineTo(SIZE * 0.68, SIZE * 0.68);
  g.moveTo(SIZE * 0.68, SIZE * 0.32);
  g.lineTo(SIZE * 0.32, SIZE * 0.68);
  g.strokePath();
  g.lineStyle(5, CREAM, 1);
  g.beginPath();
  g.moveTo(SIZE * 0.32, SIZE * 0.32);
  g.lineTo(SIZE * 0.68, SIZE * 0.68);
  g.moveTo(SIZE * 0.68, SIZE * 0.32);
  g.lineTo(SIZE * 0.32, SIZE * 0.68);
  g.strokePath();
}

function drawPlus(g) {
  g.lineStyle(10, INK, 1);
  g.beginPath();
  g.moveTo(SIZE * 0.5, SIZE * 0.26);
  g.lineTo(SIZE * 0.5, SIZE * 0.74);
  g.moveTo(SIZE * 0.26, SIZE * 0.5);
  g.lineTo(SIZE * 0.74, SIZE * 0.5);
  g.strokePath();
  g.lineStyle(6, FOREST, 1);
  g.beginPath();
  g.moveTo(SIZE * 0.5, SIZE * 0.28);
  g.lineTo(SIZE * 0.5, SIZE * 0.72);
  g.moveTo(SIZE * 0.28, SIZE * 0.5);
  g.lineTo(SIZE * 0.72, SIZE * 0.5);
  g.strokePath();
}

function drawEye(g) {
  // Белок.
  withOutline(g, (gg, k) => {
    gg.fillStyle(k > 0 ? INK : CREAM, 1);
    gg.fillEllipse(SIZE / 2, SIZE / 2, SIZE * 0.62 + k * 2, SIZE * 0.4 + k * 2);
  });
  // Радужка + зрачок + блик.
  g.fillStyle(0x6B8E6B, 1);
  g.fillCircle(SIZE / 2, SIZE / 2, SIZE * 0.14);
  g.fillStyle(INK, 1);
  g.fillCircle(SIZE / 2, SIZE / 2, SIZE * 0.07);
  g.fillStyle(0xFFFFFF, 0.9);
  g.fillCircle(SIZE * 0.46, SIZE * 0.45, SIZE * 0.035);
  // Веко.
  g.lineStyle(3, INK, 0.85);
  g.beginPath();
  g.arc(SIZE / 2, SIZE / 2 + 2, SIZE * 0.31, Math.PI * 1.15, Math.PI * 1.85, false);
  g.strokePath();
}

function drawPaw(g) {
  withOutline(g, (gg, k) => {
    gg.fillStyle(k > 0 ? INK : 0xF2C9A0, 1);
    gg.fillEllipse(SIZE * 0.5, SIZE * 0.66, SIZE * 0.4 + k * 2, SIZE * 0.32 + k * 2);
    const toes = [[0.3, 0.4], [0.44, 0.32], [0.58, 0.32], [0.72, 0.4]];
    for (const [tx, ty] of toes) {
      gg.fillCircle(SIZE * tx, SIZE * ty, SIZE * 0.1 + k);
    }
  });
  g.fillStyle(0xFFE4C8, 0.85);
  g.fillEllipse(SIZE * 0.46, SIZE * 0.64, SIZE * 0.16, SIZE * 0.1);
}

/**
 * Запекает все иконки в текстуры. Вызывать один раз в GameScene.create().
 * Безопасно вызывать повторно — существующие текстуры пропускаются.
 */
export function bakeIcons(scene) {
  const defs = {
    [ICON.seed]: drawSeed,
    [ICON.water]: drawWater,
    [ICON.harvest]: drawHarvest,
    [ICON.hand]: drawHand,
    [ICON.coin]: drawCoin,
    [ICON.menu]: drawMenu,
    [ICON.sound]: (g) => drawSound(g, false),
    [ICON.soundOff]: (g) => drawSound(g, true),
    [ICON.emote]: drawEmote,
    [ICON.book]: drawBook,
    [ICON.goals]: drawGoals,
    [ICON.roles]: drawRoles,
    [ICON.settings]: drawSettings,
    [ICON.close]: drawClose,
    [ICON.plus]: drawPlus,
    [ICON.eye]: drawEye,
    [ICON.paw]: drawPaw,
  };

  for (const [key, draw] of Object.entries(defs)) {
    // Одна битая иконка не должна валить всю сцену: игра обязана запуститься.
    try {
      bakeTexture(scene, key, SIZE, SIZE, (g) => draw(g));
    } catch (e) {
      console.warn('[icons] не удалось запечь', key, e && e.message);
    }
  }

  return Object.keys(defs);
}

/** Размер иконки для кнопки заданного размера (визуальная доля). */
export function iconSizeFor(buttonSize, ratio = 0.52) {
  return Math.round(buttonSize * ratio);
}

/** Цвет-«подложка» для иконки: одинаковый на всех экранах. */
export const ICON_INK = INK;
export const ICON_CREAM = CREAM;
export const ICON_FOREST = FOREST;
export const ICON_GOLD = GOLD;
export const ICON_SKY = SKY;
export const ICON_SPACING = DS.spacing.sm;