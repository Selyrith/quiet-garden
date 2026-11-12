import Phaser from 'phaser';
import { DS, drawRoundedRect, drawShadowedRect, createButtonStyle } from './DesignSystem.js';

export function createTopBar(scene, camW) {
  const container = scene.add.container(0, 0).setDepth(DS.depth.hud);

  // Фон верхней панели с виньеткой
  const bg = scene.add.graphics();
  // Тень
  drawShadowedRect(bg, 0, 0, camW, 70, DS.radius.none, DS.colors.bg.elevated, 1, 'lg');
  // Сама панель
  drawRoundedRect(bg, 0, 0, camW, 64, 0, DS.colors.bg.primary, 1, DS.colors.ui.divider, 1);
  container.add(bg);

  // === Монеты ===
  const coinsX = 16;
  const coinsY = 32;
  const coinsW = 100;
  const coinsH = 38;

  const coinsBg = scene.add.graphics();
  drawShadowedRect(coinsBg, coinsX, coinsY - coinsH/2 + 2, coinsW, coinsH, DS.radius.md, DS.colors.bg.elevated, 1, 'sm');
  drawRoundedRect(coinsBg, coinsX, coinsY - coinsH/2, coinsW, coinsH, DS.radius.md, DS.colors.bg.tertiary, 1, DS.colors.ui.border, 1.5);
  container.add(coinsBg);

  const coinsText = scene.add.text(coinsX + coinsW/2, coinsY, '🪙 0', {
    fontSize: `${DS.font.size.md}px`,
    color: DS.colors.text.primary,
    fontFamily: DS.font.family.base,
    fontWeight: DS.font.weight.bold,
  }).setOrigin(0.5);
  container.add(coinsText);

  // === Код комнаты ===
  const roomX = coinsX + coinsW + 12;
  const roomY = 32;
  const roomW = 100;
  const roomH = 28;

  const roomBg = scene.add.graphics();
  drawShadowedRect(roomBg, roomX, roomY - roomH/2 + 1, roomW, roomH, DS.radius.sm, DS.colors.bg.elevated, 1, 'sm');
  drawRoundedRect(roomBg, roomX, roomY - roomH/2, roomW, roomH, DS.radius.sm, DS.colors.bg.secondary, 1, DS.colors.brand.primary, 1.5);
  container.add(roomBg);

  const roomCodeText = scene.add.text(roomX + roomW/2, roomY, 'КОД: ...', {
    fontSize: `${DS.font.size.xs}px`,
    color: DS.colors.brand.dark,
    fontFamily: DS.font.family.mono,
    fontWeight: DS.font.weight.bold,
  }).setOrigin(0.5);
  container.add(roomCodeText);

  const roomHit = scene.add.rectangle(roomX + roomW/2, roomY, Math.max(roomW, DS.touchTarget.min), DS.touchTarget.min, 0x000000, 0.001)
    .setInteractive({ useHandCursor: true });
  container.add(roomHit);

  // === Мир/сезон/фаза ===
  const worldX = camW / 2;
  const worldY = 32;

  const worldText = scene.add.text(worldX, worldY, '', {
    fontSize: `${DS.font.size.md}px`,
    color: DS.colors.text.primary,
    fontFamily: DS.font.family.title,
    fontWeight: DS.font.weight.medium,
  }).setOrigin(0.5);
  container.add(worldText);

  // === Кнопки справа ===
  const btnSize = 48;
  const gap = 8;
  const rightMargin = 12;
  const muteX = camW - rightMargin - btnSize/2;
  const menuX = muteX - btnSize - gap;

  // Кнопка звука
  const muteBtn = createIconButton(scene, muteX, worldY, btnSize, '🔊', () => {
    if (scene.sound) {
      const isEnabled = scene.sound.toggleMute();
      muteBtn.setLabel(isEnabled ? '🔊' : '🔇');
    }
  }, 'Вкл/выкл звук');
  container.add(muteBtn);

  // Кнопка меню
  const menuBtn = createIconButton(scene, menuX, worldY, btnSize, '☰', () => {
    if (scene.openMenu) scene.openMenu();
  }, 'Меню');
  container.add(menuBtn);

  return { 
    container, 
    coins: coinsText, 
    world: worldText, 
    menuBtn, 
    muteBtn,
    roomCode: roomCodeText,
    roomHit,
    bg 
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