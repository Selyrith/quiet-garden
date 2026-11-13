import Phaser from 'phaser';
import { UI, drawPanel } from './ui-theme.js';
import { UNIFIED, createUnifiedButton } from './ui-unified.js';
import { DS } from './DesignSystem.js';
import { MOBILE } from './MobileScale.js';
import { UPGRADES, getUpgradeCost } from '../../shared/upgrades.js';

export class UpgradesOverlay extends Phaser.GameObjects.Container {
  constructor(scene, coins, upgrades) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.upgrades);
    this.scene = scene;
    this.coins = coins;
    this.upgrades = upgrades;

    scene.hideSignpost?.();
    if (scene.signpostDom) { scene.signpostDom.destroy(); scene.signpostDom = null; }

    const cam = scene.cameras.main;

    this.bg = scene.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.8).setOrigin(0).setInteractive();
    this.add(this.bg);

    const panelW = Math.min(360, cam.width - 24);
    const panelH = Math.min(420, cam.height - 24);

    this.panel = scene.add.graphics();
    drawPanel(this.panel, cam.width/2 - panelW/2, cam.height/2 - panelH/2, panelW, panelH, 16, true);
    this.add(this.panel);

    this.title = scene.add.text(cam.width / 2, cam.height / 2 - panelH / 2 + 24, '⭐ Улучшения', {
      fontSize: '22px', color: '#3e2723', fontStyle: 'bold', fontFamily: UI.fontTitle
    }).setOrigin(0.5, 0);
    this.add(this.title);

    const closeHit = scene.add.rectangle(cam.width / 2 + panelW / 2 - 24, cam.height / 2 - panelH / 2 + 24, 44, 44, UNIFIED.color).setInteractive({ useHandCursor: true });
    closeHit.setStrokeStyle(2, UNIFIED.colorHi);
    const closeBtn = scene.add.text(cam.width / 2 + panelW / 2 - 24, cam.height / 2 - panelH / 2 + 24, '✕', {
      fontSize: '24px', color: '#3e2723', fontStyle: 'bold'
    }).setOrigin(0.5);
    closeHit.on('pointerdown', () => this.destroy());
    this.add([closeHit, closeBtn]);

    this.cardsContainer = scene.add.container(0, 0);
    this.add(this.cardsContainer);

    this.renderCards();
  }

  renderCards() {
    this.cardsContainer.removeAll(true);
    const cam = this.scene.cameras.main;
    const panelW = Math.min(360, cam.width - 24);
    const panelH = Math.min(420, cam.height - 24);
    const startY = cam.height / 2 - panelH / 2 + 70;
    const cardH = 84;
    const cardGap = 10;

    UPGRADES.forEach((u, i) => {
      const level = this.upgrades[u.id] || 0;
      const isMax = level >= u.maxLevel;
      const cost = isMax ? null : getUpgradeCost(u.id, level);
      const canBuy = cost != null && this.coins >= cost;

      const y = startY + i * (cardH + cardGap);
      const x = cam.width / 2;

      const cardBg = this.scene.add.graphics();
      drawPanel(cardBg, x - panelW/2 + 16, y, panelW - 32, cardH, 8, true);
      this.cardsContainer.add(cardBg);

      const icon = this.scene.add.text(x - panelW / 2 + 36, y + cardH / 2, u.icon, { fontSize: '26px' }).setOrigin(0.5);
      this.cardsContainer.add(icon);

      const name = this.scene.add.text(x - panelW / 2 + 60, y + 10, u.name, {
        fontSize: '16px', color: UI.css.textDark, fontStyle: 'bold', fontFamily: UI.fontTitle
      });
      this.cardsContainer.add(name);

      const levelText = this.scene.add.text(x - panelW / 2 + 60, y + 32, `Ур. ${level}/${u.maxLevel}`, {
        fontSize: '13px', color: UI.css.woodMid
      });
      this.cardsContainer.add(levelText);

      const bonusText = isMax
        ? `${u.unit}${Math.round(level * u.perLevel * 100)}% (макс)`
        : `${u.unit}${Math.round(level * u.perLevel * 100)}% → ${u.unit}${Math.round((level + 1) * u.perLevel * 100)}%`;

      const bonusLabel = this.scene.add.text(x - panelW / 2 + 60, y + 54, bonusText, {
        fontSize: '12px', color: '#5c4a3a', fontStyle: 'bold'
      });
      this.cardsContainer.add(bonusLabel);

      if (!isMax) {
        const btnX = x + panelW / 2 - 60;
        const btnY = y + cardH / 2;

        const btn = createUnifiedButton(this.scene, btnX, btnY, 88, 44,
          `🪙 ${cost}`, () => this.buy(u.id),
          { disabled: !canBuy, primary: canBuy, fontSize: `${MOBILE.font.caption}px`, depth: DS.overlay.upgrades + 2 });
        btn.setDepth(DS.overlay.upgrades + 2);
        this.cardsContainer.add(btn);

        if (!canBuy) {
          const disabledHint = this.scene.add.text(btnX, btnY + 24, 'Недостаточно монет', {
            fontSize: '10px', color: '#aaaaaa', fontStyle: 'italic'
          }).setOrigin(0.5);
          this.cardsContainer.add(disabledHint);
        }
      } else {
        const maxBadge = this.scene.add.circle(x + panelW / 2 - 60, y + cardH / 2, 10, UI.error);
        maxBadge.setStrokeStyle(1.5, '#ffffff');
        this.cardsContainer.add(maxBadge);
        this.cardsContainer.add(this.scene.add.text(x + panelW / 2 - 60, y + cardH / 2, 'MAX', {
          fontSize: '10px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5));
      }
    });
  }

  buy(upgradeId) {
    this.scene.socket?.emit('upgrade-buy', { upgradeId });
  }

  destroy() {
    this.scene.showSignpost?.();
    super.destroy();
  }

  update(coins, upgrades) {
    this.coins = coins;
    this.upgrades = upgrades;
    this.renderCards();
  }
}
