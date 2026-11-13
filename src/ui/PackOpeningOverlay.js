import Phaser from 'phaser';
import { getPlant } from '../../shared/plants.js';
import { drawPixelPlant, drawOutlinedPlant } from './PixelArt.js';
import { DS } from './DesignSystem.js';
import { createButton, color } from './ui-kit.js';

/**
 * Открытие набора семян — «конвертики с семенами».
 *
 * Было: карточки 80×120 появлялись и тут же исчезали (эффект «переворота» —
 * просто смена альфы), затем кнопка «Отлично!» приезжает через setTimeout.
 * Стало: конверт с восковой печатью, раскрывающийся в семя; внизу — ряд
 * карточек-семян с названием и редкостью, кнопка появляется, когда все
 * конверты раскрыты.
 */
export class PackOpeningOverlay extends Phaser.GameObjects.Container {
  constructor(scene, seeds) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.pack);
    this.scene = scene;
    this.seeds = seeds;
    this._destroyed = false;

    const cam = scene.cameras.main;

    // Своё затемнение: у пака нет панели, он «сам по себе» на весь экран.
    this.scrim = scene.add.rectangle(0, 0, cam.width, cam.height, 0x231912, 0.72)
      .setOrigin(0)
      .setInteractive();
    this.scrim.on('pointerdown', () => {
      if (this.canClose) this.destroy();
    });
    this.add(this.scrim);

    this.renderOpening();
  }

  renderOpening() {
    const scene = this.scene;
    const cam = scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    this.cx = cx;
    this.cy = cy;

    // Заголовок-скороговорка в духе игры.
    this.title = scene.add.text(cx, cy - Math.min(210, cam.height * 0.3), 'Раскрываем пак...', {
      fontSize: `${DS.font.size.xl}px`,
      fontFamily: DS.font.family.title,
      color: DS.colors.text.inverse,
      align: 'center',
    }).setOrigin(0.5).setShadow(0, 3, 'rgba(43,28,18,0.8)', 8);
    this.add(this.title);

    const subtitle = scene.add.text(cx, this.title.y + 34, 'Тёплые семена уже спешат в сад', {
      fontSize: `${DS.font.size.sm}px`,
      fontFamily: DS.font.family.base,
      color: 'rgba(252,248,240,0.75)',
    }).setOrigin(0.5);
    this.add(subtitle);

    const count = this.seeds.length;
    const spacing = Math.min(108, (cam.width - 60) / Math.max(1, count));
    const startX = cx - ((count - 1) * spacing) / 2;
    const cardY = cy + 10;
    this.cardY = cardY;

    this.cards = [];

    this.seeds.forEach((seed, i) => {
      const plant = getPlant(seed);
      const x = startX + i * spacing;
      const sealDelay = 220 + i * 190;

      // Конверт: прямоугольник с клапаном и печатью.
      const envelope = scene.add.container(x, cardY);
      const envG = scene.add.graphics();
      const envW = 84;
      const envH = 108;

      envG.fillStyle(0xe9dcc0, 1);
      envG.fillRoundedRect(-envW / 2, -envH / 2, envW, envH, 8);
      envG.fillStyle(0xdcc9a4, 1);
      envG.fillTriangle(-envW / 2 + 4, -envH / 2 + 4, envW / 2 - 4, -envH / 2 + 4, 0, envH / 2 - 34);
      envG.lineStyle(2, 0xbcab8a, 1);
      envG.strokeRoundedRect(-envW / 2, -envH / 2, envW, envH, 8);

      const seal = scene.add.circle(0, 6, 14, color(DS.colors.text.accent), 1)
        .setStrokeStyle(2, '#a9523b', 1);
      const sealIcon = scene.add.text(0, 5, '🌱', {
        fontSize: '13px',
        fontFamily: DS.font.family.base,
      }).setOrigin(0.5);

      envelope.add([envG, seal, sealIcon]);
      envelope.setScale(0.6);
      envelope.setAlpha(0);
      this.add(envelope);

      // Появление конверта.
      scene.tweens.add({
        targets: envelope,
        scale: 1,
        alpha: 1,
        duration: 320,
        delay: i * 120,
        ease: 'Back.easeOut',
      });

      // Раскрытие: конверт сжимается и растворяется, на его месте — карточка.
      const card = this.buildSeedCard(plant, seed, x, cardY);
      card.setAlpha(0);
      card.setScale(0.9);
      this.add(card);

      scene.tweens.add({
        targets: envelope,
        scaleY: 0.06,
        alpha: 0,
        duration: 260,
        delay: sealDelay + 260,
        ease: 'Cubic.easeIn',
        onComplete: () => envelope.destroy(),
      });

      scene.tweens.add({
        targets: card,
        alpha: 1,
        scale: 1,
        duration: 340,
        delay: sealDelay + 330,
        ease: 'Back.easeOut',
      });

      this.cards.push(card);
    });

    const lastDelay = 220 + (count - 1) * 190 + 330 + 340;

    scene.time.delayedCall(lastDelay, () => {
      this.title.setText('Ваши новые семена!');
      subtitle.setText('Семена уже в инвентаре — можно сажать');
      this.spawnCloseButton();
    });
  }

  buildSeedCard(plant, seed, x, y) {
    const scene = this.scene;
    const c = scene.add.container(x, y);
    const w = 88;
    const h = 118;

    const rarityColor = plant.rarity?.color ?? 0xcdbb9b;
    const g = scene.add.graphics();
    g.fillStyle(0xf7ecd5, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.lineStyle(2.5, rarityColor, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.fillStyle(0xfffdf8, 0.4);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, 18, 8);
    c.add(g);

    const art = scene.add.graphics();
    art.setPosition(0, h / 2 - 30);
    drawOutlinedPlant(art, plant, 0.86, null);
    c.add(art);

    const name = scene.add.text(0, -h / 2 + 16, plant.name, {
      fontSize: '10px',
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: '#4a3423',
      align: 'center',
      wordWrap: { width: w - 12 },
    }).setOrigin(0.5, 0);
    c.add(name);

    const rar = scene.add.text(0, h / 2 - 12, plant.rarity?.name || '', {
      fontSize: '8px',
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: `#${rarityColor.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);
    c.add(rar);

    // Искры по краю — «ценность».
    const sparkle = scene.add.text(w / 2 - 10, -h / 2 + 10, '✦', {
      fontSize: '11px',
      fontFamily: DS.font.family.base,
      color: '#f0d585',
    }).setOrigin(0.5);
    c.add(sparkle);
    scene.tweens.add({
      targets: sparkle,
      alpha: { from: 0.35, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    return c;
  }

  spawnCloseButton() {
    const scene = this.scene;
    const cam = scene.cameras.main;
    const btnY = Math.min(this.cy + 150, cam.height - 40);

    const button = createButton(scene, cam.width / 2, btnY, 200, 50, 'Отлично!', () => {
      this.canClose = true;
      this.destroy();
    }, {
      variant: 'primary',
      fontSize: DS.font.size.lg,
    });
    this.add(button);
    button.setScale(0.9);
    button.setAlpha(0);
    scene.tweens.add({ targets: button, scale: 1, alpha: 1, duration: 240, ease: 'Back.easeOut' });

    this.canClose = true;
  }

  destroy(fromScene) {
    if (this._destroyed) return;
    this._destroyed = true;
    try { super.destroy(fromScene); } catch {}
  }
}