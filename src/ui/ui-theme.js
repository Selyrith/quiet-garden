export const UI = {
  // Палитра (природа, мягкие земляные тона)
  woodDark: 0x5c4a3a,
  woodMid: 0x8e7b63,
  woodLight: 0xd8cebd,
  woodHi: 0xc9a884,
  parchment: 0xf8f4ee,
  textDark: 0x5c4a3a,
  textLight: 0xffffff,
  textSecondary: 0x8e7b63,
  gold: 0xd8a494,
  goldHi: 0xe8c3a8,
  leaf: 0xa8d593,
  leafDark: 0x9bc48c,
  error: 0xcb8a6b,

  // Акцентные кнопки — выделяются на фоне
  btnPrimary: 0xd8a494,
  btnPrimaryHi: 0xc9a884,
  btnSecondary: 0xb8c4a6,

  // Единая цветовая система для всех кнопок и плашек (UI_REDESIGN_SPEC.md)
  UNIFIED: {
    color: 0xd8a494,
    colorHi: 0xe8c3a8,
    colorLo: 0xc9a884,
    colorDisabledAlpha: 0.4,
    text: '#ffffff',
    minTouch: 44,
    radius: 12,
    secondary: 0x8e7b63,
    secondaryText: '#ffffff',
    error: 0xcb8a6b,
    errorText: '#f8f4ee',
  },

  // Шрифты
  fontTitle: 'Nunito, Georgia, serif',
  fontBody: 'Nunito, sans-serif',
  fontMono: 'monospace'
};

export function drawPanel(g, x, y, w, h, radius = 16, isParchment = true) {
  g.fillStyle(0x000000, 0.25);
  g.fillRoundedRect(x + 4, y + 6, w, h, radius); // Тень
  
  if (isParchment) {
    g.fillStyle(UI.parchment, 0.98);
    g.fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(2.5, UI.woodLight, 1);
    g.strokeRoundedRect(x, y, w, h, radius);
    g.lineStyle(1, UI.woodMid, 0.4);
    g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, radius - 2);
  } else {
    g.fillStyle(UI.woodDark, 0.98);
    g.fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(2, UI.woodHi, 0.85);
    g.strokeRoundedRect(x, y, w, h, radius);
  }
}

export function drawButton(g, x, y, w, h, color, isHover = false, isPressed = false) {
  const offset = isPressed ? 3 : 0;
  const baseColor = isPressed ? UI.woodDark : color;
  
  // Тень
  if (!isPressed) {
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(x, y + 4, w, h, 12);
  }
  
  // Тело кнопки
  g.fillStyle(baseColor, 1);
  g.fillRoundedRect(x, y + offset, w, h, 12);
  
  // Блик (если не нажата)
  if (!isPressed) {
    g.fillStyle(0xffffff, 0.15);
    g.fillRoundedRect(x + 4, y + 4, w - 8, h / 2 - 2, 8);
  }
  
  // Обводка
  g.lineStyle(2, isHover ? UI.gold : UI.woodHi, 1);
  g.strokeRoundedRect(x, y + offset, w, h, 12);
}