import Phaser from 'phaser';
import { DS, drawRoundedRect, drawShadowedRect, createButtonStyle } from './DesignSystem.js';
import { computeLayout } from './Layout.js';
import { ICON } from './Icons.js';
import { mulberry32 } from './BakeTexture.js';

/**
 * Верхняя панель: монеты, код комнаты, мир/сезон, звук, меню.
 *
 * Вся геометрия приходит из Layout (layout.hud) — панель не считает
 * координаты сама и умеет пересобираться при изменении размера окна
 * через `resize()`.
 */
export function createTopBar(scene, layout) {
  const L = layout || computeLayout(scene.scale.width, scene.scale.height);
  const H = L.hud;

  const container = scene.add.container(0, 0).setDepth(DS.depth.hud);

  // Фон верхней панели с виньеткой
  const bg = scene.add.graphics();
  container.add(bg);

  // Верх панели — «деревянная доска», низ переходит в мягкую тень сада.
  // Плоская светлая полоса выглядела как веб-хедер, а не как элемент игры.
  const WOOD = 0x96663F;
  const WOOD_HI = 0xC9A171;
  const WOOD_DARK = 0x6E4527;

  const drawBg = () => {
    bg.clear();
    // Тёплая тень под панелью.
    bg.fillStyle(0x3D2E20, 0.16);
    bg.fillRect(0, H.h, H.w, 8);
    bg.fillStyle(0x3D2E20, 0.08);
    bg.fillRect(0, H.h + 8, H.w, 6);
    // Сама доска: градиент из трёх полос (дёшево, без шейдеров).
    bg.fillStyle(WOOD_DARK, 1);
    bg.fillRect(0, 0, H.w, H.h);
    bg.fillStyle(WOOD, 1);
    bg.fillRect(0, 2, H.w, H.h - 4);
    bg.fillStyle(0xB07C4E, 0.55);
    bg.fillRect(0, 2, H.w, Math.max(3, H.h * 0.28));
    // Светлая верхняя кромка и тёмная нижняя — объём.
    bg.fillStyle(WOOD_HI, 0.75);
    bg.fillRect(0, 0, H.w, 2);
    bg.fillStyle(WOOD_DARK, 1);
    bg.fillRect(0, H.h - 3, H.w, 3);

    // «Живая» доска: редкие травинки и листики по нижней кромке.
    // Рисуем ВНУТРИ полосы панели, поэтому раскладка не меняется.
    const rng = mulberry32(4242);
    for (let x = 12; x < H.w - 12; x += 22) {
      if (rng() < 0.45) continue;
      const hh = 5 + rng() * 6;
      const sway = (rng() - 0.5) * 3;
      bg.fillStyle(0x6FBF87, 0.85);
      bg.fillTriangle(x, H.h - 4, x + sway, H.h - 4 - hh, x + 4, H.h - 4);
      bg.fillStyle(0x4E9E69, 0.9);
      bg.fillTriangle(x + 4, H.h - 4, x + 4 + sway, H.h - 6 - hh, x + 7, H.h - 4);
      // Полу-листик у основания.
      bg.fillStyle(0x8FD3A5, 0.7);
      bg.fillEllipse(x + 2, H.h - 6, 5, 2.6);
    }

    // Лоза-усик в левом углу: тонкая линия + три листа.
    bg.lineStyle(1.6, 0x4E9E69, 0.75);
    bg.beginPath();
    bg.moveTo(10, H.h - 12);
    bg.lineTo(14, H.h - 22);
    bg.lineTo(11, H.h - 30);
    bg.strokePath();
    bg.fillStyle(0x6FBF87, 0.9);
    bg.fillEllipse(16, H.h - 24, 7, 4);
    bg.fillEllipse(9, H.h - 30, 6, 3.4);
    bg.fillStyle(0x8FD3A5, 0.75);
    bg.fillEllipse(14, H.h - 16, 6, 3.2);
  };
  drawBg();

  // === Монеты ===
  const coinsH = Math.min(38, H.h - 14);
  const coinsBg = scene.add.graphics();
  container.add(coinsBg);

  // Монета — нарисованная иконка, рядом — число (без эмодзи: он «прыгает»
  // по базовой линии и по-разному выглядит на Android/iOS).
  const coinIcon = scene.add.image(0, 0, ICON.coin)
    .setDisplaySize(Math.round(coinsH * 0.66), Math.round(coinsH * 0.66));
  container.add(coinIcon);

  const coinsText = scene.add.text(0, 0, '0', {
    fontSize: `${DS.font.size.md}px`,
    color: DS.colors.text.primary,
    fontFamily: DS.font.family.base,
    fontWeight: DS.font.weight.bold,
  }).setOrigin(0, 0.5);
  container.add(coinsText);

  /** Число монет обязано влезать в чип — подгоняем кегль, как у кода сада. */
  const fitCoins = () => {
    const maxW = Math.max(16, H.coins.w - 40);
    let size = DS.font.size.md;
    coinsText.setFontSize(size);
    while (coinsText.width > maxW && size > 9) {
      size -= 1;
      coinsText.setFontSize(size);
    }
  };

  const drawCoins = () => {
    const { x, w } = H.coins;
    coinsBg.clear();
    // Чип «кошелёк»: светлая карточка на тёмном дереве, золотая обводка.
    coinsBg.fillStyle(0x2C1B10, 0.35);
    coinsBg.fillRoundedRect(x, H.y - coinsH / 2 + 2, w, coinsH, coinsH / 2);
    coinsBg.fillStyle(0xFFF3D2, 1);
    coinsBg.fillRoundedRect(x, H.y - coinsH / 2, w, coinsH, coinsH / 2);
    coinsBg.fillStyle(0xFFFFFF, 0.55);
    coinsBg.fillRoundedRect(x + 4, H.y - coinsH / 2 + 3, w - 8, coinsH / 2 - 2, coinsH / 3);
    coinsBg.lineStyle(2, 0xE8C55A, 1);
    coinsBg.strokeRoundedRect(x, H.y - coinsH / 2, w, coinsH, coinsH / 2);
    coinIcon.setPosition(x + 16, H.y);
    coinsText.setPosition(x + 28, H.y);
    fitCoins();
  };
  drawCoins();

  // === Код комнаты ===
  const roomH = Math.min(38, H.h - 14);
  const roomBg = scene.add.graphics();
  container.add(roomBg);

  const roomCodeText = scene.add.text(0, 0, '…', {
    fontSize: `${DS.font.size.sm}px`,
    color: DS.colors.text.primary,
    fontFamily: DS.font.family.mono,
    fontWeight: DS.font.weight.bold,
  }).setOrigin(0.5);
  container.add(roomCodeText);

  /**
   * Код должен ВЛЕЗАТЬ в свой чип на любой ширине экрана.
   * Раньше текст был «КОД: MQ8PN3» фиксированным кеглем и вылезал за рамку
   * (на узком телефоне — за край чипа). Теперь показываем только код и
   * подбираем кегль под доступную ширину.
   */
  const fitRoomCode = () => {
    const maxW = Math.max(20, H.room.w - 18);
    let size = DS.font.size.sm;
    roomCodeText.setFontSize(size);
    while (roomCodeText.width > maxW && size > 8) {
      size -= 1;
      roomCodeText.setFontSize(size);
    }
  };

  const roomHit = scene.add.rectangle(0, 0, 1, 1, 0x000000, 0.001).setInteractive({ useHandCursor: true });
  container.add(roomHit);

  const drawRoom = () => {
    const { x, w } = H.room;
    roomBg.clear();
    // «Билет» приглашения: светлая бумажка с пунктиром — сразу читается
    // как «это можно скопировать и отправить».
    roomBg.fillStyle(0x2C1B10, 0.3);
    roomBg.fillRoundedRect(x, H.y - roomH / 2 + 2, w, roomH, 10);
    roomBg.fillStyle(0xFFFBF2, 1);
    roomBg.fillRoundedRect(x, H.y - roomH / 2, w, roomH, 10);
    roomBg.lineStyle(1.6, 0x9E7B4F, 1);
    roomBg.strokeRoundedRect(x, H.y - roomH / 2, w, roomH, 10);
    roomBg.lineStyle(1, 0xC0A276, 0.9);
    roomBg.beginPath();
    roomBg.moveTo(x + 8, H.y - roomH / 2 + 4);
    roomBg.lineTo(x + 8, H.y + roomH / 2 - 4);
    roomBg.strokePath();
    roomBg.moveTo(x + 8, H.y + roomH / 2 - 4);
    roomCodeText.setPosition(x + w / 2, H.y);
    roomHit.setPosition(x + w / 2, H.y);
    roomHit.setSize(Math.max(w, DS.touchTarget.min), DS.touchTarget.min);
    fitRoomCode();
  };
  drawRoom();

  // === Мир/сезон/фаза ===
  const worldText = scene.add.text(H.world.x, H.world.y, '', {
    fontSize: `${H.compact ? DS.font.size.sm : DS.font.size.md}px`,
    color: '#FFF6E0',
    fontFamily: DS.font.family.title,
    fontWeight: DS.font.weight.medium,
  }).setOrigin(0.5);
  worldText.setShadow(0, 1, 'rgba(28,18,10,0.75)', 2, false, true);
  container.add(worldText);

  // === Кнопки справа ===
  const muteBtn = createIconButton(scene, H.mute.x, H.mute.y, H.btn, ICON.sound, () => {
    if (scene.sound) {
      const isEnabled = scene.sound.toggleMute();
      // Нарисованные иконки звука: включён/выключен.
      muteBtn.setLabel(isEnabled ? ICON.sound : ICON.soundOff);
    }
  }, 'Вкл/выкл звук', ICON.sound);
  container.add(muteBtn);

  const menuBtn = createIconButton(scene, H.menu.x, H.menu.y, H.btn, ICON.menu, () => {
    if (scene.openMenu) scene.openMenu();
  }, 'Меню', ICON.menu);
  container.add(menuBtn);

  const apply = (next) => {
    Object.assign(H, next.hud);
    drawBg();
    drawCoins();
    drawRoom();
    worldText.setPosition(H.world.x, H.world.y);
    worldText.setFontSize(H.compact ? DS.font.size.sm : DS.font.size.md);
    muteBtn.setPosition(H.mute.x, H.mute.y);
    menuBtn.setPosition(H.menu.x, H.menu.y);
  };

  return {
    container,
    coins: coinsText,
    world: worldText,
    menuBtn,
    muteBtn,
    roomCode: roomCodeText,
    /** Показать код сада. Тап по чипу копирует ссылку-приглашение. */
    setRoomCode: (code) => {
      roomCodeText.setText(code ? String(code) : '…');
      roomCodeText.setColor(code ? DS.colors.text.primary : DS.colors.text.secondary);
      fitRoomCode();
    },
    roomHit,
    bg,
    resize: (nextLayout) => apply(nextLayout || computeLayout(scene.scale.width, scene.scale.height)),
  };
}

/**
 * Иконная кнопка (круглая/квадратная с иконкой внутри)
 */
function createIconButton(scene, x, y, size, icon, onClick, tooltip = '', iconKey = null) {
  const container = scene.add.container(x, y);
  const half = size / 2;
  const radius = DS.radius.md;

  // Тень
  const shadow = scene.add.graphics();
  drawShadowedRect(shadow, -half, -half + 2, size, size, radius, DS.colors.brand.primary, 0.15, 'sm');
  container.add(shadow);

  // Фон кнопки
  const bg = scene.add.graphics();
  const drawBg = (state) => {
    bg.clear();
    let fillColor, borderColor, borderWidth;
    switch (state) {
      case 'hover':
        fillColor = DS.colors.brand.light;
        borderColor = DS.colors.brand.primary;
        borderWidth = 2;
        break;
      case 'pressed':
        fillColor = DS.colors.brand.secondary;
        borderColor = DS.colors.brand.dark;
        borderWidth = 2;
        break;
      default:
        fillColor = DS.colors.bg.elevated;
        borderColor = DS.colors.ui.border;
        borderWidth = 1.5;
    }
    drawRoundedRect(bg, -half, -half, size, size, radius, fillColor, 1, borderColor, borderWidth);

    // Кнопка на дереве должна читаться как «выпуклая плашка»:
    // тёмное кольцо снизу + светлый блик сверху.
    bg.lineStyle(1.5, 0x2C1B10, 0.35);
    bg.strokeRoundedRect(-half + 1, -half + 2, size - 2, size - 2, radius);
    if (state !== 'pressed') {
      bg.fillStyle(0xFFFFFF, 0.35);
      bg.fillRoundedRect(-half + 4, -half + 4, size - 8, size / 2 - 2, Math.max(2, radius - 2));
    } else {
      bg.fillStyle(0x2C1B10, 0.12);
      bg.fillRoundedRect(-half + 3, -half + 3, size - 6, size - 6, Math.max(2, radius - 1));
    }
  };
  drawBg('idle');
  container.add(bg);

  // Иконка
  // Эмодзи заменяем на запечённую иконку: один вид на всех устройствах.
  // Если текстуры нет (старый набор), остаётся текстовая иконка.
  const iconSource = iconKey || icon;
  const useImage = typeof iconSource === 'string' && iconSource.startsWith('ui-icon-') && scene.textures.exists(iconSource);
  const iconText = useImage
    ? scene.add.image(0, 0, iconSource).setDisplaySize(Math.round(size * 0.56), Math.round(size * 0.56))
    : scene.add.text(0, 0, icon, {
      fontSize: `${size * 0.5}px`,
      fontFamily: 'Nunito, sans-serif',
    }).setOrigin(0.5);
  container.add(iconText);

  // Хит-зона
  const hit = scene.add.rectangle(0, 0, DS.touchTarget.min, DS.touchTarget.min, 0x000000, 0.001)
    .setInteractive({ useHandCursor: true });
  container.add(hit);

  let currentState = 'idle';
  const setState = (state) => {
    if (currentState === state) return;
    currentState = state;
    drawBg(state);
  };

  hit.on('pointerover', () => {
    setState('hover');
    if (tooltip && scene.showHint) scene.showHint(tooltip);
    scene.tweens.add({ targets: [bg, iconText], scale: 1.05, duration: DS.motion.fast, ease: DS.motion.easing.decelerate });
  });
  hit.on('pointerout', () => {
    setState('idle');
    if (tooltip && scene.showHint) scene.showHint('');
    scene.tweens.add({ targets: [bg, iconText], scale: 1, duration: DS.motion.fast, ease: DS.motion.easing.decelerate });
  });
  hit.on('pointerdown', () => {
    setState('pressed');
    scene.tweens.add({ targets: [bg, iconText], scale: 0.95, duration: DS.motion.fast/2, ease: DS.motion.easing.accelerate });
    if (typeof onClick === 'function') onClick();
    if (scene.sound) scene.sound.uiClick?.();
  });
  hit.on('pointerup', () => setState('hover'));
  hit.on('pointerupoutside', () => setState('idle'));

  container.setLabel = (newIcon) => {
    if (useImage && typeof newIcon === 'string' && scene.textures.exists(newIcon)) {
      iconText.setTexture(newIcon);
    } else if (iconText.setText) {
      iconText.setText(newIcon);
    }
  };
  container.setDisabled = (val) => {
    hit.disableInteractive();
    if (val) {
      bg.clear();
      drawRoundedRect(bg, -half, -half, size, size, radius, DS.colors.ui.divider, 0.5, DS.colors.ui.divider, 1);
      iconText.setAlpha(0.4);
    } else {
      drawBg('idle');
      iconText.setAlpha(1);
    }
  };

  return container;
}