import Phaser from 'phaser';
import { DS, drawRoundedRect, drawShadowedRect, createButtonStyle } from './DesignSystem.js';
import { computeLayout } from './Layout.js';

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

  const drawBg = () => {
    bg.clear();
    drawShadowedRect(bg, 0, 0, H.w, H.h + 6, 0, DS.colors.bg.elevated, 1, 'lg');
    drawRoundedRect(bg, 0, 0, H.w, H.h, 0, DS.colors.bg.primary, 1, DS.colors.ui.divider, 1);
  };
  drawBg();

  // === Монеты ===
  const coinsH = Math.min(38, H.h - 14);
  const coinsBg = scene.add.graphics();
  container.add(coinsBg);

  const coinsText = scene.add.text(0, 0, '🪙 0', {
    fontSize: `${DS.font.size.md}px`,
    color: DS.colors.text.primary,
    fontFamily: DS.font.family.base,
    fontWeight: DS.font.weight.bold,
  }).setOrigin(0.5);
  container.add(coinsText);

  const drawCoins = () => {
    const { x, w } = H.coins;
    coinsBg.clear();
    drawShadowedRect(coinsBg, x, H.y - coinsH / 2 + 2, w, coinsH, DS.radius.md, DS.colors.bg.elevated, 1, 'sm');
    drawRoundedRect(coinsBg, x, H.y - coinsH / 2, w, coinsH, DS.radius.md, DS.colors.bg.tertiary, 1, DS.colors.ui.border, 1.5);
    coinsText.setPosition(x + w / 2, H.y);
  };
  drawCoins();

  // === Код комнаты ===
  const roomH = Math.min(38, H.h - 14);
  const roomBg = scene.add.graphics();
  container.add(roomBg);

  const roomCodeText = scene.add.text(0, 0, 'КОД: ...', {
    fontSize: `${DS.font.size.sm}px`,
    color: DS.colors.text.secondary,
    fontFamily: DS.font.family.mono,
    fontWeight: DS.font.weight.bold,
  }).setOrigin(0.5);
  container.add(roomCodeText);

  const roomHit = scene.add.rectangle(0, 0, 1, 1, 0x000000, 0.001).setInteractive({ useHandCursor: true });
  container.add(roomHit);

  const drawRoom = () => {
    const { x, w } = H.room;
    roomBg.clear();
    drawRoundedRect(roomBg, x, H.y - roomH / 2, w, roomH, DS.radius.md, DS.colors.bg.secondary, 1, DS.colors.ui.border, 1);
    roomCodeText.setPosition(x + w / 2, H.y);
    roomHit.setPosition(x + w / 2, H.y);
    roomHit.setSize(Math.max(w, DS.touchTarget.min), DS.touchTarget.min);
  };
  drawRoom();

  // === Мир/сезон/фаза ===
  const worldText = scene.add.text(H.world.x, H.world.y, '', {
    fontSize: `${H.compact ? DS.font.size.sm : DS.font.size.md}px`,
    color: DS.colors.text.primary,
    fontFamily: DS.font.family.title,
    fontWeight: DS.font.weight.medium,
  }).setOrigin(0.5);
  container.add(worldText);

  // === Кнопки справа ===
  const muteBtn = createIconButton(scene, H.mute.x, H.mute.y, H.btn, '🔊', () => {
    if (scene.sound) {
      const isEnabled = scene.sound.toggleMute();
      muteBtn.setLabel(isEnabled ? '🔊' : '🔇');
    }
  }, 'Вкл/выкл звук');
  container.add(muteBtn);

  const menuBtn = createIconButton(scene, H.menu.x, H.menu.y, H.btn, '☰', () => {
    if (scene.openMenu) scene.openMenu();
  }, 'Меню');
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
    roomHit,
    bg,
    resize: (nextLayout) => apply(nextLayout || computeLayout(scene.scale.width, scene.scale.height)),
  };
}

/**
 * Иконная кнопка (круглая/квадратная с иконкой внутри)
 */
function createIconButton(scene, x, y, size, icon, onClick, tooltip = '') {
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
    
    // Блик сверху
    if (state !== 'pressed') {
      bg.fillStyle(0xffffff, 0.1);
      bg.fillRoundedRect(-half + 4, -half + 4, size - 8, size/2 - 2, radius - 2);
    }
  };
  drawBg('idle');
  container.add(bg);

  // Иконка
  const iconText = scene.add.text(0, 0, icon, {
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

  container.setLabel = (newIcon) => { iconText.setText(newIcon); };
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