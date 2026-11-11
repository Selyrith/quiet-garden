import Phaser from 'phaser';
import { getPlant } from '../../shared/plants.js';
import { drawPixelPlant } from './PixelArt.js';

export class InventoryBar {
  constructor(scene, y) {
    this.scene = scene;
    this.container = scene.add.container(0, y).setDepth(140);

    // Деревянная полка
    this.bg = scene.add.graphics();
    this.drawShelf();
    this.container.add(this.bg);

    this.slotsContainer = scene.add.container(0, 0);
    this.container.add(this.slotsContainer);

    this.activeSeedId = null;
    this.pageIndex = 0;
  }

  drawShelf() {
    const w = this.scene.scale.width;
    this.bg.clear();
    // Тень под полкой
    this.bg.fillStyle(0x000000, 0.4);
    this.bg.fillRoundedRect(w / 2 - w / 2 + 4, 4, w - 8, 60, 12);
    // Сама полка
    this.bg.fillStyle(0x5d4037, 1);
    this.bg.fillRoundedRect(w / 2 - w / 2, 0, w, 60, 12);
    // Ободок
    this.bg.lineStyle(3, 0x8d6e63, 1);
    this.bg.strokeRoundedRect(w / 2 - w / 2, 0, w, 60, 12);
  }

  update(inventory, activeSeedId) {
    this.activeSeedId = activeSeedId;
    this.slotsContainer.removeAll(true);

    const seedIds = Object.keys(inventory).map(Number);
    if (seedIds.length === 0) {
      const emptyText = this.scene.add.text(this.scene.scale.width / 2, 30, 'Нет семян. Загляните в Магазин', {
        fontSize: '14px', color: '#8d6e63', fontStyle: 'bold', fontFamily: 'Georgia, serif'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      emptyText.on('pointerdown', () => {
        this.scene.openShop();
      });

      this.slotsContainer.add(emptyText);
      return;
    }

    seedIds.sort((a, b) => a - b);
    const W = this.scene.scale.width;
    const maxVisible = Math.max(1, Math.floor((W - 40) / 54));
    const totalPages = Math.ceil(seedIds.length / maxVisible) || 1;
    this.pageIndex = Math.min(this.pageIndex, totalPages - 1);
    const start = this.pageIndex * maxVisible;
    const displaySeeds = seedIds.slice(start, start + maxVisible);

    const spacing = Math.min(54, (W - 40) / Math.max(displaySeeds.length, 1));
    const startX = W / 2 - ((displaySeeds.length - 1) * spacing) / 2;

    // Пагинация: стрелки ◀ / ▶ и текст N/M — unified color
    if (totalPages > 1) {
      const pageText = this.scene.add.text(W / 2, -6, `${this.pageIndex + 1}/${totalPages}`, {
        fontSize: '12px', color: '#c9a884', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.slotsContainer.add(pageText);

      const leftHit = this.scene.add.rectangle(20, -6, 44, 44, 0x000000, 0.001).setInteractive({ useHandCursor: this.pageIndex > 0 });
      const left = this.scene.add.text(20, -6, '◀', {
        fontSize: '16px', color: this.pageIndex > 0 ? '#ffffff' : '#aaaaaa',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      leftHit.on('pointerdown', () => {
        if (this.pageIndex > 0) {
          this.pageIndex--;
          this.update(this.scene.inventory, this.activeSeedId);
        }
      });
      this.slotsContainer.add([leftHit, left]);

      const rightHit = this.scene.add.rectangle(W - 20, -6, 44, 44, 0x000000, 0.001).setInteractive({ useHandCursor: this.pageIndex < totalPages - 1 });
      const right = this.scene.add.text(W - 20, -6, '▶', {
        fontSize: '16px', color: this.pageIndex < totalPages - 1 ? '#ffffff' : '#aaaaaa',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      rightHit.on('pointerdown', () => {
        if (this.pageIndex < totalPages - 1) {
          this.pageIndex++;
          this.update(this.scene.inventory, this.activeSeedId);
        }
      });
      this.slotsContainer.add([rightHit, right]);
    }

    displaySeeds.forEach((seedId, i) => {
      const count = inventory[seedId];
      const plant = getPlant(seedId);
      const x = startX + i * spacing;

      const isActive = seedId === activeSeedId;

      // Фон слота — unified color когда активный, secondary когда нет
      const bgSlot = this.scene.add.graphics();
      bgSlot.fillStyle(isActive ? 0xd8a494 : 0x8e7b63, 1);
      bgSlot.fillRoundedRect(x - 22, 8, 44, 44, 8);
      bgSlot.lineStyle(2, isActive ? 0xc9a884 : 0x5c4a3a, 1);
      bgSlot.strokeRoundedRect(x - 22, 8, 44, 44, 8);

      const hitArea = this.scene.add.rectangle(x, 30, 44, 44, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        this.scene.selectedSeedId = seedId;
        this.update(inventory, seedId);
        if (this.scene.sound) this.scene.sound.buy();

        // Onboarding step 1: семя выбрано
        if (this.scene.onboarding?.active && this.scene.onboarding.step === 1) {
          this.scene.onboarding.next();
        }
      });

      const g = this.scene.add.graphics();
      g.setPosition(x, 44);
      drawPixelPlant(g, plant, 0.6, 0, null);

      const countText = this.scene.add.text(x + 16, 46, `${count}`, {
        fontSize: '14px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
      }).setOrigin(1, 0.5);

      this.slotsContainer.add([bgSlot, hitArea, g, countText]);
    });
  }

  resize(y) {
    this.container.y = y;
    this.drawShelf();
    if (this.scene.inventory && this.scene.selectedSeedId !== undefined) {
      this.update(this.scene.inventory, this.scene.selectedSeedId);
    }
  }
}
