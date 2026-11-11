import Phaser from 'phaser';
import { getPlant } from '../../shared/plants.js';
import { drawPixelPlant } from './PixelArt.js';
import { MutationsOverlay } from './MutationsOverlay.js';
import { UNIFIED, createUnifiedButton } from './ui-unified.js';

export class PlantDetailOverlay extends Phaser.GameObjects.Container {
  constructor(scene, seed, collection) {
    const cam = scene.cameras.main;
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(560);
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

    this.bg = scene.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.92)
      .setOrigin(0).setInteractive();
    this.add(this.bg);

    const panelW = Math.min(cam.width - 16, 360);
    const panelH = Math.min(cam.height - 24, 580);
    const panelX = cam.width / 2;
    const panelY = cam.height / 2;
    this.panel = scene.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1f2b, 0.99)
      .setStrokeStyle(2, unlocked ? plant.rarity.color : 0x4a5a6a)
      .setInteractive();
    this.add(this.panel);

    const closeHit = scene.add.rectangle(panelX + panelW / 2 - 24, panelY - panelH / 2 + 24, 44, 44, UNIFIED.color)
      .setInteractive({ useHandCursor: true });
    closeHit.setStrokeStyle(2, UNIFIED.colorHi);
    const closeBtn = scene.add.text(panelX + panelW / 2 - 24, panelY - panelH / 2 + 12, '✕',
      { fontSize: '22px', color: '#3e2723', fontStyle: 'bold' }
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
        fontSize: `${spriteSize * 0.6}px`, color: '#556677', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.add(q);
    }
    y += spriteSize + 6;

    const nameText = unlocked ? plant.name : '???';
    const nameColor = unlocked ? '#ffffff' : '#666666';
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
        fontSize: `${smallFs}px`, color: '#94a3b8'
      }).setOrigin(0.5, 0));
      y += smallFs + 10;
    }

    this.add(scene.add.rectangle(panelX, y, panelW - 40, 1, 0x334155).setOrigin(0.5));
    y += 10;

    if (!unlocked) {
      this.add(scene.add.text(panelX, y + 15, 'Это растение ещё не открыто.', {
        fontSize: `${fs}px`, color: '#94a3b8', fontStyle: 'italic'
      }).setOrigin(0.5, 0));
      this.add(scene.add.text(panelX, y + 55,
        'Посадите его семя и соберите урожай,\nчтобы добавить его в книгу.', {
          fontSize: `${smallFs}px`, color: '#64748b', align: 'center', lineSpacing: 4
        }).setOrigin(0.5, 0));

      const btnY = panelY + panelH / 2 - 40;
      const btnHit = scene.add.rectangle(panelX, btnY, panelW - 60, 44, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      this.add(btnHit);
      const btn = scene.add.rectangle(panelX, btnY, panelW - 60, 40, 0xd8a494)
        .setStrokeStyle(1, 0xc9a884, 0.4).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => this.destroy());
      this.add(btn);
      this.add(scene.add.text(panelX, btnY, 'Понятно', {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5));
      btnHit.on('pointerdown', () => this.destroy());
      return;
    }

    const lore = plant.lore || {};
    const contentLeft = panelX - panelW / 2 + 20;
    const wrapW = panelW - 40;
    const lineSpacing = 3;

    this.add(scene.add.text(contentLeft, y, '📖 Описание', {
      fontSize: `${fs}px`, color: 0xd8a494, fontStyle: 'bold'
    }));
    y += fs + 4;
    const desc = scene.add.text(contentLeft, y, lore.description || '', {
      fontSize: `${smallFs}px`, color: '#e2e8f0', wordWrap: { width: wrapW }, lineSpacing
    });
    this.add(desc);
    y += desc.height + 10;

    this.add(scene.add.text(contentLeft, y, '🌿 Среда обитания', {
      fontSize: `${fs}px`, color: 0xd8a494, fontStyle: 'bold'
    }));
    y += fs + 4;
    const habit = scene.add.text(contentLeft, y, lore.habitat || '', {
      fontSize: `${smallFs}px`, color: '#cbd5e1', wordWrap: { width: wrapW }, lineSpacing
    });
    this.add(habit);
    y += habit.height + 10;

    this.add(scene.add.text(contentLeft, y, '🌙 Легенда', {
      fontSize: `${fs}px`, color: 0xd8a494, fontStyle: 'bold'
    }));
    y += fs + 4;
    const legend = scene.add.text(contentLeft, y, lore.legend || '', {
      fontSize: `${smallFs}px`, color: '#cbd5e1', wordWrap: { width: wrapW }, lineSpacing
    });
    this.add(legend);
    y += legend.height + 10;

    if (mutCount > 0) {
      const btnY = panelY + panelH / 2 - 40;
      const btnHit = scene.add.rectangle(panelX, btnY, panelW - 60, 44, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      this.add(btnHit);
      const btn = scene.add.rectangle(panelX, btnY, panelW - 60, 40, 0xd8a494)
        .setStrokeStyle(1, 0xc9a884).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.destroy();
        new MutationsOverlay(scene, seed, collection);
      });
      this.add(btn);
      this.add(scene.add.text(panelX, btnY, `✨ Мутации: ${mutCount}`, {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5));
      btnHit.on('pointerdown', () => {
        this.destroy();
        new MutationsOverlay(scene, seed, collection);
      });
    } else if (y < panelY + panelH / 2 - 30) {
      this.add(scene.add.text(panelX, y, lore.rarityNote || '', {
        fontSize: `${smallFs - 1}px`, color: '#64748b', fontStyle: 'italic',
        align: 'center', wordWrap: { width: wrapW }
      }).setOrigin(0.5, 0));
    }
  }

  destroy(fromScene) {
    this.scene.showSignpost?.();
    super.destroy(fromScene);
  }
}
