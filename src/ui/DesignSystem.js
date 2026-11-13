/**
 * Единая дизайн-система для Quiet Garden.
 * Все цвета, отступы, типографика, радиусы, тени — тут.
 * Использовать: import { DS } from './DesignSystem.js';
 */

export const DS = {
  // === ЦВЕТА ===
  // Базовая тёпая палитра (cozy earth tones)
  colors: {
    // Фоновые
    bg: {
      primary:   '#fdf8f3',    // основной фон (кремовый)
      secondary: '#f5ebe0',    // вторичный (тёплый бежевый)
      tertiary:  '#ede3d9',    // карточки/панели
      elevated:  '#ffffff',    // всплывающие окна
    },
    // Оверлеи
    overlay: {
      light:   'rgba(30,20,15,0.15)',
      medium:  'rgba(30,20,15,0.35)',
      heavy:   'rgba(30,20,15,0.55)',
    },

    // Текст
    text: {
      primary:   '#3d2b1f',    // основной текст (тёмно-коричневый)
      secondary: '#6b5b4f',    // второстепенный
      muted:     '#9a8d7f',    // подсказки/мета
      inverse:   '#fdf8f3',    // на тёмных фонах
      accent:    '#c87a3a',    // акцентный (терракота)
    },

    // Акценты / бренд
    brand: {
      primary:   '#d4a574',    // тёплый песок (основной акцент)
      secondary: '#b8956a',    // глубже
      light:     '#efe3d8',    // очень светлый для фонов кнопок
      dark:      '#9d7a4a',    // для нажатого состояния
      gold:      '#fbbf24',    // золотистый для тостов/акцентов
    },

    // Семантические
    semantic: {
      success:   '#7db87d',    // зелёный (урожай/успех)
      warning:   '#e8c56d',    // жёлтый (предупреждение)
      error:     '#d67a6a',    // красноватый (ошибка)
      info:      '#8ab4d8',    // синий (инфо)
    },

    // Инструменты
    tools: {
      plant:   { bg: '#d4a574', icon: '#3d2b1f', label: '#3d2b1f' },
      water:   { bg: '#7db8d8', icon: '#1e3a5f', label: '#1e3a5f' },
      harvest: { bg: '#e8b87d', icon: '#5d3a1a', label: '#5d3a1a' },
      hand:    { bg: '#ede3d9', icon: '#6b5b4f', label: '#6b5b4f' },
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
      border:        '#d4c4b0',
      borderFocus:   '#d4a574',
      divider:       '#e8ddd0',
      shadow:        'rgba(30,20,15,0.12)',
      shadowStrong:  'rgba(30,20,15,0.22)',
      vignette:      '#1e140f',
    },
  },

  // Единые визуальные токены для DOM и Phaser.
  // Значения синхронизированы с index.html через CSS custom properties.
  uiTokens: {
    panel: '#f8f4ee',
    panelStrong: '#ffffff',
    panelTranslucent: 'rgba(255, 255, 255, 0.86)',
    border: '#e6dcc9',
    borderStrong: '#d4c4b0',
    shadow: 'rgba(96, 80, 66, 0.14)',
    shadowStrong: 'rgba(96, 80, 66, 0.22)',
    text: '#5c4a3a',
    textMuted: '#8e7b63',
    textOnAccent: '#ffffff',
    accent: '#d8a494',
    accentHover: '#e8c3a8',
    accentPressed: '#c9a884',
    secondary: '#b8c4a6',
    destructive: '#cb8a6b',
    overlay: 'rgba(35, 25, 18, 0.54)',
    focus: 'rgba(185, 200, 166, 0.22)',
  },

  // === РАЗМЕРЫ ===
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
    lg:   16,
    xl:   24,
    full: 999,
    pill: 100,
  },

  // === ТИПОГРАФИКА ===
  font: {
    family: {
      base:   "'Nunito', 'Quicksand', 'Comfortaa', system-ui, sans-serif",
      title:  "'Fredoka One', 'Nunito', 'Comfortaa', cursive",
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
    lg:   '0 8px 24px rgba(30,20,15,0.16)',
    xl:   '0 16px 40px rgba(30,20,15,0.20)',
    inner: 'inset 0 2px 4px rgba(30,20,15,0.06)',
    // Для Phaser Graphics (не CSS)
    phaser: {
      sm:   { offsetY: 1, blur: 2,  color: 0x1e140f, alpha: 0.08 },
      md:   { offsetY: 4, blur: 8,  color: 0x1e140f, alpha: 0.12 },
      lg:   { offsetY: 8, blur: 24, color: 0x1e140f, alpha: 0.16 },
      xl:   { offsetY: 16, blur: 40, color: 0x1e140f, alpha: 0.20 },
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

  // === TAUCH-ТАРГЕТЫ (минимальные) ===
  touchTarget: {
    min: 48, // 48x48 px — Google Material / Apple HIG рекомендации
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
