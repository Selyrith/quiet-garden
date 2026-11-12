/**
 * Единая система позиционирования Quiet Garden.
 *
 * Один источник правды для всей раскладки: верхняя панель, игровое поле,
 * панель инструментов, полка инвентаря, боковые кнопки, подсказки.
 *
 * Принцип: ни один элемент не считает свои координаты сам. Он спрашивает
 * `computeLayout(width, height)` и подставляет готовые числа. Поэтому
 * `create()` и `handleResize()` физически не могут разъехаться — оба
 * читают один и тот же результат.
 *
 * Модель — «полосы снизу вверх»: нижний стек (полка → инструменты →
 * ряд боковых кнопок) занимает место от низа экрана, сетка получает
 * ВЕСЬ остаток и вписывается в него. Остаток, а не наоборот: иначе на
 * 320x568 сетка выдавливает тулбар за экран.
 *
 * Модуль чистый: без импорта Phaser и без обращения к `window`.
 * Раскладка тестируется в `node --test` на любых размерах экрана.
 */

import { DS } from './DesignSystem.js';

/** Границы раскладки. Менять только здесь. */
export const LAYOUT = {
  /** размер клетки; 42 — историческая база (8*42 = 336) */
  tileMin: 22,
  tileBase: 42,
  tileMax: 48,

  /** верхняя панель */
  hudMin: 56,
  hudMax: 76,
  hudRatio: 0.085,
    /** ниже этой ширины верхняя панель переходит в компактный режим */
    hudCompactW: 480,

  /** полка инвентаря */
  shelfH: 72,
  shelfHSmall: 64,    // при высоте экрана < 620
  smallScreenH: 620,

  /** панель инструментов */
  toolSize: 56,
  toolSizeNarrow: 48, // при ширине экрана < 360
  narrowScreenW: 360,
  toolGap: 8,

  /** боковые кнопки: рельса справа на широких, строка над тулбаром на узких */
  sideSize: 40,
  sideStep: 48,
  railW: 52,
  railMinW: 560,

  /** отступы */
  marginMin: 8,
  marginMax: 16,

  /** зазор между полосами нижнего стека */
  stackGap: 8,

  /** указатель сада над сеткой */
  signpostH: 24,
  signpostGap: 8,

  /** подсказка над панелью инструментов */
  hintAboveTool: 14,
};

export function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

/**
 * Полная раскладка для экрана w x h.
 * @param {number} w ширина канваса
 * @param {number} h высота канваса
 */
export function computeLayout(w, h) {
  const margin = clamp(Math.round(w * 0.02), LAYOUT.marginMin, LAYOUT.marginMax);

  // --- верхняя панель ---
  const hudH = clamp(Math.round(h * LAYOUT.hudRatio), LAYOUT.hudMin, LAYOUT.hudMax);
  const hudCompact = w < LAYOUT.hudCompactW;
  const hudPad = hudCompact ? 8 : 12;
  const hudBtn = hudCompact ? 40 : 48;
  const hudBtnGap = hudCompact ? 6 : 8;
  const coinsW = hudCompact ? 64 : 100;
  const coinsX = hudCompact ? 8 : 16;
  const roomW = hudCompact ? 76 : 100;
  const roomX = coinsX + coinsW + (hudCompact ? 6 : 12);
  const muteX = w - hudPad - hudBtn / 2;
  const menuX = muteX - hudBtn - hudBtnGap;
  // Мир/сезон центрируем в свободном промежутке, а не по центру экрана:
  // иначе на 320 px надпись наезжает на код комнаты.
  const worldX = hudCompact ? (roomX + roomW + menuX - hudBtn / 2) / 2 : w / 2;

  const hud = {
    w, h: hudH, compact: hudCompact, pad: hudPad, btn: hudBtn, y: hudH / 2,
    coins: { x: coinsX, w: coinsW },
    room: { x: roomX, w: roomW },
    world: { x: worldX, y: hudH / 2 },
    mute: { x: muteX, y: hudH / 2 },
    menu: { x: menuX, y: hudH / 2 },
  };

  // --- полосы нижнего стека, снизу вверх ---
  const bands = [];
  let bottom = h - margin;

  const shelfH = h < LAYOUT.smallScreenH ? LAYOUT.shelfHSmall : LAYOUT.shelfH;
  const inventory = { y: bottom - shelfH, h: shelfH, bottom };
  bands.push({ key: 'inventory', y: inventory.y, h: shelfH });
  bottom = inventory.y;

  const toolSize = w < LAYOUT.narrowScreenW ? LAYOUT.toolSizeNarrow : LAYOUT.toolSize;
  bottom -= LAYOUT.stackGap;
  const toolBottom = bottom;
  const toolY = toolBottom - toolSize / 2;
  bands.push({ key: 'toolbar', y: toolBottom - toolSize, h: toolSize });
  bottom = toolBottom - toolSize;

  // --- боковые кнопки ---
  const rail = w >= LAYOUT.railMinW ? LAYOUT.railW : 0;
  const sideMode = rail > 0 ? 'rail' : 'row';
  let side;

  if (sideMode === 'rail') {
    // Cчитаем после сетки — рельса центрируется по игровому полю.
    side = { mode: sideMode, rail, x: w - margin - rail / 2, size: LAYOUT.sideStep, step: 0 };
  } else {
    // На узком экране — компактный ряд над панелью инструментов.
    bottom -= LAYOUT.stackGap;
    const rowY = bottom - LAYOUT.sideSize;
    bands.push({ key: 'sideRow', y: rowY, h: LAYOUT.sideSize });
    bottom = rowY;
    const rowCenterY = rowY + LAYOUT.sideSize / 2;
    side = {
      mode: sideMode,
      rail: 0,
      x: w / 2,
      size: LAYOUT.sideSize,
      step: LAYOUT.sideStep,
      y: rowCenterY,
      // Три кнопки в ряд: эмодзи, наблюдение, питомец
      emoteY: rowCenterY,
      watchY: rowCenterY,
      petY: rowCenterY,
      emoteX: w / 2 - LAYOUT.sideStep,
      watchX: w / 2,
      petX: w / 2 + LAYOUT.sideStep,
    };
  }

  // --- игровое поле: весь остаток между HUD и нижним стеком ---
  const gridTopReserve = hudH + LAYOUT.stackGap + LAYOUT.signpostGap + LAYOUT.signpostH;
  const gridBottomLimit = bottom - LAYOUT.stackGap;
  const availW = w - margin * 2 - rail;
  const availH = gridBottomLimit - gridTopReserve;

  const tileSize = clamp(
    Math.floor(Math.min(availW, Math.max(availH, 0)) / 8),
    LAYOUT.tileMin,
    LAYOUT.tileMax
  );

  const gridSize = tileSize * 8;
  const gridX = margin + Math.max(0, Math.floor((availW - gridSize) / 2));
  const gridY = Math.round(gridTopReserve + Math.max(0, (availH - gridSize) / 2));

  const grid = {
    tileSize,
    size: gridSize,
    x: gridX,
    y: gridY,
    right: gridX + gridSize,
    bottom: gridY + gridSize,
  };

  // --- указатель сада ---
  const signpost = {
    w: Math.min(200, grid.size),
    h: LAYOUT.signpostH,
    x: grid.x + grid.size / 2,
    y: grid.y - LAYOUT.signpostGap - LAYOUT.signpostH,
  };

  // --- рельса: центрируем stack по высоте игрового поля ---
  if (side.mode === 'rail') {
    const centerY = (grid.y + grid.bottom) / 2;
    side.step = LAYOUT.sideStep;
    side.petY = centerY - LAYOUT.sideStep;
    side.watchY = centerY;
    side.emoteY = centerY + LAYOUT.sideStep;
    side.size = 28;
  } else {
    side.petY = side.watchY = side.emoteY = side.y;
  }

  // --- подсказка ---
  const hintY = clamp(toolY - toolSize / 2 - LAYOUT.hintAboveTool, grid.bottom + 18, h - 60);

  return {
    w, h, margin, hudH, rail,
    hud,
    grid,
    signpost,
    toolbar: { y: toolY, size: toolSize, gap: LAYOUT.toolGap, bottom: toolBottom },
    inventory,
    side,
    hintY,
    /** табло Mannschaft над сеткой: под верхней панель */
    toastY: hudH + 12,
    bands,
  };
}

/**
 * Горизонтальный ряд равных кнопок по центру.
 * @returns {{x:number,y:number}[]} центр каждой кнопки
 */
export function rowCenters(count, centerX, y, size, gap = LAYOUT.toolGap) {
  const total = count * size + (count - 1) * gap;
  const startX = centerX - total / 2 + size / 2;
  return Array.from({ length: count }, (_, i) => ({ x: startX + i * (size + gap), y }));
}

/**
 * Прямоугольник слота на полке инвентаря.
 */
export function shelfSlotRect(index, layout, slotW, slotGap, pageWidth) {
  return {
    x: (layout.w - pageWidth) / 2 + index * (slotW + slotGap),
    y: layout.inventory.y,
    w: slotW,
    h: layout.inventory.h,
  };
}