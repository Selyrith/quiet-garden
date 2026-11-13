/**
 * Единая дизайн-система для Quiet Garden.
 * Все цвета, отступы, типографика, радиусы, тени — тут.
 * Использовать: import { DS } from './DesignSystem.js';
 *
 * ИСТОЧНИК ИСТИНЫ: design/reference/DESIGN-SPEC.md (Dawnfield UI/UX Spec,
 * Hay Day–inspired, mobile-first). Значения ниже — прямой перенос его токенов.
 * При расхождении старого кода с референсом правим код, а не референс.
 */

export const DS = {
  // === ЦВЕТА ===
  // Палитра Dawnfield. 60-30-10: 60% тёплые нейтрали, 30% зелень, 10% акценты.
  colors: {
    // Фоновые (Sunlit Cream / Rich Card — ни чистого белого, ни чёрного)
    bg: {
      primary:   '#F7F1E6',    // Sunlit Cream — базовый фон
      secondary: '#F1E8D8',    // на шаг темнее
      tertiary:  '#E4E7DC',    // --muted (приглушённая поверхность)
      elevated:  '#FCF8F0',    // --card / --popover
    },
    // Оверлеи
    overlay: {
      light:   'rgba(61, 46, 32, 0.15)',
      medium:  'rgba(61, 46, 32, 0.35)',
      heavy:   'rgba(61, 46, 32, 0.55)',
    },

    // Текст (--foreground = Rich Soil, ни чистого чёрного)
    text: {
      primary:   '#3D2E20',    // Rich Soil — основной текст
      secondary: '#5C4532',    // Earth
      muted:     '#8A7A66',    // подсказки/мета
      inverse:   '#FCF8F0',    // на тёмных фонах (не #FFF)
      accent:    '#C2654A',    // Terracotta
    },

    // Акценты / бренд
    brand: {
      primary:   '#3D7A52',    // Forest — основное действие
      secondary: '#E8C55A',    // Wheat — вторичное
      light:     '#DCE9DE',    // очень светлый для фонов кнопок
      dark:      '#356444',    // нажатого состояния (--ring)
      gold:      '#E8C55A',    // золотистый для тостов/наград
    },

    // Семантические
    semantic: {
      success:   '#3D7A52',    // Forest
      warning:   '#E8C55A',    // Wheat
      error:     '#C2654A',    // Terracotta (destructive)
      info:      '#7BBAD4',    // Sky
    },

    // Инструменты
    tools: {
      plant:   { bg: '#3D7A52', icon: '#FCF8F0', label: '#FCF8F0' },
      water:   { bg: '#7BBAD4', icon: '#3D2E20', label: '#3D2E20' },
      harvest: { bg: '#E8C55A', icon: '#3D2E20', label: '#3D2E20' },
      hand:    { bg: '#E4E7DC', icon: '#5C4532', label: '#5C4532' },
    },

    // Редкости растений
    rarity: {
      common:      { bg: '#c8e6c9', border: '#81c784', text: '#2e7d32' },
      uncommon:    { bg: '#bbdefb', border: '#64b5f6', text: '#1976d2' },
      rare:        { bg: '#e1bee7', border: '#ba68c8', text: '#7b1fa2' },
      epic:        { bg: '#ffe0b2', border: '#ffb74d', text: '#e65100' },
      legendary:   { bg: '#fff9c4', border: '#ffd54f', text: '#f57f17' },
    },

    // Декоративные (сад)
    garden: {
      soil:       '#4a2f1f',
      soilDark:   '#2c1b10',
      soilLight:  '#5d4037',
      path:       '#c9a884',
      fence:      '#6d4c41',
      water:      { deep: '#3f7fbf', light: '#6fb7e8', highlight: '#a8d0e6' },
      lantern:    { glow: '#fff3b0', core: '#ffd54f', pole: '#5d4037' },
      bench:      '#8d6e63',
      grass:      '#6bb36b',
    },

    // UI элементы
    ui: {
      border:        '#E6DCCC',    // --border
      borderFocus:   '#3D7A52',    // Forest, не акцентный песок
      divider:       '#EDE4D4',
      shadow:        'rgba(92, 69, 50, 0.10)',   // тёплая тень, не чёрная
      shadowStrong:  'rgba(92, 69, 50, 0.18)',
      vignette:      '#3D2E20',    // Rich Soil
    },
  },

  // Единые визуальные токены для DOM и Phaser.
  // Значения синхронизированы с index.html через CSS custom properties.
  uiTokens: {
    panel: '#FCF8F0',
    panelStrong: '#FFFDF8',
    panelTranslucent: 'rgba(252, 248, 240, 0.88)',
    border: '#E6DCCC',
    borderStrong: '#D9CBB4',
    shadow: 'rgba(92, 69, 50, 0.10)',
    shadowStrong: 'rgba(92, 69, 50, 0.18)',
    text: '#3D2E20',
    textMuted: '#8A7A66',
    textOnAccent: '#FCF8F0',
    accent: '#3D7A52',
    accentHover: '#356444',
    accentPressed: '#2C5438',
    secondary: '#E8C55A',
    destructive: '#C2654A',
    overlay: 'rgba(61, 46, 32, 0.54)',
    focus: 'rgba(232, 197, 90, 0.28)',
  },

  // === РАЗМЕРЫ ===
  // База сетки 8dp (Dawnfield). 56dp — минимальный touch target.
  spacing: {
    xs:  4,
    sm:  8,
    md:  12,
    lg:  16,
    xl:  24,
    xxl: 32,
    // безопасные зоны (safe area insets) подставляются динамически
  },

  radius: {
    sm:   8,
    md:   12,
    lg:   16,   // --radius: 1rem — база референса
    xl:   24,   // панели
    full: 999,
    pill: 100,
  },

  // === ТИПОГРАФИКА ===
  // Lilita One — display/headers, Nunito — body. Никаких Inter/DM Sans/Georgia.
  font: {
    family: {
      base:   "'Nunito', 'Quicksand', system-ui, sans-serif",
      title:  "'Lilita One', 'Fredoka One', 'Nunito', cursive",
      mono:   "'JetBrains Mono', 'Fira Code', monospace",
    },
    size: {
      xs:   11,
      sm:   13,
      base: 15,
      md:   17,
      lg:   20,
      xl:   24,
      xxl:  30,
      xxxl: 36,
    },
    weight: {
      regular: 400,
      medium:  500,
      semi:    600,
      bold:    700,
      heavy:   800,
    },
    lineHeight: {
      tight: 1.2,
      base:  1.5,
      loose: 1.7,
    },
  },

  // === ТЕНИ ===
  shadows: {
    sm:   '0 1px 2px rgba(30,20,15,0.08)',
    md:   '0 4px 8px rgba(30,20,15,0.12)',
    lg:   '0 8px 24px rgba(92,69,50,0.14)',
    xl:   '0 16px 40px rgba(92,69,50,0.18)',
    inner: 'inset 0 2px 4px rgba(92,69,50,0.06)',
    // Для Phaser Graphics (не CSS). Тени тёплые (Rich Soil), не чёрные.
    phaser: {
      sm:   { offsetY: 1, blur: 2,  color: 0x5C4532, alpha: 0.08 },
      md:   { offsetY: 4, blur: 8,  color: 0x5C4532, alpha: 0.12 },
      lg:   { offsetY: 8, blur: 24, color: 0x5C4532, alpha: 0.16 },
      xl:   { offsetY: 16, blur: 40, color: 0x5C4532, alpha: 0.20 },
    },
  },

  // === АНИМАЦИИ ===
  motion: {
    fast:    120,
    base:    200,
    slow:    320,
    slower:  500,
    easing: {
      standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
      accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },

  // === TAЧ-ТАРГЕТЫ (минимальные) ===
  // Dawnfield: 56×56dp минимум (Apple HIG 44pt, Material 48dp — превышаем оба).
  touchTarget: {
    min: 56,
    comfortable: 56,
  },

  // === Z-INDEX СЛОИ ===
  depth: {
    bg:        -100,
    garden:    -50,
    decor:     -10,
    tiles:     0,
    plants:    10,
    particles: 50,
    avatars:   90,
    hud:       100,
    toolbar:   140,
    inventory: 150,
    overlays:  200,
    modals:    300,
    hint:      380,
    toasts:    400,
    onboarding:500,
  },

  /**
   * Шкала глубин для ОВЕРЛЕЕВ. Единый источник правды.
   *
   * Раньше каждый оверлей задавал своё число вручную (200, 510, 530, 560,
   * 600, 650, 700), и порядок был случайным: PlantDetailOverlay (560)
   * открывался ПОВЕРХ BookOverlay (200), который его создал, а ShopOverlay
   * (650) оказывался вышедетального окна книги. Здесь порядок задан явно.
   */
  overlay: {
    menu:       510, // главное меню (нижний уровень «диалогов»)
    upgrades:   520,
    roles:      530,
    goals:      540,
    shop:       550,
    book:       560, // книга
    detail:     570, // карточка растения — всегда над книгой
    settings:   580,
    pack:       620, // открытие пака — самый верхний «игровой» оверлей
    gender:     900, // выбор пола — до онбординга, поверх всего
    // Аварийное сообщение (catch в оверлее) — показываем ПОВЕРХ всего,
    // чтобы игрок увидел причину сбоя, а не «мёртвый» экран.
    fatal:      9999,
  },

  // === УТИЛИТЫ ===
  // Преобразовать hex в Phaser color object
  hexToPhaser(hex) {
    const h = hex.replace('#', '');
    return parseInt(h, 16);
  },

  // CSS-строки для свойства `color` у Text (Phaser Text color: accepts hex strings).
  // Раньше в `color:` подставляли числовой токен — текст пропадал.
  css: {
    bgPrimary:    '#F7F1E6',
    bgElevated:   '#FCF8F0',
    textPrimary:  '#3D2E20',
    textSecondary: '#5C4532',
    textMuted:    '#8A7A66',
    textInverse:  '#FCF8F0',
    accent:       '#3D7A52',
    accentHover:  '#356444',
    accentPressed: '#2C5438',
    secondary:    '#E8C55A',
    destructive:  '#C2654A',
    border:       '#E6DCCC',
    borderStrong: '#D9CBB4',
    shadow:       'rgba(92, 69, 50, 0.10)',
    overlay:      'rgba(61, 46, 32, 0.54)',
    focus:        'rgba(232, 197, 90, 0.28)',
  },

  // Сгенерировать CSS-переменные для DOM-элементов (если нужны)
  toCSSVariables() {
    const css = {};
    // colors
    Object.entries(this.colors.bg).forEach(([k, v]) => css[`--bg-${k}`] = v);
    Object.entries(this.colors.text).forEach(([k, v]) => css[`--text-${k}`] = v);
    Object.entries(this.colors.brand).forEach(([k, v]) => css[`--brand-${k}`] = v);
    // spacing
    Object.entries(this.spacing).forEach(([k, v]) => css[`--space-${k}`] = `${v}px`);
    // radius
    Object.entries(this.radius).forEach(([k, v]) => css[`--radius-${k}`] = `${v}px`);
    // shadows
    Object.entries(this.shadows).forEach(([k, v]) => {
      if (typeof v === 'string') css[`--shadow-${k}`] = v;
    });
    return css;
  },
};

// Хелперы для Phaser Graphics
export function drawRoundedRect(graphics, x, y, w, h, radius, fillColor, fillAlpha = 1, strokeColor = null, strokeWidth = 0, strokeAlpha = 1) {
  if (fillColor !== null) {
    graphics.fillStyle(typeof fillColor === 'string' ? DS.hexToPhaser(fillColor) : fillColor, fillAlpha);
    graphics.fillRoundedRect(x, y, w, h, radius);
  }
  if (strokeColor && strokeWidth > 0) {
    graphics.lineStyle(strokeWidth, typeof strokeColor === 'string' ? DS.hexToPhaser(strokeColor) : strokeColor, strokeAlpha);
    graphics.strokeRoundedRect(x, y, w, h, radius);
  }
}

export function drawShadowedRect(graphics, x, y, w, h, radius, fillColor, fillAlpha = 1, shadow = 'md') {
  const s = DS.shadows.phaser[shadow];
  // Тень
  graphics.fillStyle(s.color, s.alpha);
  graphics.fillRoundedRect(x, y + s.offsetY, w, h, radius);
  // Сам прямоугольник
  graphics.fillStyle(typeof fillColor === 'string' ? DS.hexToPhaser(fillColor) : fillColor, fillAlpha);
  graphics.fillRoundedRect(x, y, w, h, radius);
}

export function createButtonStyle(variant = 'primary', size = 'md') {
  const sizes = {
    sm: { h: 40, px: 16, text: DS.font.size.sm, radius: DS.radius.md },
    md: { h: 48, px: 20, text: DS.font.size.base, radius: DS.radius.lg },
    lg: { h: 56, px: 28, text: DS.font.size.lg, radius: DS.radius.xl },
  };
  const s = sizes[size];

  const variants = {
    primary:   { bg: DS.colors.brand.primary, text: DS.colors.text.inverse, border: null },
    secondary: { bg: DS.colors.bg.tertiary, text: DS.colors.text.primary, border: DS.colors.ui.border },
    ghost:     { bg: 'transparent', text: DS.colors.brand.primary, border: DS.colors.brand.primary },
    danger:    { bg: DS.colors.semantic.error, text: DS.colors.text.inverse, border: null },
    success:   { bg: DS.colors.semantic.success, text: DS.colors.text.inverse, border: null },
    tool:      { bg: null, text: DS.colors.text.primary, border: DS.colors.ui.border }, // заполняется динамически
  };

  return { ...s, ...variants[variant] };
}
