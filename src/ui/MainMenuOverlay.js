import Phaser from 'phaser';
import { UNIFIED, createUnifiedButton } from './ui-unified.js';
import { DS } from './DesignSystem.js';
import { MOBILE } from './MobileScale.js';
import { UI, drawPanel } from './ui-theme.js';

export class MainMenuOverlay extends Phaser.GameObjects.Container {
  constructor(scene, callbacks) {
    const cam = scene.cameras.main;
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.menu);
    this.scene = scene;
    this.callbacks = callbacks || {};

    scene.hideSignpost?.();
    if (scene.signpostDom) { scene.signpostDom.destroy(); scene.signpostDom = null; }

    // Затемнение
    this.bg = scene.add.rectangle(0, 0, cam.width, cam.height, DS.hexToPhaser(DS.uiTokens.overlay.slice(0, 7)), 0.58)
      .setOrigin(0).setInteractive();
    this.bg.on('pointerdown', () => {});
    this.add(this.bg);

    // Центральная панель
    const isMobile = cam.width < 600;
    const panelW = Math.min(isMobile ? cam.width * 0.9 : 500, 500);
    const panelH = Math.min(isMobile ? cam.height * 0.8 : 400, 450);
    const panelX = cam.width / 2;
    const panelY = cam.height / 2;

    this.panel = scene.add.graphics();
    drawPanel(this.panel, panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, MOBILE.radiusPanel, true);
    this.panel.setInteractive(new Phaser.Geom.Rectangle(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH), Phaser.Geom.Rectangle.Contains);
    this.add(this.panel);

    this.title = scene.add.text(panelX, panelY - panelH / 2 + 20, 'Меню', {
      fontSize: `${DS.font.size.xl}px`, color: UI.textDark, fontStyle: 'bold', fontFamily: UI.fontTitle
    }).setOrigin(0.5, 0);
    this.add(this.title);

    // Закрытие — Unified secondary button
    const closeHit = scene.add.rectangle(
      panelX + panelW / 2 - 24,
      panelY - panelH / 2 + 24,
      UNIFIED.minTouch, UNIFIED.minTouch, UNIFIED.color
    ).setInteractive({ useHandCursor: true });
    closeHit.setStrokeStyle(2, UNIFIED.colorHi);
    const closeBtn = scene.add.text(
      panelX + panelW / 2 - 24,
      panelY - panelH / 2 + 24,
      '✕',
      { fontSize: `${DS.font.size.xl}px`, color: UI.textDark, fontStyle: 'bold' }
    ).setOrigin(0.5);
    closeHit.on('pointerdown', () => this.destroy());
    this.add([closeHit, closeBtn]);

    // Сетка кнопок (2 колонки) — все единым цветом
    // У главного действия — акцентный вариант. Раньше все семь кнопок были
    // одинакового цвета, и меню превращалось в однородную плитку без иерархии.
    const items = [
      { label: '📖 Книга', action: 'onBook', primary: true },
      { label: '⭐ Улучшения', action: 'onUpgrades' },
      { label: '🎯 Цели', action: 'onGoals' },
      { label: '🎭 Роли', action: 'onRoles' },
      { label: '🛒 Магазин', action: 'onShop' },
      { label: '⚙ Настройки', action: 'onSettings' },
      { label: '⏸ Пауза', action: 'onPause', secondary: true },
    ];

    const cols = 2;
    const btnW = (panelW - 60) / cols;
    // На низких экранах кнопки не должны выходить за нижний край панели.
    // Высота считается по доступному месту, но остаётся в удобном диапазоне.
    const rows = Math.ceil(items.length / cols);
    const top = panelY - panelH / 2 + 78;
    const bottom = panelY + panelH / 2 - 24;
    const gapX = 12;
    const gapY = 10;
    const availableH = Math.max(180, bottom - top);
    const btnH = Math.max(44, Math.min(58, (availableH - (rows - 1) * gapY) / rows));
    const gridH = rows * btnH + (rows - 1) * gapY;
    const startX = panelX - (cols * btnW + (cols - 1) * gapX) / 2 + btnW / 2;
    const startY = top + (availableH - gridH) / 2 + btnH / 2;

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + gapX);
      const y = startY + row * (btnH + gapY);

      const btn = createUnifiedButton(scene, x, y, btnW, btnH, item.label, () => {
        const fn = this.callbacks[item.action];
        if (typeof fn === 'function') fn();
        else this.destroy();
      }, { depth: DS.overlay.menu + 2, primary: item.primary, secondary: item.secondary });
      // Кнопка уходит ВНУТРЬ контейнера оверлея: без явной глубины она
      // оказывалась ниже фоновой панели и не нажималась (topOnly).
      btn.setDepth(DS.overlay.menu + 2);
      this.add(btn);
    });
  }

  destroy(fromScene) {
    this.scene.showSignpost?.();
    super.destroy(fromScene);
  }
}
