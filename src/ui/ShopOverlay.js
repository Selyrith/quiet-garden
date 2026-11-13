import Phaser from 'phaser';
import { UI, drawPanel } from './ui-theme.js';
import { UNIFIED, createUnifiedButton } from './ui-unified.js';
import { DS } from './DesignSystem.js';
import { MOBILE } from './MobileScale.js';
import { PACKS } from '../../shared/packs.js';

export class ShopOverlay extends Phaser.GameObjects.Container {
  constructor(scene, coins) {
    const cam = scene.cameras.main;
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.shop);
    this.scene = scene;

    scene.hideSignpost?.();
    if (scene.signpostDom) { scene.signpostDom.destroy(); scene.signpostDom = null; }

    this.bg = scene.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.85).setOrigin(0).setInteractive();
    this.add(this.bg);

    const panelW = Math.min(340, cam.width - 20);
    const panelH = Math.min(400, cam.height - 40);

    this.panel = scene.add.graphics();
    drawPanel(this.panel, cam.width/2 - panelW/2, cam.height/2 - panelH/2, panelW, panelH, 16, true);
    this.panel.setInteractive(new Phaser.Geom.Rectangle(cam.width/2 - panelW/2, cam.height/2 - panelH/2, panelW, panelH), Phaser.Geom.Rectangle.Contains);
    this.add(this.panel);

    this.title = scene.add.text(cam.width / 2, cam.height / 2 - panelH / 2 + 24, '🛒 Магазин семян', {
      fontSize: '24px', color: UI.textDark, fontStyle: 'bold', fontFamily: UI.fontTitle
    }).setOrigin(0.5, 0);
    this.add(this.title);

    this.coinsText = scene.add.text(cam.width / 2, cam.height / 2 - panelH / 2 + 56, `🪙 ${coins}`, {
      fontSize: '18px', color: UI.textDark, fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    this.add(this.coinsText);

    const closeHit = scene.add.rectangle(cam.width / 2 + panelW / 2 - 24, cam.height / 2 - panelH / 2 + 24, 44, 44, UNIFIED.color).setInteractive({ useHandCursor: true });
    closeHit.setStrokeStyle(2, UNIFIED.colorHi);
    const closeBtn = scene.add.text(cam.width / 2 + panelW / 2 - 24, cam.height / 2 - panelH / 2 + 24, '✕', {
      fontSize: '24px', color: '#3e2723', fontStyle: 'bold'
    }).setOrigin(0.5);
    closeHit.on('pointerdown', () => this.destroy());
    this.add([closeHit, closeBtn]);

    let y = cam.height / 2 - panelH / 2 + 90;

    Object.values(PACKS).forEach((pack) => {
      const cardW = panelW - 40;
      const cardH = 84;

      const cardBg = scene.add.graphics();
      drawPanel(cardBg, cam.width/2 - cardW/2, y, cardW, cardH, 10, true);
      this.add(cardBg);

      const titleText = scene.add.text(cam.width / 2 - cardW / 2 + 16, y + 10, pack.name, {
        fontSize: '17px', color: UI.textDark, fontStyle: 'bold', fontFamily: UI.fontTitle,
        wordWrap: { width: cardW - 110, useAdvancedWrap: true }
      });
      this.add(titleText);

      const descText = scene.add.text(cam.width / 2 - cardW / 2 + 16, y + 32, pack.desc, {
        fontSize: '12px', color: UI.woodMid,
        wordWrap: { width: cardW - 110, useAdvancedWrap: true }
      });
      this.add(descText);

      const isAffordable = coins >= pack.price;
      const btnX = cam.width / 2 + cardW / 2 - 84;
      const btnY = y + cardH / 2 - 18;
      const btnW = 80;
      const btnH = 36;

      const btn = createUnifiedButton(scene, btnX + btnW / 2, btnY + btnH / 2, btnW, btnH,
        `Купить 🪙 ${pack.price}`, () => {
          if (this.scene.coins >= pack.price) {
            this.scene.socket.emit('buy-pack', { packId: pack.id });
            this.destroy();
          } else {
            this.scene.showToast('Не хватает монет!');
            this.scene.sound.error();
          }
        }, { disabled: !isAffordable, primary: isAffordable, fontSize: `${MOBILE.font.caption}px`, depth: DS.overlay.shop + 2 });
      btn.setDepth(DS.overlay.shop + 2);
      this.add(btn);

      y += cardH + 12;
    });
  }

  destroy() {
    this.scene.showSignpost?.();
    super.destroy();
  }
}
