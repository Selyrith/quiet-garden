/**
 * Токены UI в ДВУХ видах.
 *
 * `UI.woodDark` и т.п. — числа (0x...) для fillStyle/lineStyle в Graphics.
 * `UI.css.woodDark` — CSS-строки ('#...') для свойства `color` у Text.
 *
 * Раньше в `color:` подставляли числовой токен: Phaser получал 6048314 вместо
 * '#5c4a3a' и текст становился невидимым. Именно из-за этого пропадали
 * описания ролей и часть подписей.
 *
 * ПАЛИТРА: design/reference/DESIGN-SPEC.md (Dawnfield, Hay Day–inspired).
 * Forest #3D7A52 / Wheat #E8C55A / Terracotta #C2654A / Earth #5C4532 /
 * Sky #7BBAD4 / Petal #D48EA3, фон Sunlit Cream #F7F1E6, карта #FCF8F0.
 * Ни чистого #000, ни чистого #FFF.
 */
const UI_HEX = {
  // Тёплые нейтрали (60%)
  woodDark: 0x3d2e20,    // Rich Soil — текст/контур
  woodMid: 0x5c4532,     // Earth — вторичный текст
  woodLight: 0xe6dccc,   // --border
  woodHi: 0xe8c55a,      // Wheat — акцент-обводка
  parchment: 0xf7f1e6,   // Sunlit Cream — базовый фон

  // Текст
  textDark: 0x3d2e20,    // Rich Soil
  textLight: 0xfcf8f0,   // Sunlit Card (не #FFF)
  textSecondary: 0x5c4532, // Earth
  textMuted: 0x8a7a66,

  // Зелень (30%)
  leaf: 0x3d7a52,        // Forest
  leafDark: 0x356444,    // Forest dark (--ring)
  gold: 0xe8c55a,        // Wheat
  goldHi: 0xf0d585,      // Wheat светлее

  // Акценты (10%)
  error: 0xc2654a,       // Terracotta
  btnPrimary: 0x3d7a52,  // Forest
  btnPrimaryHi: 0x356444,
  btnSecondary: 0xe8c55a, // Wheat
};

const toCss = (hex) => '#' + hex.toString(16).padStart(6, '0');

export const UI = {
  /** CSS-строки для свойства `color` у Text. */
  css: Object.fromEntries(Object.entries(UI_HEX).map(([k, v]) => [k, toCss(v)])),
  // Палитра (Dawnfield: Forest / Wheat / Terracotta + тёплые нейтрали)
  woodDark: 0x3d2e20,
  woodMid: 0x5c4532,
  woodLight: 0xe6dccc,
  woodHi: 0xe8c55a,
  parchment: 0xf7f1e6,
  textDark: 0x3d2e20,
  textLight: 0xfcf8f0,
  textSecondary: 0x5c4532,
  textMuted: 0x8a7a66,
  gold: 0xe8c55a,
  goldHi: 0xf0d585,
  leaf: 0x3d7a52,
  leafDark: 0x356444,
  error: 0xc2654a,

  // Акцентные кнопки — Forest, выделяется на тёплом фоне
  btnPrimary: 0x3d7a52,
  btnPrimaryHi: 0x356444,
  btnSecondary: 0xe8c55a,

  // Единая цветовая система для всех кнопок и плашек
  UNIFIED: {
    color: 0x3d7a52,
    colorHi: 0x356444,
    colorLo: 0x2c5438,
    colorDisabledAlpha: 0.4,
    text: '#fcf8f0',
    minTouch: 56,
    radius: 16,
    secondary: 0xe8c55a,
    secondaryText: '#3d2e20',
    error: 0xc2654a,
    errorText: '#fcf8f0',
  },

  // Шрифты: Lilita One (display) + Nunito (body)
  fontTitle: "'Lilita One', 'Fredoka One', 'Nunito', cursive",
  fontBody: "'Nunito', 'Quicksand', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
};

export function drawPanel(g, x, y, w, h, radius = 24, isParchment = true) {
  // Многослойная тёплая тень вместо плоской: отделяет панель от фона.
  g.fillStyle(0x5c4532, 0.08);
  g.fillRoundedRect(x + 2, y + 10, w, h, radius);
  g.fillStyle(0x5c4532, 0.12);
  g.fillRoundedRect(x + 1, y + 5, w, h, radius);

  if (isParchment) {
    // Панель: Sunlit Card + светлая кромка сверху (объём).
    g.fillStyle(UI.parchment, 1);
    g.fillRoundedRect(x, y, w, h, radius);
    // Верхний блик — «лист бумаги» лежит на столе.
    g.fillStyle(0xfffdf8, 0.55);
    g.fillRoundedRect(x + 3, y + 3, w - 6, Math.min(28, h / 3), radius - 3);
    // Контур: заметный, но не чёрный.
    g.lineStyle(2, UI.woodLight, 1);
    g.strokeRoundedRect(x, y, w, h, radius);
  } else {
    g.fillStyle(UI.woodDark, 0.98);
    g.fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(2, UI.woodHi, 0.85);
    g.strokeRoundedRect(x, y, w, h, radius);
  }
}

export function drawButton(g, x, y, w, h, color, isHover = false, isPressed = false) {
  const offset = isPressed ? 2 : 0;   // «вдавленная доска»: 2px внутрь
  const baseColor = isPressed ? UI.woodMid : color;

  // Тёплая тень (не чёрная)
  if (!isPressed) {
    g.fillStyle(0x5c4532, 0.22);
    g.fillRoundedRect(x, y + 4, w, h, 16);
  }

  // Тело кнопки
  g.fillStyle(baseColor, 1);
  g.fillRoundedRect(x, y + offset, w, h, 16);

  // Блик (если не нажата)
  if (!isPressed) {
    g.fillStyle(0xfffdf8, 0.15);
    g.fillRoundedRect(x + 4, y + 4, w - 8, h / 2 - 2, 12);
  }

  // Обводка: тёплое янтарное кольцо на hover/focus — не синее
  g.lineStyle(2, isHover ? UI.gold : UI.woodLight, 1);
  g.strokeRoundedRect(x, y + offset, w, h, 16);
}