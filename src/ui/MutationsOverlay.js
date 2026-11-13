import Phaser from 'phaser';
import { getPlant } from '../../shared/plants.js';
import { MUTATION_COUNT, getMutation } from '../../shared/mutations.js';
import { drawPixelPlant } from './PixelArt.js';
import { UNIFIED } from './ui-unified.js';
import { DS } from './DesignSystem.js';
import { MOBILE } from './MobileScale.js';
import { UI, drawPanel } from './ui-theme.js';

const MUT_PER_PAGE = 20;

export class MutationsOverlay extends Phaser.GameObjects.Container {
  constructor(scene, plantSeed, collection) {
    const cam = scene.cameras.main;
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.detail);
    this.scene = scene;
    this.plantSeed = plantSeed;
    this.collection = collection;
    this.page = 0;
    this.totalPages = Math.ceil(MUTATION_COUNT / MUT_PER_PAGE);

    scene.hideSignpost?.();
    if (scene.signpostDom) { scene.signpostDom.destroy(); scene.signpostDom = null; }

    this.bg = scene.add.rectangle(0, 0, cam.width, cam.height, 0x231912, 0.62).setOrigin(0).setInteractive();
    this.add(this.bg);

    const panelW = Math.min(360, cam.width - 20);
    const panelH = Math.min(420, cam.height - 40);
    this.panel = scene.add.graphics();
    drawPanel(this.panel, cam.width / 2 - panelW / 2, cam.height / 2 - panelH / 2, panelW, panelH, MOBILE.radiusPanel, true);
    this.add(this.panel);

    const plant = getPlant(plantSeed);
    this.title = scene.add.text(cam.width / 2, cam.height / 2 - panelH / 2 + 16, `Мутации: ${plant.name}`, {
      fontSize: `${DS.font.size.base}px`, color: UI.css.textDark, fontStyle: 'bold', fontFamily: UI.fontTitle
    }).setOrigin(0.5, 0);
    this.add(this.title);

    const closeHitArea = scene.add.rectangle(cam.width / 2 + panelW / 2 - 24, cam.height / 2 - panelH / 2 + 24, UNIFIED.minTouch, UNIFIED.minTouch, UNIFIED.color)
      .setInteractive({ useHandCursor: true })
      .setDepth(DS.overlay.detail + 4);
    closeHitArea.setStrokeStyle(2, UNIFIED.colorHi);
    const closeBtn = scene.add.text(cam.width / 2 + panelW / 2 - 24, cam.height / 2 - panelH / 2 + 12, '✕', {
      fontSize: `${DS.font.size.lg}px`, color: UI.css.textDark, fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    closeHitArea.on('pointerdown', () => this.destroy());
    this.add([closeHitArea, closeBtn]);

    this.grid = scene.add.container(0, 0);
    this.add(this.grid);

    this.pagerText = scene.add.text(cam.width / 2, cam.height / 2 + panelH / 2 - 24, '', {
      fontSize: `${DS.font.size.xs}px`, color: UI.css.textMuted
    }).setOrigin(0.5);
    this.add(this.pagerText);

    this.prevBtn = scene.add.text(cam.width / 2 - panelW / 2 + 30, cam.height / 2 + panelH / 2 - 24, '◀', {
      fontSize: `${DS.font.size.lg}px`, color: UI.css.textMuted
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(DS.overlay.detail + 4);
    this.add(this.prevBtn);

    this.nextBtn = scene.add.text(cam.width / 2 + panelW / 2 - 30, cam.height / 2 + panelH / 2 - 24, '▶', {
      fontSize: `${DS.font.size.lg}px`, color: UI.css.textDark
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(DS.overlay.detail + 4);
    this.add(this.nextBtn);

    this.prevBtn.on('pointerdown', () => this.changePage(-1));
    this.nextBtn.on('pointerdown', () => this.changePage(1));

    this.renderPage();
  }

  changePage(delta) {
    const newPage = this.page + delta;
    if (newPage < 0 || newPage >= this.totalPages) return;
    this.page = newPage;
    this.renderPage();
  }

  renderPage() {
    this.grid.removeAll(true);
    const cam = this.scene.cameras.main;
    const plant = getPlant(this.plantSeed);
    const panelW = Math.min(360, cam.width - 20);
    const panelH = Math.min(420, cam.height - 40);

    const cols = 5;
    const cardSize = 46;
    const gap = 8;
    const startX = cam.width / 2 - (cols * (cardSize + gap) - gap) / 2 + cardSize / 2;
    const startY = cam.height / 2 - panelH / 2 + 60;

    const startIndex = this.page * MUT_PER_PAGE;
    const endIndex = Math.min(startIndex + MUT_PER_PAGE, MUTATION_COUNT);

    for (let i = startIndex; i < endIndex; i++) {
      const localIdx = i - startIndex;
      const row = Math.floor(localIdx / cols);
      const col = localIdx % cols;
      const x = startX + col * (cardSize + gap);
      const y = startY + row * (cardSize + gap) + cardSize / 2;

      const mutId = `mut_${this.plantSeed}_${i}`;
      const unlocked = this.collection.has(mutId);
      const mut = getMutation(this.plantSeed, i);

      const card = this.scene.add.container(x, y);

      // Card border — unified color when unlocked, secondary when locked
      let borderColor = unlocked ? 0xd8a494 : 0x333333;

      const bgCard = this.scene.add.rectangle(0, 0, cardSize, cardSize, unlocked ? 0x2c3e50 : 0x1c2833)
        .setStrokeStyle(2, borderColor);
      card.add(bgCard);

      if (unlocked) {
        const g = this.scene.add.graphics();
        g.setPosition(0, cardSize / 2 - 4);
        drawPixelPlant(g, plant, cardSize / 110, 0, i);
        card.add(g);
      } else {
        card.add(this.scene.add.text(0, 0, '?', { fontSize: '14px', color: '#444' }).setOrigin(0.5));
      }

      card.setInteractive(new Phaser.Geom.Rectangle(-cardSize / 2, -cardSize / 2, cardSize, cardSize), Phaser.Geom.Rectangle.Contains);
      card.on('pointerdown', () => {
        // ФИКС: guard на mut !== null. Раньше при out-of-range индексе падало на mut.mult.toFixed.
        if (unlocked && mut) {
          this.scene.showToast(`${mut.name}\nБонус: x${mut.mult.toFixed(1)}`);
        }
      });

      this.grid.add(card);
    }

    this.pagerText.setText(`Стр. ${this.page + 1} / ${this.totalPages}`);
    this.prevBtn.setAlpha(this.page > 0 ? 1 : 0.4);
    this.nextBtn.setAlpha(this.page < this.totalPages - 1 ? 1 : 0.4);
  }

  destroy() {
    this.scene.showSignpost?.();
    super.destroy();
  }
}
