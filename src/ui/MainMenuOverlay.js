import Phaser from 'phaser';
import { UNIFIED, createUnifiedButton } from './ui-unified.js';

export class MainMenuOverlay extends Phaser.GameObjects.Container {
  constructor(scene, callbacks) {
    const cam = scene.cameras.main;
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(400);
    this.scene = scene;
    this.callbacks = callbacks || {};

    scene.hideSignpost?.();
    if (scene.signpostDom) { scene.signpostDom.destroy(); scene.signpostDom = null; }

    // Затемнение
    this.bg = scene.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.6)
      .setOrigin(0).setInteractive();
    this.bg.on('pointerdown', () => {});
    this.add(this.bg);

    // Центральная панель
    const isMobile = cam.width < 600;
    const panelW = Math.min(isMobile ? cam.width * 0.9 : 500, 500);
    const panelH = Math.min(isMobile ? cam.height * 0.8 : 400, 450);
    const panelX = cam.width / 2;
    const panelY = cam.height / 2;

    this.panel = scene.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1f2b, 0.98)
      .setStrokeStyle(3, 0x4a5a6a).setInteractive();
    this.add(this.panel);

    this.title = scene.add.text(panelX, panelY - panelH / 2 + 20, 'Меню', {
      fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    this.add(this.title);

    // Закрытие — Unified secondary button
    const closeHit = scene.add.rectangle(
      panelX + panelW / 2 - 24,
      panelY - panelH / 2 + 24,
      44, 44, UNIFIED.color
    ).setInteractive({ useHandCursor: true });
    closeHit.setStrokeStyle(2, UNIFIED.colorHi);
    const closeBtn = scene.add.text(
      panelX + panelW / 2 - 24,
      panelY - panelH / 2 + 24,
      '✕',
      { fontSize: '24px', color: '#3e2723', fontStyle: 'bold' }
    ).setOrigin(0.5);
    closeHit.on('pointerdown', () => this.destroy());
    this.add([closeHit, closeBtn]);

    // Сетка кнопок (2 колонки) — все единым цветом
    const items = [
      { label: '📖 Книга', action: 'onBook' },
      { label: '⭐ Улучшения', action: 'onUpgrades' },
      { label: '🎯 Цели', action: 'onGoals' },
      { label: '🎭 Роли', action: 'onRoles' },
      { label: '🛒 Магазин', action: 'onShop' },
      { label: '⏸ Пауза', action: 'onPause' },
      { label: '⚙ Настройки', action: 'onSettings' },
    ];

    const cols = 2;
    const btnW = (panelW - 60) / cols;
    const btnH = 56;
    const gapX = 12;
    const gapY = 12;
    const startX = panelX - (cols * btnW + (cols - 1) * gapX) / 2 + btnW / 2;
    const startY = panelY - panelH / 2 + 90;

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + gapX);
      const y = startY + row * (btnH + gapY);

      const btn = createUnifiedButton(scene, x, y, btnW, btnH, item.label, () => {
        const fn = this.callbacks[item.action];
        if (typeof fn === 'function') fn();
        else this.destroy();
      });
      this.add(btn);
    });
  }

  destroy(fromScene) {
    this.scene.showSignpost?.();
    super.destroy(fromScene);
  }
}
