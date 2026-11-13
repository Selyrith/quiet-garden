import Phaser from 'phaser';
import { getPlant } from '../../shared/plants.js';
import { drawPixelPlant } from './PixelArt.js';
import { DS } from './DesignSystem.js';
import { UNIFIED } from './ui-unified.js';
import { UI } from './ui-theme.js';

export class PackOpeningOverlay extends Phaser.GameObjects.Container {
  constructor(scene, seeds) {
    const cam = scene.cameras.main;
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.pack);
    this.scene = scene;

    this.bg = scene.add.rectangle(0, 0, cam.width, cam.height, 0x231912, 0.62).setOrigin(0).setInteractive();
    this.add(this.bg);

    this.title = scene.add.text(cam.width / 2, cam.height / 2 - 120, 'Открываем пак...', {
      fontSize: `${DS.font.size.xl}px`, color: UI.textLight, fontStyle: 'bold', fontFamily: UI.fontTitle
    }).setOrigin(0.5);
    this.add(this.title);

    this.cards = [];
    const count = seeds.length;
    const spacing = 100;
    const startX = cam.width / 2 - ((count - 1) * spacing) / 2;

    seeds.forEach((seed, i) => {
      const plant = getPlant(seed);
      const x = startX + i * spacing;
      const y = cam.height / 2;

      const cardBg = scene.add.rectangle(x, y, 80, 120, UI.parchment)
        .setStrokeStyle(2, UI.woodLight)
        .setScale(0);
      this.add(cardBg);
      this.cards.push(cardBg);

      // Создаем контейнер для содержимого карточки (появится позже)
      const content = scene.add.container(x, y).setAlpha(0);

      const innerBg = scene.add.rectangle(0, 0, 76, 116, 0xf8f4ee)
        .setStrokeStyle(2, plant.rarity.color);
      content.add(innerBg);

      const g = scene.add.graphics();
      g.setPosition(0, 40);
      drawPixelPlant(g, plant, 1.2, 0, null);
      content.add(g);

      const nameText = scene.add.text(0, -45, plant.name, {
        fontSize: '10px', color: UI.textDark, align: 'center', wordWrap: { width: 70 }
      }).setOrigin(0.5);
      content.add(nameText);

      this.add(content);
      this.cards.push(content);

      // Анимация появления
      scene.tweens.add({
        targets: cardBg,
        scale: 1,
        duration: 300,
        delay: i * 200,
        ease: 'Back.easeOut'
      });

      // Эффект переворота (просто смена альфы для простоты)
      scene.tweens.add({
        targets: cardBg,
        alpha: 0,
        duration: 200,
        delay: 500 + i * 200,
        onComplete: () => cardBg.destroy()
      });
      scene.tweens.add({
        targets: content,
        alpha: 1,
        duration: 300,
        delay: 600 + i * 200,
        ease: 'Cubic.easeOut'
      });
    });

    // Кнопка закрытия появится после всех анимаций — единый цвет, 44×44 тач-таргет
    scene.time.delayedCall(1000 + seeds.length * 200, () => {
      this.title.setText('Ваши новые семена!');
      const btnX = cam.width / 2;
      const btnY = cam.height / 2 + 150;
      const btnW = 160;
      const btnH = 44;

      const btnHit = scene.add.rectangle(btnX, btnY, Math.max(btnW, 44), Math.max(btnH, 44), 0x000000, 0.001).setInteractive({ useHandCursor: true });
      const btn = scene.add.rectangle(btnX, btnY, btnW, btnH, 0xd8a494)
        .setStrokeStyle(2, 0xffffff);
      const txt = scene.add.text(btnX, btnY, 'Отлично!', {
        fontSize: `${DS.font.size.base}px`, color: UNIFIED.text, fontStyle: 'bold'
      }).setOrigin(0.5);

      const closeAction = () => this.destroy();
      btnHit.on('pointerdown', closeAction);
      btn.on('pointerdown', closeAction);
      this.add([btnHit, btn, txt]);
    });
  }
}
