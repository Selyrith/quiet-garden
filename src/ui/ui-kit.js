/**
 * UI-кит Quiet Garden: единый скелет оверлеев, карточки, секции, кнопки.
 *
 * Зачем: до этого каждый из девяти оверлеев сам рисовал затемнение (0.8 / 0.85 /
 * 0.9 / 0.58 / 0.62 / 0.64), сам считал панель, сам лепил крестик и заголовок.
 * Отсюда — разъезжающиеся отступы, девять оттенков затемнения, крестики разного
 * размера и цвета, заголовки в разных шрифтах.
 *
 * Теперь всё это живёт здесь. Оверлей задаёт только: заголовок, подзаголовок,
 * размер панели и тело. Рамка, тень, отступы, крестик и поведение закрытия —
 * общие. Палитра — только из DS (design/reference/DESIGN-SPEC.md).
 *
 * Слои и цвета:
 *  - scrim:    DS.colors.overlay.heavy (0.55) — один тон на все окна;
 *  - panel:    Sunlit Card + граница + тёплая тень;
 *  - card:     поверх панели, радиус 16;
 *  - hairline: DS.colors.ui.divider.
 */

import Phaser from 'phaser';
import { DS } from './DesignSystem.js';

const FONT_TITLE = DS.font.family.title;
const FONT_BODY = DS.font.family.base;

/** '#rrggbb' → 0xrrggbb (для Graphics). */
export function color(value) {
  return typeof value === 'number' ? value : parseInt(String(value).replace('#', ''), 16);
}

/**
 * Создаёт скелет оверлея.
 *
 * @param {Phaser.Scene} scene
 * @param {object} opts
 * @param {string} opts.title заголовок
 * @param {string} [opts.subtitle] подзаголовок
 * @param {number} opts.depth глубина контейнера (из DS.overlay.*)
 * @param {number} [opts.maxW=420] максимальная ширина панели
 * @param {number} [opts.maxH] максимальная высота панели
 * @param {number} [opts.widthRatio=0.92] доля ширины экрана
 * @param {number} [opts.heightRatio=0.88] доля высоты экрана
 * @param {number} [opts.padding=20] внутренний отступ
 * @param {boolean} [opts.closeOnScrim=true] закрывать по тапу вне панели
 * @param {Phaser.GameObjects.Container} [opts.container] готовый контейнер оверлея
 *   (если класс сам наследует Container). Тогда киту не нужно создавать свой.
 * @param {boolean} [opts.closeOnScrim=true]
 * @param {() => void} [opts.onClose] дополнительная очистка перед закрытием
 * @returns {{
 *   container: Phaser.GameObjects.Container,
 *   body: Phaser.GameObjects.Container,
 *   scrim: Phaser.GameObjects.Rectangle,
 *   panel: Phaser.GameObjects.Graphics,
 *   titleText: Phaser.GameObjects.Text,
 *   panelW: number, panelH: number,
 *   panelX: number, panelY: number,
 *   content: {left:number, right:number, top:number, bottom:number, width:number},
 *   close: () => void,
 *   setTitle: (t: string, s?: string) => void,
 *   destroy: () => void
 * }}
 */
export function openOverlay(scene, opts) {
  const cam = scene.cameras.main;
  const {
    title = '',
    subtitle = '',
    depth,
    maxW = 420,
    maxH = 560,
    widthRatio = 0.92,
    heightRatio = 0.88,
    padding = 20,
    closeOnScrim = true,
    onClose,
    container: adopted = null,
    restoreSignpost = true,
    bare = false,
  } = opts;

  // Скрываем указатель сада, как делали все оверлеи раньше.
  scene.hideSignpost?.();
  if (scene.signpostDom) { scene.signpostDom.destroy(); scene.signpostDom = null; }

  const container = adopted || scene.add.container(0, 0);
  container.setDepth(depth);

  // `bare` — когда оверлей рисует панель сам (например, книгу с кожаной
  // обложкой), киту нужны только затемнение, крестик и поведение закрытия.
  const scrimAlpha = bare ? 0.64 : 0.55;

  // --- затемнение ---
  // Тёплое, с мягкой виньеткой по краям: глаз не «проваливается» в плоский
  // серый скrim, а сад остаётся виден как фон за окном.
  const scrim = scene.add.rectangle(0, 0, cam.width, cam.height, color(DS.colors.text.primary), scrimAlpha)
    .setOrigin(0)
    .setInteractive();
  scrim.on('pointerdown', () => {
    if (closeOnScrim) close();
  });
  container.add(scrim);

  const vignette = scene.add.graphics();
  const warm = color(DS.colors.text.primary);
  const topH = Math.min(140, cam.height * 0.2);
  const botH = Math.min(180, cam.height * 0.24);
  vignette.fillStyle(warm, 0.12);
  vignette.fillRect(0, 0, cam.width, topH);
  vignette.fillRect(0, cam.height - botH, cam.width, botH);
  vignette.fillStyle(warm, 0.06);
  vignette.fillRect(0, 0, Math.min(120, cam.width * 0.16), cam.height);
  vignette.fillRect(cam.width - Math.min(120, cam.width * 0.16), 0, Math.min(120, cam.width * 0.16), cam.height);
  container.add(vignette);

  // --- панель ---
  const panelW = Math.min(cam.width * widthRatio, maxW, cam.width - 24);
  const panelH = Math.min(cam.height * heightRatio, maxH, cam.height - 24);
  const panelX = (cam.width - panelW) / 2;
  const panelY = (cam.height - panelH) / 2;

  const panel = scene.add.graphics();
  if (!bare) {
    drawPanelSurface(panel, panelX, panelY, panelW, panelH);
    container.add(panel);
  }

  // Панель перехватывает тап: клик внутри не должен закрывать окно.
  if (!bare) {
    const shield = scene.add.rectangle(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH, 0x000000, 0.001)
      .setInteractive();
    container.add(shield);
  }

  // --- шапка ---
  const headerH = bare ? 0 : subtitle ? 86 : 66;
  const contentTop = bare ? panelY + 8 : panelY + headerH + 8;

  let titleText = null;
  let subText = null;
  if (!bare) {
    // Заголовок по центру, как на обложке книги, а не «приклеен» к левому краю.
    titleText = scene.add.text(panelX + panelW / 2, panelY + 20, title, {
      fontSize: `${DS.font.size.xl}px`,
      fontFamily: FONT_TITLE,
      color: DS.colors.text.primary,
    }).setOrigin(0.5, 0);
    titleText.setShadow(0, 2, 'rgba(92,69,50,0.22)', 4, false, true);
    container.add(titleText);

    subText = subtitle
      ? scene.add.text(panelX + panelW / 2, panelY + 50, subtitle, {
          fontSize: `${DS.font.size.sm}px`,
          fontFamily: FONT_BODY,
          color: DS.colors.text.muted,
        }).setOrigin(0.5, 0)
      : null;
    if (subText) container.add(subText);

    // Разделитель с ромбиком посередине — «закладка» фолианта.
    const divider = scene.add.graphics();
    const lineY = panelY + headerH - 8;
    divider.lineStyle(1, color(DS.colors.ui.divider), 1);
    divider.lineBetween(panelX + padding, lineY, panelX + panelW / 2 - 10, lineY);
    divider.lineBetween(panelX + panelW / 2 + 10, lineY, panelX + panelW - padding, lineY);
    divider.fillStyle(color(DS.colors.brand.secondary), 0.85);
    divider.fillPoints([
      new Phaser.Geom.Point(panelX + panelW / 2, lineY - 3.5),
      new Phaser.Geom.Point(panelX + panelW / 2 + 3.5, lineY),
      new Phaser.Geom.Point(panelX + panelW / 2, lineY + 3.5),
      new Phaser.Geom.Point(panelX + panelW / 2 - 3.5, lineY),
    ], true);
    divider.setAlpha(0.9);
    container.add(divider);
  }

  // --- тело ---
  const body = scene.add.container(0, 0);
  container.add(body);

  // --- крестик ---
  // Создаётся ПОСЛЕ тела, чтобы всегда быть поверх содержимого
  // (у книги-фолианта тело — это обложка на весь экран).
  const closeBtn = createCloseButton(scene, panelX + panelW - padding - 14, panelY + 22, () => close());
  container.add(closeBtn);

  const content = {
    left: panelX + padding,
    right: panelX + panelW - padding,
    top: contentTop,
    bottom: panelY + panelH - padding,
    width: panelW - padding * 2,
  };

  let closed = false;

  // Мягкое появление: окно «выплывает», а не возникает рывком.
  // Страховка: если твин не отработает (сцена на паузе, reduce-motion,
  // вызов из отложенного колбэка), окно всё равно станет видимым.
  if (!adopted) {
    container.setAlpha(0);
    container.setScale(0.97);
    scene.tweens.add({
      targets: container,
      alpha: 1,
      scale: 1,
      duration: DS.motion.base,
      ease: 'Cubic.easeOut',
    });
    scene.time.delayedCall(DS.motion.base + 200, () => {
      if (!closed && container.active) {
        container.setAlpha(1);
        container.setScale(1);
      }
    });
  }

  function close() {
    if (closed) return;
    closed = true;
    if (typeof onClose === 'function') onClose();
    if (restoreSignpost) scene.showSignpost?.();
    // Если контейнер «усыновлён» классом-оверлеем — уничтожает он сам,
    // киту достаточно снять свои объекты. Иначе сносим свой контейнер.
    if (!adopted) {
      try { container.destroy(true); } catch {}
    }
  }

  function setTitle(t, s) {
    titleText?.setText(t);
    if (subText && typeof s === 'string') subText.setText(s);
  }

  return {
    container,
    body,
    scrim,
    panel,
    titleText,
    subText,
    panelW,
    panelH,
    panelX,
    panelY,
    content,
    close,
    setTitle,
    destroy: close,
  };
}

/** Фон панели: тёплая многослойная тень + карточка + светлая кромка. */
export function drawPanelSurface(g, x, y, w, h, radius = DS.radius.xl) {
  const warm = color(DS.colors.text.secondary);
  // Многослойная тень (мягче и «дороже», чем одна).
  g.fillStyle(warm, 0.05);
  g.fillRoundedRect(x + 6, y + 14, w, h, radius + 6);
  g.fillStyle(warm, 0.09);
  g.fillRoundedRect(x + 2, y + 7, w, h, radius + 2);
  g.fillStyle(warm, 0.13);
  g.fillRoundedRect(x, y + 3, w, h, radius);

  // Карточка.
  g.fillStyle(color(DS.colors.bg.elevated), 1);
  g.fillRoundedRect(x, y, w, h, radius);
  // Верхний блик — «лист лежит на столе».
  g.fillStyle(0xfffdf8, 0.55);
  g.fillRoundedRect(x + 3, y + 3, w - 6, Math.min(28, h * 0.22), radius - 3);
  // Тень у основания — окно не «плавает», а стоит на столе.
  g.fillStyle(color(DS.colors.text.secondary), 0.07);
  g.fillRoundedRect(x + 4, y + h - 18, w - 8, 12, radius - 4);
  // Граница: тёмная внешняя (как у предметов в мире) + золотая волосяная
  // внутри. Плоская светлая рамка делала окно похожим на веб-модалку.
  g.lineStyle(3, color(DS.colors.text.secondary), 0.92);
  g.strokeRoundedRect(x, y, w, h, radius);
  g.lineStyle(1, color(DS.colors.brand.secondary), 0.55);
  g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, Math.max(2, radius - 4));
  // Зерно бумаги — тонкие редкие точки, «ручная» фактура без шейдеров.
  drawPaperGrain(g, x + 8, y + 8, w - 16, h - 16, { count: Math.round((w * h) / 5200) });

  drawInnerFrame(g, x, y, w, h, radius);
  drawVineCorners(g, x, y, w, h, radius);
}

/**
 * Уголки-лоза: маленький усик с листьями в верхних углах панели.
 *
 * Плоская однотонная карточка выглядела как веб-модалка. Пара зелёных
 * листьев у кромки сразу делает окно «предметом в саду» — и стоит дешево
 * (несколько `Graphics`-команд внутри уже нарисованной панели).
 */
export function drawVineCorners(g, x, y, w, h, radius = DS.radius.xl) {
  const stem = color(0x4E9E69);
  const leaf = color(0x6FBF87);
  const leafLight = color(0x8FD3A5);

  const corners = [
    { cx: x + radius * 0.55, cy: y + 6, dx: 1, dy: 1 },
    { cx: x + w - radius * 0.55, cy: y + 6, dx: -1, dy: 1 },
  ];

  for (const { cx, cy, dx } of corners) {
    g.lineStyle(1.6, stem, 0.7);
    g.beginPath();
    g.moveTo(cx, cy + 16);
    g.lineTo(cx + dx * 5, cy + 8);
    g.lineTo(cx + dx * 2, cy);
    g.strokePath();

    g.fillStyle(leaf, 0.9);
    g.fillEllipse(cx + dx * 9, cy + 10, 9, 4.6);
    g.fillStyle(leafLight, 0.85);
    g.fillEllipse(cx + dx * 4, cy + 1, 8, 4);
  }
}

/**
 * Внутренняя «переплётная» рамка: тонкая линия с отступом и уголки.
 * Даёт окну вид ручной работы — книга/шкатулка, а не системный диалог.
 */
export function drawInnerFrame(g, x, y, w, h, radius = DS.radius.xl, inset = 8) {
  const accent = color(DS.colors.brand.secondary);
  const border = color(DS.colors.ui.border);

  g.lineStyle(1, border, 0.9);
  g.strokeRoundedRect(x + inset, y + inset, w - inset * 2, h - inset * 2, Math.max(4, radius - inset));

  // Уголки-«стежки»: маленькие тёплые квадраты по четырём углам рамки.
  const corner = 4;
  const arm = 14;
  g.lineStyle(2, accent, 0.75);
  const pts = [
    [x + inset, y + inset, 1, 1],
    [x + w - inset, y + inset, -1, 1],
    [x + inset, y + h - inset, 1, -1],
    [x + w - inset, y + h - inset, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of pts) {
    g.lineBetween(cx, cy, cx + dx * arm, cy);
    g.lineBetween(cx, cy, cx, cy + dy * arm);
    g.fillStyle(accent, 0.9);
    g.fillCircle(cx, cy, corner * 0.55);
  }
}

/** Круглый крестик 44×44 с тёплым hover-кольцом. */
export function createCloseButton(scene, x, y, onClick) {
  const c = scene.add.container(x, y);
  const r = 22;

  const bg = scene.add.circle(0, 0, r, color(DS.colors.bg.secondary), 1)
    .setStrokeStyle(1.5, color(DS.colors.ui.border), 1);
  const mark = scene.add.text(0, -1, '✕', {
    fontSize: `${DS.font.size.lg}px`,
    fontFamily: FONT_BODY,
    color: DS.colors.text.secondary,
  }).setOrigin(0.5);
  const hit = scene.add.circle(0, 0, Math.max(r, 24), 0x000000, 0.001)
    .setInteractive({ useHandCursor: true });

  hit.on('pointerover', () => {
    bg.setFillStyle(color(DS.colors.bg.tertiary), 1);
    bg.setStrokeStyle(2, color(DS.colors.brand.secondary), 1);
    mark.setColor(DS.colors.text.primary);
  });
  hit.on('pointerout', () => {
    bg.setFillStyle(color(DS.colors.bg.secondary), 1);
    bg.setStrokeStyle(1.5, color(DS.colors.ui.border), 1);
    mark.setColor(DS.colors.text.secondary);
  });
  hit.on('pointerdown', () => {
    scene.sound?.uiClick?.();
    onClick();
  });

  c.add([bg, mark, hit]);
  return c;
}

/**
 * Заголовок секции: маленькая подпись капслоком + волосяная линия справа.
 * Возвращает высоту, чтобы содержимое шло сразу под ним.
 */
export function sectionHeader(scene, parent, x, y, width, label, { accent = null } = {}) {
  const text = scene.add.text(x, y, String(label).toUpperCase(), {
    fontSize: `${DS.font.size.xs}px`,
    fontFamily: FONT_BODY,
    fontStyle: 'bold',
    color: accent ? accent : DS.colors.text.muted,
  }).setOrigin(0, 0);
  text.setLetterSpacing?.(0.8);
  parent.add(text);

  const lineX = x + text.width + 10;
  if (lineX < x + width - 8) {
    const line = scene.add.rectangle(lineX, y + text.height / 2, x + width - lineX, 1, color(DS.colors.ui.divider), 1)
      .setOrigin(0, 0.5);
    parent.add(line);
  }
  return text.height + 8;
}

/**
 * Карточка контента: скруглённый фон + hover-подъём.
 * Возвращает контейнер; содержимое добавляйте в `card.body`.
 */
export function createCard(scene, x, y, w, h, {
  radius = DS.radius.lg,
  fill = DS.colors.bg.elevated,
  border = DS.colors.ui.border,
  interactive = false,
  onClick = null,
  accent = null,
} = {}) {
  const container = scene.add.container(x, y);

  // Тень: три слоя вместо одного размытого пятна — «карточка лежит на столе».
  const shadow = scene.add.graphics();
  shadow.fillStyle(color(DS.colors.text.secondary), 0.06);
  shadow.fillRoundedRect(-1, 5, w + 2, h, radius + 1);
  shadow.fillStyle(color(DS.colors.text.secondary), 0.10);
  shadow.fillRoundedRect(0, 3, w, h + 1, radius);
  container.add(shadow);

  const bg = scene.add.graphics();
  const draw = (state) => {
    bg.clear();
    const isHover = state === 'hover';

    // Основа: тёплая бумага. Тёмная обводка 2.5 px — главный приём референсов
    // (Stardew Valley, Garden Story): без неё карточка «плавает» и выглядит
    // веб-элементом, а не предметом в мире игры.
    bg.fillStyle(color(isHover ? DS.colors.bg.primary : fill), 1);
    bg.fillRoundedRect(0, 0, w, h, radius);

    // Верхний блик (свет падает сверху).
    bg.fillStyle(0xfffdf8, 0.42);
    bg.fillRoundedRect(1.5, 1.5, w - 3, Math.min(16, h * 0.3), radius - 2);

    // Нижняя внутренняя тень — объём у основания.
    bg.fillStyle(color(DS.colors.text.secondary), 0.07);
    bg.fillRoundedRect(2, h - Math.min(14, h * 0.22), w - 4, Math.min(12, h * 0.2), radius - 2);

    // Акцентная полоска слева — маркер категории/текущего выбора.
    if (accent) {
      bg.fillStyle(color(accent), 1);
      bg.fillRoundedRect(0, h * 0.16, 4, h * 0.68, 2);
    }

    // Обводка: тёмная, с «уголком» светлее сверху.
    bg.lineStyle(isHover ? 3 : 2.5, color(isHover ? DS.colors.brand.primary : DS.colors.text.secondary), 1);
    bg.strokeRoundedRect(0, 0, w, h, radius);
    bg.lineStyle(1, 0xffffff, 0.35);
    bg.strokeRoundedRect(1.5, 1.5, w - 3, h - 3, Math.max(2, radius - 2));
  };
  draw('idle');
  container.add(bg);

  const body = scene.add.container(0, 0);
  container.add(body);

  if (interactive) {
    const hit = scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerover', () => {
      draw('hover');
      scene.tweens.add({ targets: container, y: y - 1, duration: DS.motion.fast, ease: DS.motion.easing.decelerate });
    });
    hit.on('pointerout', () => {
      draw('idle');
      scene.tweens.add({ targets: container, y, duration: DS.motion.fast, ease: DS.motion.easing.decelerate });
    });

    // Активация по ОТПУСКАНИЮ, а не по нажатию. Иначе начало свайпа по
    // списку, попавшее на карточку, мгновенно срабатывает как «купить».
    // Нажатие без смещения (обычный тап) работает как раньше.
    let downX = 0;
    let downY = 0;
    hit.on('pointerdown', (pointer) => {
      downX = pointer.x;
      downY = pointer.y;
    });
    hit.on('pointerup', (pointer) => {
      const moved = Math.hypot(pointer.x - downX, pointer.y - downY);
      if (moved > 10) return;
      scene.sound?.uiClick?.();
      if (typeof onClick === 'function') onClick();
    });
  }

  container.bg = bg;
  container.body = body;
  container.redraw = draw;
  container.cardW = w;
  container.cardH = h;
  return container;
}

/**
 * Кнопка кита. Варианты: primary (Forest), secondary (Wheat), ghost, danger.
 * В отличие от старого createUnifiedButton — аккуратная «доска»: тень снизу,
 * блик сверху, нажатие на 2px внутрь.
 */
export function createButton(scene, x, y, w, h, label, onClick, {
  variant = 'primary',
  disabled = false,
  fontSize = DS.font.size.base,
  depth = null,
  radius = DS.radius.lg,
} = {}) {
  const palette = {
    primary:   { bg: DS.colors.brand.primary,   hi: DS.colors.brand.dark,   text: DS.colors.text.inverse,  edge: DS.colors.brand.dark },
    secondary: { bg: DS.colors.brand.secondary, hi: '#D9B24A',              text: DS.colors.text.primary,  edge: '#C79E38' },
    ghost:     { bg: DS.colors.bg.secondary,    hi: DS.colors.bg.tertiary,  text: DS.colors.text.primary,  edge: DS.colors.ui.border },
    danger:    { bg: DS.colors.semantic.error,  hi: '#A8543D',              text: DS.colors.text.inverse,  edge: '#9E4E38' },
  }[variant] || { bg: DS.colors.brand.primary, hi: DS.colors.brand.dark, text: DS.colors.text.inverse, edge: DS.colors.brand.dark };

  const container = scene.add.container(x, y);
  if (depth != null) container.setDepth(depth);

  const g = scene.add.graphics();
  const draw = (state) => {
    g.clear();
    const pressed = state === 'pressed';
    const hover = state === 'hover';
    const off = state === 'disabled';

    const bodyColor = off ? DS.colors.bg.tertiary : pressed ? palette.hi : hover ? palette.hi : palette.bg;
    const alpha = off ? 0.85 : 1;

    // Кнопка «из мира»: тёмная нижняя грань (толщина), тело, светлая
    // верхняя кромка, тёмная обводка. При нажатии кнопка садится на 2 px.
    const sink = pressed ? 2 : 0;

    // Нижняя грань — видимая «толщина» кнопки.
    if (!off) {
      g.fillStyle(color(palette.edge), 0.95);
      g.fillRoundedRect(-w / 2, -h / 2 + 3, w, h, radius);
    }

    // Тело.
    g.fillStyle(color(bodyColor), alpha);
    g.fillRoundedRect(-w / 2, -h / 2 + sink, w, h, radius);

    // Верхний блик: мягкая полоса, а не резкий полупрозрачный прямоугольник.
    if (!off) {
      g.fillStyle(0xffffff, pressed ? 0.10 : 0.26);
      g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4 + sink, w - 8, Math.max(6, h * 0.34), Math.max(3, radius - 4));
      // Внутренняя тень у основания — объём.
      g.fillStyle(color(palette.edge), 0.22);
      g.fillRoundedRect(-w / 2 + 4, h / 2 - 8 + sink, w - 8, 6, Math.max(2, radius - 6));
    }

    // Обводка: тёмная, чтобы кнопка читалась на любом фоне.
    g.lineStyle(2.5, color(off ? DS.colors.ui.border : DS.colors.text.secondary), off ? 0.5 : 0.9);
    g.strokeRoundedRect(-w / 2, -h / 2 + sink, w, h, radius);
  };
  draw(disabled ? 'disabled' : 'idle');
  container.add(g);

  const text = scene.add.text(0, 0, label, {
    fontSize: `${fontSize}px`,
    fontFamily: FONT_BODY,
    fontStyle: 'bold',
    color: disabled ? DS.colors.text.muted : palette.text,
  }).setOrigin(0.5);
  container.add(text);

  // Тач-таргет не меньше 48×48, даже если визуально кнопка меньше.
  const hit = scene.add.rectangle(0, 0, Math.max(w, 48), Math.max(h, 48), 0x000000, 0.001)
    .setInteractive({ useHandCursor: !disabled });
  container.add(hit);

  let off = disabled;
  hit.on('pointerover', () => { if (!off) draw('hover'); });
  hit.on('pointerout', () => { if (!off) draw('idle'); });
  hit.on('pointerdown', () => {
    if (off) return;
    draw('pressed');
    scene.sound?.uiClick?.();
    onClick?.();
  });
  hit.on('pointerup', () => { if (!off) draw('hover'); });
  hit.on('pointerupoutside', () => { if (!off) draw('idle'); });

  container.setDisabled = (val) => {
    off = val;
    draw(off ? 'disabled' : 'idle');
    text.setColor(off ? DS.colors.text.muted : palette.text);
    hit.setInteractive({ useHandCursor: !off });
  };
  container.setLabel = (next) => text.setText(next);

  return container;
}

/** Прогресс-бар с закруглёнными концами и заливкой Wheat. */
export function createProgressBar(scene, x, y, w, h, {
  value = 0,
  fill = DS.colors.brand.secondary,
  track = DS.colors.bg.tertiary,
  radius = h / 2,
} = {}) {
  const container = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, w, h, color(track), 1).setOrigin(0, 0.5);
  const bar = scene.add.rectangle(1, 0, 0, h - 2, color(fill), 1).setOrigin(0, 0.5);
  container.add([bg, bar]);

  container.setValue = (ratio) => {
    const r = Math.max(0, Math.min(1, ratio));
    bar.width = Math.max(0, (w - 2) * r);
  };
  container.setValue(value);
  return container;
}

/** Полоска-«пилюля» с текстом: монеты, код комнаты, статус. */
export function createPill(scene, x, y, w, h, text, {
  fill = DS.colors.bg.secondary,
  border = DS.colors.ui.border,
  color: textColor = DS.colors.text.primary,
  fontSize = DS.font.size.sm,
  fontFamily = FONT_BODY,
  fontStyle = 'bold',
  icon = null,
} = {}) {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(color(fill), 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  g.lineStyle(1.5, color(border), 1);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  container.add(g);

  const label = scene.add.text(icon ? 8 : 0, 0, text, {
    fontSize: `${fontSize}px`,
    fontFamily,
    fontStyle,
    color: textColor,
  }).setOrigin(0.5);
  container.add(label);

  if (icon) {
    const ic = scene.add.text(-w / 2 + 14, 0, icon, {
      fontSize: `${fontSize + 3}px`,
      fontFamily: FONT_BODY,
    }).setOrigin(0.5);
    container.add(ic);
    label.setX((icon ? 14 : 0) / 2 + 4);
  }

  container.setLabel = (t) => label.setText(t);
  container.pillW = w;
  container.pillH = h;
  return container;
}

/**
 * Прокручиваемая область контента.
 *
 * ВАЖНО: никаких интерактивных зон поверх контента — иначе они перехватывают
 * тапы по карточкам (Phaser отдаёт клик только верхнему объекту). Прокрутка —
 * колесом мыши и кнопками-стрелками, которые вызывает сам оверлей.
 *
 * @returns {{view, viewportH, refresh, scrollBy, getScroll, contentH}}
 */
export function createScrollArea(scene, parent, content) {
  const viewportH = Math.max(40, content.bottom - content.top);
  const view = scene.add.container(content.left, content.top);
  parent.add(view);

  // Маска, чтобы контент не вылезал под шапку/за нижний край панели.
  const maskG = scene.make.graphics({ x: 0, y: 0 }, false);
  maskG.fillStyle(0xffffff, 1);
  maskG.fillRect(content.left, content.top, content.width, viewportH);
  const mask = maskG.createGeometryMask();
  view.setMask(mask);

  let scrollY = 0;
  let contentH = 0;
  let maxScroll = 0;

  // ВАЖНО: у контейнеров-карточек нет собственного height, поэтому старый
  // расчёт «child.y + child.displayHeight» давал 0 — прокрутка не работала
  // и нижние карточки (улучшения, паки) просто обрезались маской.
  // Считаем реальные габариты через getBounds().
  function measure() {
    let bottom = 0;
    for (const child of view.list) {
      if (!child || child.destroyed) continue;
      let childBottom;
      try {
        const b = child.getBounds();
        childBottom = b.bottom - view.y;
      } catch {
        const ch = child.displayHeight || child.height || 0;
        childBottom = (child.y || 0) + ch;
      }
      if (Number.isFinite(childBottom)) bottom = Math.max(bottom, childBottom);
    }
    return bottom;
  }

  function refresh() {
    contentH = measure();
    maxScroll = Math.max(0, contentH - viewportH);
    scrollY = Math.max(-maxScroll, Math.min(0, scrollY));
    view.y = content.top + scrollY;
    scrollbar.refresh();
    return { contentH, maxScroll };
  }

  function scrollBy(dy) {
    scrollY = Math.max(-maxScroll, Math.min(0, scrollY + dy));
    view.y = content.top + scrollY;
    scrollbar.refresh();
  }

  // Тонкий индикатор справа: без него на телефоне не видно, что список
  // вообще прокручивается.
  const scrollbar = createScrollbar(scene, parent, content, {
    getState: () => ({ scrollY, maxScroll, viewportH }),
  });

  const onWheel = (_p, _o, _dx, dy) => {
    scrollBy(-dy * 0.6);
  };
  scene.input.on('wheel', onWheel);

  view.once('destroy', () => {
    try { scene.input.off('wheel', onWheel); } catch {}
    try { mask.destroy(); } catch {}
    try { maskG.destroy(); } catch {}
  });

  return {
    view,
    viewportH,
    refresh,
    scrollBy,
    getScroll: () => ({ scrollY, maxScroll }),
    get contentH() { return contentH; },
    destroy: () => scrollbar.destroy(),
  };
}

/** Тонкий индикатор прокрутки у правого края области контента. */
export function createScrollbar(scene, parent, content, { getState }) {
  const trackW = 3;
  const trackX = content.right + 4;
  const track = scene.add.rectangle(trackX, content.top, trackW, 0, color(DS.colors.ui.border), 0.5)
    .setOrigin(0, 0);
  const thumb = scene.add.rectangle(trackX, content.top, trackW, 0, color(DS.colors.brand.primary), 0.55)
    .setOrigin(0, 0);
  parent.add([track, thumb]);

  function refresh() {
    const { scrollY, maxScroll, viewportH } = getState();
    if (maxScroll <= 0) {
      track.setVisible(false);
      thumb.setVisible(false);
      return;
    }
    track.setVisible(true);
    thumb.setVisible(true);
    track.height = viewportH;
    const thumbH = Math.max(28, viewportH * (viewportH / (viewportH + maxScroll)));
    const progress = Math.min(1, Math.max(0, -scrollY / maxScroll));
    thumb.height = thumbH;
    thumb.y = content.top + progress * (viewportH - thumbH);
  }

  refresh();
  return { refresh, destroy: () => { track.destroy(); thumb.destroy(); } };
}

/**
 * Стрелки прокрутки под списком. На телефоне колеса нет, а маску без них
 * не обойти: палец не прокручивает Phaser-контейнер сам по себе.
 * Кнопки прячутся, когда прокручивать нечего.
 */
export function createScrollButtons(scene, parent, getScrollArea, { y, x, width } = {}) {
  const area = typeof getScrollArea === 'function' ? getScrollArea() : getScrollArea;
  if (!area) return { destroy: () => {} };

  const step = Math.max(80, area.viewportH * 0.7);
  const btnSize = 44;
  const cx = x ?? (areaContentCenter(area, parent));
  const cy = y ?? 0;

  const up = createRoundArrow(scene, cx - btnSize, cy, '▲', () => area.scrollBy(step));
  const down = createRoundArrow(scene, cx + btnSize, cy, '▼', () => area.scrollBy(-step));
  parent.add([up, down]);

  function refresh() {
    const { scrollY, maxScroll } = area.getScroll();
    up.setVisible(maxScroll > 0 && scrollY < -0.5);
    down.setVisible(maxScroll > 0 && scrollY > -maxScroll + 0.5);
  }

  const timer = scene.time.addEvent({ delay: 120, loop: true, callback: refresh });
  refresh();

  return {
    refresh,
    destroy: () => {
      try { timer.remove(); } catch {}
      up.destroy();
      down.destroy();
    },
  };
}

function areaContentCenter(area, parent) {
  // Возвращает центр родителя в локальных координатах, если оверлей не
  // сообщил явную позицию — стрелки ставим по центру панели.
  const w = parent && Number.isFinite(parent.width) ? parent.width : 0;
  return w ? w / 2 : 0;
}

function createRoundArrow(scene, x, y, glyph, onClick) {
  const c = scene.add.container(x, y);
  const bg = scene.add.circle(0, 0, 17, color(DS.colors.bg.elevated), 0.95)
    .setStrokeStyle(1.5, color(DS.colors.ui.border), 1);
  const txt = scene.add.text(0, -1, glyph, {
    fontSize: `${DS.font.size.xs}px`,
    fontFamily: FONT_BODY,
    color: DS.colors.text.secondary,
  }).setOrigin(0.5);
  const hit = scene.add.circle(0, 0, 24, 0x000000, 0.001)
    .setInteractive({ useHandCursor: true });
  hit.on('pointerdown', () => {
    scene.sound?.uiClick?.();
    onClick();
  });
  c.add([bg, txt, hit]);
  return c;
}

/**
 * Тумблер в стиле кита. В отличие от createUnifiedToggle — вытянутая
 * «дорожка», крупный бегунок, тёплое выключенное состояние.
 */
export function createToggle(scene, x, y, isOn, onChange, { w = 52, h = 30 } = {}) {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();

  const draw = (on) => {
    g.clear();
    g.fillStyle(color(on ? DS.colors.brand.primary : DS.colors.bg.tertiary), 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.lineStyle(1.5, color(on ? DS.colors.brand.dark : DS.colors.ui.border), 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    const knobX = on ? w / 2 - h / 2 : -w / 2 + h / 2;
    g.fillStyle(color(DS.colors.bg.elevated), 1);
    g.fillCircle(knobX, 0, h / 2 - 4);
  };

  let on = !!isOn;
  draw(on);

  const hit = scene.add.rectangle(0, 0, w + 16, Math.max(h + 16, 48), 0x000000, 0.001)
    .setInteractive({ useHandCursor: true });
  hit.on('pointerdown', () => {
    on = !on;
    draw(on);
    scene.sound?.uiClick?.();
    onChange?.(on);
  });

  container.add([g, hit]);
  container.setValue = (val) => { on = !!val; draw(on); };
  container.getValue = () => on;
  return container;
}

/**
 * Сегментированный переключатель (вкладки). Активный сегмент — Forest,
 * остальные — прозрачные. Возвращает контейнер с методом setActive(id).
 */
export function createSegmentedControl(scene, x, y, w, h, items, activeId, onSelect) {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  const labels = new Map();

  const draw = (active) => {
    g.clear();
    g.fillStyle(color(DS.colors.bg.tertiary), 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, DS.radius.md);

    const segW = (w - 6) / items.length;
    items.forEach((item, i) => {
      const segX = -w / 2 + 3 + i * segW;
      const isActive = item.id === active;
      if (isActive) {
        g.fillStyle(color(DS.colors.bg.elevated), 1);
        g.fillRoundedRect(segX, -h / 2 + 3, segW, h - 6, DS.radius.sm);
        g.lineStyle(1.5, color(DS.colors.brand.primary), 0.9);
        g.strokeRoundedRect(segX, -h / 2 + 3, segW, h - 6, DS.radius.sm);
      }
      const label = labels.get(item.id);
      if (label) {
        label.setColor(isActive ? DS.colors.brand.dark : DS.colors.text.muted);
        label.setFontStyle(isActive ? 'bold' : 'normal');
      }
    });
  };

  const segW = (w - 6) / items.length;
  items.forEach((item, i) => {
    const segX = -w / 2 + 3 + i * segW;
    const label = scene.add.text(segX + segW / 2, 0, item.label, {
      fontSize: `${DS.font.size.sm}px`,
      fontFamily: FONT_BODY,
      color: DS.colors.text.muted,
    }).setOrigin(0.5);
    labels.set(item.id, label);
    container.add(label);

    const hit = scene.add.rectangle(segX + segW / 2, 0, segW, Math.max(h, 44), 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      if (activeId === item.id) return;
      activeId = item.id;
      draw(activeId);
      scene.sound?.uiClick?.();
      onSelect?.(item.id);
    });
    container.add(hit);
  });

  container.addAt(g, 0);
  draw(activeId);
  container.setActive = (id) => { activeId = id; draw(id); };
  return container;
}

/**
 * Строка списка «лейбл слева — значение справа» с необязательной иконкой.
 * Возвращает контейнер высотой h; полезно для настроек и карточек.
 */
export function createListRow(scene, x, y, w, h, { icon = null, label = '', value = '', onClick = null, accent = null } = {}) {
  const container = scene.add.container(x, y);

  const bg = scene.add.graphics();
  const draw = (hover) => {
    bg.clear();
    bg.fillStyle(color(hover ? DS.colors.bg.primary : DS.colors.bg.elevated), 1);
    bg.fillRoundedRect(0, 0, w, h, DS.radius.md);
    bg.lineStyle(1.5, color(hover ? DS.colors.brand.primary : DS.colors.ui.border), 1);
    bg.strokeRoundedRect(0, 0, w, h, DS.radius.md);
  };
  draw(false);
  container.add(bg);

  let textX = 14;
  if (icon) {
    const ic = scene.add.text(16, h / 2, icon, {
      fontSize: `${DS.font.size.md}px`,
      fontFamily: FONT_BODY,
    }).setOrigin(0, 0.5);
    container.add(ic);
    container.iconText = ic;
    textX = 16 + ic.width + 10;
  } else {
    container.iconText = null;
  }

  const labelText = scene.add.text(textX, h / 2, label, {
    fontSize: `${DS.font.size.base}px`,
    fontFamily: FONT_BODY,
    fontStyle: 'bold',
    color: accent || DS.colors.text.primary,
  }).setOrigin(0, 0.5);
  container.add(labelText);

  let valueText = null;
  if (value) {
    valueText = scene.add.text(w - 14, h / 2, value, {
      fontSize: `${DS.font.size.sm}px`,
      fontFamily: FONT_BODY,
      color: DS.colors.text.muted,
    }).setOrigin(1, 0.5);
    container.add(valueText);
  }

  if (typeof onClick === 'function') {
    const hit = scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(true));
    hit.on('pointerout', () => draw(false));
    hit.on('pointerdown', () => {
      scene.sound?.uiClick?.();
      onClick();
    });
    container.add(hit);
  }

  container.setValue = (t) => valueText?.setText(t);
  container.setLabel = (t) => labelText.setText(t);
  return container;
}

/**
 * Пустое состояние: иконка, заголовок и пояснение. Вместо «голого» текста
 * «Ничего не найдено…» посреди пустого экрана.
 */
export function createEmptyState(scene, x, y, w, { icon = '🌱', title = '', hint = '' } = {}) {
  const c = scene.add.container(x, y);
  const parts = [];

  if (icon) {
    parts.push(scene.add.text(0, -28, icon, { fontSize: '34px', fontFamily: FONT_BODY }).setOrigin(0.5));
  }
  if (title) {
    parts.push(scene.add.text(0, 8, title, {
      fontSize: `${DS.font.size.base}px`,
      fontFamily: FONT_BODY,
      fontStyle: 'bold',
      color: DS.colors.text.secondary,
      align: 'center',
      wordWrap: { width: w },
    }).setOrigin(0.5, 0));
  }
  if (hint) {
    parts.push(scene.add.text(0, 34, hint, {
      fontSize: `${DS.font.size.sm}px`,
      fontFamily: FONT_BODY,
      color: DS.colors.text.muted,
      align: 'center',
      wordWrap: { width: w },
    }).setOrigin(0.5, 0));
  }

  c.add(parts);
  return c;
}

/**
 * Деликатная «бумажная» текстура для панели: редкие тёплые точки, как
 * зерно бумаги. Рисуется один раз при открытии, без шейдеров.
 */
export function drawPaperGrain(g, x, y, w, h, { count = 60, seed = 7 } = {}) {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  g.fillStyle(color(DS.colors.text.secondary), 0.045);
  for (let i = 0; i < count; i++) {
    const px = x + rand() * w;
    const py = y + rand() * h;
    const r = 0.6 + rand() * 1.1;
    g.fillCircle(px, py, r);
  }
}
