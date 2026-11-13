import Phaser from 'phaser';
import { getPlant } from '../../shared/plants.js';
import { drawPixelPlant } from './PixelArt.js';
import { MutationsOverlay } from './MutationsOverlay.js';
import { UNIFIED, createUnifiedButton } from './ui-unified.js';
import { DS } from './DesignSystem.js';
import { MOBILE } from './MobileScale.js';
import { UI, drawPanel } from './ui-theme.js';

export class PlantDetailOverlay extends Phaser.GameObjects.Container {
  constructor(scene, seed, collection) {
    const cam = scene.cameras.main;
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.detail);
    this.scene = scene;

    const plant = getPlant(seed);
    const unlocked = collection.has(seed);

    let mutCount = 0;
    if (unlocked) {
      for (const id of collection) {
        if (typeof id === 'string' && id.startsWith(`mut_${seed}_`)) mutCount++;
      }
    }

    scene.hideSignpost?.();
    if (scene.signpostDom) { scene.signpostDom.destroy(); scene.signpostDom = null; }

    this.bg = scene.add.rectangle(0, 0, cam.width, cam.height, 0x231912, 0.64)
      .setOrigin(0).setInteractive();
    this.add(this.bg);

    const panelW = Math.min(cam.width - 16, 360);
    const panelH = Math.min(cam.height - 24, 580);
    const panelX = cam.width / 2;
    const panelY = cam.height / 2;
    this.panel = scene.add.graphics();
    drawPanel(this.panel, panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, MOBILE.radiusPanel, true);
    this.panel.setInteractive(new Phaser.Geom.Rectangle(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH), Phaser.Geom.Rectangle.Contains);
    this.add(this.panel);

    const closeHit = scene.add.rectangle(panelX + panelW / 2 - 24, panelY - panelH / 2 + 24, UNIFIED.minTouch, UNIFIED.minTouch, UNIFIED.color)
      .setInteractive({ useHandCursor: true });
    closeHit.setStrokeStyle(2, UNIFIED.colorHi);
    const closeBtn = scene.add.text(panelX + panelW / 2 - 24, panelY - panelH / 2 + 12, '✕',
      { fontSize: `${DS.font.size.lg}px`, color: UI.textDark, fontStyle: 'bold' }
    ).setOrigin(0.5, 0);
    closeHit.on('pointerdown', () => this.destroy());
    this.add([closeHit, closeBtn]);

    const compact = cam.height < 700;
    const fs = compact ? 12 : 13;
    const titleFs = compact ? 16 : 18;
    const smallFs = compact ? 10 : 11;
    const spriteSize = compact ? 70 : 100;

    let y = panelY - panelH / 2 + 50;

    if (unlocked) {
      const g = scene.add.graphics();
      g.setPosition(panelX, y + spriteSize * 0.5);
      drawPixelPlant(g, plant, spriteSize / 100, 0, null);
      this.add(g);
    } else {
      const q = scene.add.text(panelX, y + spriteSize / 2, '?', {
        fontSize: `${spriteSize * 0.6}px`, color: UI.textMuted, fontStyle: 'bold'
      }).setOrigin(0.5);
      this.add(q);
    }
    y += spriteSize + 6;

    const nameText = unlocked ? plant.name : '???';
    const nameColor = unlocked ? UI.textDark : UI.textMuted;
    this.add(scene.add.text(panelX, y, nameText, {
      fontSize: `${titleFs}px`, color: nameColor, fontStyle: 'bold'
    }).setOrigin(0.5, 0));
    y += titleFs + 6;

    if (unlocked) {
      const rarColor = '#' + plant.rarity.color.toString(16).padStart(6, '0');
      this.add(scene.add.text(panelX, y, plant.rarity.name, {
        fontSize: `${fs}px`, color: rarColor, fontStyle: 'bold'
      }).setOrigin(0.5, 0));
      y += fs + 8;

      const stats = `⏱ ${plant.growSeconds}s   ·   💰 ${plant.price}`;
      this.add(scene.add.text(panelX, y, stats, {
        fontSize: `${smallFs}px`, color: UI.textMuted
      }).setOrigin(0.5, 0));
      y += smallFs + 10;
    }

    this.add(scene.add.rectangle(panelX, y, panelW - 40, 1, UI.woodLight).setOrigin(0.5));
    y += 10;

    if (!unlocked) {
      this.add(scene.add.text(panelX, y + 15, 'Это растение ещё не открыто.', {
        fontSize: `${fs}px`, color: UI.textMuted, fontStyle: 'italic'
      }).setOrigin(0.5, 0));
      this.add(scene.add.text(panelX, y + 55,
        'Посадите его семя и соберите урожай,\nчтобы добавить его в книгу.', {
          fontSize: `${smallFs}px`, color: UI.textMuted, align: 'center', lineSpacing: 4
        }).setOrigin(0.5, 0));

      const btnY = panelY + panelH / 2 - 44;
      // Кнопка и её тач-таргет — ОДИН объект с явной глубиной.
      // Раньше невидимый прямоугольник лежал под кнопкой и перехватывал клик
      // (Phaser отдаёт его только верхнему объекту), а у самой кнопки не было
      // общей глубины с остальным содержимым панели.
      const btnHit = scene.add.rectangle(panelX, btnY, panelW - 56, MOBILE.buttonH, 0x000000, 0.001)
        .setInteractive({ useHandCursor: true })
        .setDepth(DS.overlay.detail + 2);
      this.add(btnHit);
      const btn = scene.add.rectangle(panelX, btnY, panelW - 56, MOBILE.buttonH, UNIFIED.color, 1)
        .setStrokeStyle(1.5, UNIFIED.colorLo, 0.7)
        .setDepth(DS.overlay.detail + 3);
      this.add(btn);
      this.add(scene.add.text(panelX, btnY, 'Понятно', {
        fontSize: `${MOBILE.font.label}px`, color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(DS.overlay.detail + 4));
      btnHit.on('pointerdown', () => this.destroy());
      return;
    }

    const lore = plant.lore || {};
    const contentLeft = panelX - panelW / 2 + 20;
    const wrapW = panelW - 40;
    const lineSpacing = 3;

    this.add(scene.add.text(contentLeft, y, '📖 Описание', {
      fontSize: `${fs}px`, color: UI.woodHi, fontStyle: 'bold'
    }));
    y += fs + 4;
    const desc = scene.add.text(contentLeft, y, lore.description || '', {
      fontSize: `${smallFs}px`, color: UI.textDark, wordWrap: { width: wrapW }, lineSpacing
    });
    this.add(desc);
    y += desc.height + 10;

    this.add(scene.add.text(contentLeft, y, '🌿 Среда обитания', {
      fontSize: `${fs}px`, color: UI.woodHi, fontStyle: 'bold'
    }));
    y += fs + 4;
    const habit = scene.add.text(contentLeft, y, lore.habitat || '', {
      fontSize: `${smallFs}px`, color: UI.textSecondary, wordWrap: { width: wrapW }, lineSpacing
    });
    this.add(habit);
    y += habit.height + 10;

    this.add(scene.add.text(contentLeft, y, '🌙 Легенда', {
      fontSize: `${fs}px`, color: UI.woodHi, fontStyle: 'bold'
    }));
    y += fs + 4;
    const legend = scene.add.text(contentLeft, y, lore.legend || '', {
      fontSize: `${smallFs}px`, color: UI.textSecondary, wordWrap: { width: wrapW }, lineSpacing
    });
    this.add(legend);
    y += legend.height + 10;

    if (mutCount > 0) {
      const btnY = panelY + panelH / 2 - 44;
      const openMutations = () => {
        this.destroy();
        new MutationsOverlay(scene, seed, collection);
      };
      const btnHit = scene.add.rectangle(panelX, btnY, panelW - 56, MOBILE.buttonH, 0x000000, 0.001)
        .setInteractive({ useHandCursor: true })
        .setDepth(DS.overlay.detail + 2);
      this.add(btnHit);
      const btn = scene.add.rectangle(panelX, btnY, panelW - 56, MOBILE.buttonH, UNIFIED.primary, 1)
        .setStrokeStyle(1.5, 0xffffff, 0.5)
        .setDepth(DS.overlay.detail + 3);
      this.add(btn);
      this.add(scene.add.text(panelX, btnY, `✨ Мутации: ${mutCount}`, {
        fontSize: `${MOBILE.font.label}px`, color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(DS.overlay.detail + 4));
      btnHit.on('pointerdown', openMutations);
    } else if (y < panelY + panelH / 2 - 30) {
      this.add(scene.add.text(panelX, y, lore.rarityNote || '', {
        fontSize: `${smallFs - 1}px`, color: UI.textMuted, fontStyle: 'italic',
        align: 'center', wordWrap: { width: wrapW }
      }).setOrigin(0.5, 0));
    }
  }

  destroy(fromScene) {
    this.scene.showSignpost?.();
    super.destroy(fromScene);
  }
}
