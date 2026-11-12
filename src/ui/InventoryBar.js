import Phaser from 'phaser';
import { getPlant } from '../../shared/plants.js';
import { drawPixelPlant } from './PixelArt.js';
import { getSeedSellPrice } from '../../shared/balance.js';
import { DS, drawRoundedRect, drawShadowedRect, createButtonStyle } from './DesignSystem.js';

export class InventoryBar {
  constructor(scene, y) {
    this.scene = scene;
    this.container = scene.add.container(0, y).setDepth(DS.depth.inventory);
    this.bg = scene.add.graphics();
    this.drawShelf();
    this.container.add(this.bg);

    this.slotsContainer = scene.add.container(0, 0);
    this.container.add(this.slotsContainer);

    this.activeSeedId = null;
    this.pageIndex = 0;
    this.hintText = null;
  }

  drawShelf() {
    const w = this.scene.scale.width;
    const h = 72; // чуть выше под тень
    this.bg.clear();

    // Тень под полкой (layered)
    drawShadowedRect(this.bg, 8, 4, w - 16, h - 4, DS.radius.lg, DS.colors.bg.elevated, 1, 'lg');

    // Сама полка - тёплый деревянный тон
    drawRoundedRect(this.bg, 8, 0, w - 16, h, DS.radius.lg, DS.colors.garden.fence, 1, DS.colors.garden.soilDark, 2);

    // Легкая текстура досок (тонкие линии)
    this.bg.lineStyle(1, DS.colors.garden.soil, 0.3);
    for (let i = 1; i < 4; i++) {
      const yLine = (h / 4) * i;
      this.bg.beginPath();
      this.bg.moveTo(20, yLine);
      this.bg.lineTo(w - 20, yLine);
      this.bg.strokePath();
    }
  }

  update(inventory, activeSeedId) {
    this.activeSeedId = activeSeedId;
    this.slotsContainer.removeAll(true);

    // Подсказка внизу экрана
    if (!this.hintText) {
      this.hintText = this.scene.add.text(this.scene.scale.width / 2, 68, '', {
        fontSize: `${DS.font.size.xs}px`,
        color: DS.colors.text.muted,
        fontFamily: DS.font.family.base,
        align: 'center',
        wordWrap: { width: this.scene.scale.width - 40 }
      }).setOrigin(0.5, 1).setDepth(DS.depth.toolbar + 10);
      this.slotsContainer.add(this.hintText);
    }

    // Явная кнопка продажи выбранного семени
    if (activeSeedId != null && (inventory[activeSeedId] || 0) > 0) {
      const plantSel = getPlant(activeSeedId);
      const sellVal = getSeedSellPrice(plantSel?.price ?? 6);
      this.createSellButton(sellVal, plantSel?.name ?? 'семя');
    }

    const seedIds = Object.keys(inventory).map(Number);
    if (seedIds.length === 0) {
      this.createEmptyState();
      return;
    }

    seedIds.sort((a, b) => a - b);
    const W = this.scene.scale.width;
    const slotSize = 56; // 56px = комфортный тач-тагрет (DS.touchTarget.comfortable)
    const gap = 8;
    const maxVisible = Math.max(1, Math.floor((W - 40) / (slotSize + gap)));
    const totalPages = Math.ceil(seedIds.length / maxVisible) || 1;
    this.pageIndex = Math.min(this.pageIndex, totalPages - 1);
    const start = this.pageIndex * maxVisible;
    const displaySeeds = seedIds.slice(start, start + maxVisible);

    const spacing = slotSize + gap;
    const startX = W / 2 - ((displaySeeds.length - 1) * spacing) / 2 + slotSize / 2;

    // Пагинация
    if (totalPages > 1) {
      this.createPagination(W, totalPages);
    }

    displaySeeds.forEach((seedId, i) => {
      const count = inventory[seedId];
      const plant = getPlant(seedId);
      const x = startX + i * spacing;

      const isActive = seedId === activeSeedId;
      this.createSeedSlot(x, 28, seedId, plant, count, isActive);
    });
  }

  createSellButton(sellVal, plantName) {
    const W = this.scene.scale.width;
    const btnStyle = createButtonStyle('danger', 'sm');
    const btnX = W - 60;
    const btnY = 32;

    // Тень кнопки
    const shadow = this.scene.add.graphics();
    drawShadowedRect(shadow, btnX - btnStyle.px, btnY - btnStyle.h / 2 + 2, btnStyle.px * 2 + 20, btnStyle.h, btnStyle.radius, DS.colors.semantic.error, 0.2, 'sm');

    // Кнопка
    const btnBg = this.scene.add.graphics();
    drawRoundedRect(btnBg, btnX - btnStyle.px, btnY - btnStyle.h / 2, btnStyle.px * 2 + 20, btnStyle.h, btnStyle.radius, btnStyle.bg, 1);

    const btnText = this.scene.add.text(btnX, btnY, `💰 ${sellVal}`, {
      fontSize: `${btnStyle.text}px`,
      color: btnStyle.text,
      fontFamily: DS.font.family.base,
      fontWeight: DS.font.weight.bold,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnText.on('pointerdown', () => this.sellSelected());
    btnText.on('pointerover', () => {
      this.showHint(`Продать «${plantName}» за ${sellVal} 🪙`);
      btnText.setScale(1.05);
    });
    btnText.on('pointerout', () => {
      this.hideHint();
      btnText.setScale(1);
    });
    btnText.on('pointerup', () => btnText.setScale(1));
    btnText.on('pointerout', () => btnText.setScale(1));

    this.slotsContainer.add([shadow, btnBg, btnText]);
  }

  createEmptyState() {
    const W = this.scene.scale.width;
    const btnStyle = createButtonStyle('primary', 'md');

    const text = this.scene.add.text(W / 2, 28, '🌱 Семян пока нет', {
      fontSize: `${DS.font.size.md}px`,
      color: DS.colors.text.secondary,
      fontFamily: DS.font.family.base,
      fontWeight: DS.font.weight.medium,
    }).setOrigin(0.5);

    const subText = this.scene.add.text(W / 2, 52, 'Загляните в Магазин →', {
      fontSize: `${DS.font.size.sm}px`,
      color: DS.colors.text.muted,
      fontFamily: DS.font.family.base,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    subText.on('pointerdown', () => this.scene.openShop());
    subText.on('pointerover', () => {
      subText.setColor(DS.colors.brand.primary);
      subText.setStyle({ textDecoration: 'underline' });
    });
    subText.on('pointerout', () => {
      subText.setColor(DS.colors.text.muted);
      subText.setStyle({ textDecoration: 'none' });
    });

    this.slotsContainer.add([text, subText]);
  }

  createPagination(W, totalPages) {
    const btnStyle = createButtonStyle('ghost', 'sm');
    const y = -8;

    const pageText = this.scene.add.text(W / 2, y, `${this.pageIndex + 1}/${totalPages}`, {
      fontSize: `${DS.font.size.sm}px`,
      color: DS.colors.text.secondary,
      fontFamily: DS.font.family.base,
      fontWeight: DS.font.weight.semi,
    }).setOrigin(0.5);

    // Left arrow
    const leftEnabled = this.pageIndex > 0;
    const leftBg = this.scene.add.graphics();
    drawRoundedRect(leftBg, 12, y - btnStyle.h / 2, 40, btnStyle.h, btnStyle.radius,
      leftEnabled ? btnStyle.bg : DS.colors.ui.divider, leftEnabled ? 1 : 0.5,
      leftEnabled ? btnStyle.border : DS.colors.ui.divider, 1);

    const leftText = this.scene.add.text(32, y, '◀', {
      fontSize: `${DS.font.size.md}px`,
      color: leftEnabled ? DS.colors.text.inverse : DS.colors.text.muted,
      fontFamily: DS.font.family.base,
    }).setOrigin(0.5);

    const leftHit = this.scene.add.rectangle(32, y, 44, 44, 0x000000, 0.001)
      .setInteractive({ useHandCursor: leftEnabled });

    if (leftEnabled) {
      leftHit.on('pointerdown', () => {
        this.pageIndex--;
        this.update(this.scene.inventory, this.activeSeedId);
        if (this.scene.sound) this.scene.sound.uiClick();
      });
      leftHit.on('pointerover', () => leftText.setScale(1.1));
      leftHit.on('pointerout', () => leftText.setScale(1));
    }

    // Right arrow
    const rightEnabled = this.pageIndex < totalPages - 1;
    const rightBg = this.scene.add.graphics();
    drawRoundedRect(rightBg, W - 52, y - btnStyle.h / 2, 40, btnStyle.h, btnStyle.radius,
      rightEnabled ? btnStyle.bg : DS.colors.ui.divider, rightEnabled ? 1 : 0.5,
      rightEnabled ? btnStyle.border : DS.colors.ui.divider, 1);

    const rightText = this.scene.add.text(W - 32, y, '▶', {
      fontSize: `${DS.font.size.md}px`,
      color: rightEnabled ? DS.colors.text.inverse : DS.colors.text.muted,
      fontFamily: DS.font.family.base,
    }).setOrigin(0.5);

    const rightHit = this.scene.add.rectangle(W - 32, y, 44, 44, 0x000000, 0.001)
      .setInteractive({ useHandCursor: rightEnabled });

    if (rightEnabled) {
      rightHit.on('pointerdown', () => {
        this.pageIndex++;
        this.update(this.scene.inventory, this.activeSeedId);
        if (this.scene.sound) this.scene.sound.uiClick();
      });
      rightHit.on('pointerover', () => rightText.setScale(1.1));
      rightHit.on('pointerout', () => rightText.setScale(1));
    }

    this.slotsContainer.add([pageText, leftBg, leftText, leftHit, rightBg, rightText, rightHit]);
  }

  createSeedSlot(x, y, seedId, plant, count, isActive) {
    const slotSize = 56;
    const half = slotSize / 2;

    // Тень слота
    const shadow = this.scene.add.graphics();
    drawShadowedRect(shadow, x - half, y - half + 2, slotSize, slotSize, DS.radius.md,
      isActive ? DS.colors.brand.primary : DS.colors.bg.tertiary, 1, 'sm');

    // Фон слота
    const bgSlot = this.scene.add.graphics();
    const bgColor = isActive ? DS.colors.brand.primary : DS.colors.bg.tertiary;
    const borderColor = isActive ? DS.colors.brand.secondary : DS.colors.ui.border;
    const borderWidth = isActive ? 3 : 2;

    drawRoundedRect(bgSlot, x - half, y - half, slotSize, slotSize, DS.radius.md, bgColor, 1, borderColor, borderWidth);

    // Иконка растения
    const g = this.scene.add.graphics();
    g.setPosition(x, y + 4);
    drawPixelPlant(g, plant, 0.7, 0, null);

    // Счётчик
    const countText = this.scene.add.text(x + half - 4, y + half - 4, `${count}`, {
      fontSize: `${DS.font.size.sm}px`,
      color: DS.colors.text.inverse,
      fontFamily: DS.font.family.mono,
      fontWeight: DS.font.weight.bold,
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(1, 1);

    // Индикатор активного (пульсирующее кольцо)
    let activeRing = null;
    if (isActive) {
      activeRing = this.scene.add.graphics();
      activeRing.setDepth(DS.depth.inventory + 1);
      this.animateActiveRing(activeRing, x, y, slotSize);
    }

    // Хит-зона (48x48 minimum)
    const hitArea = this.scene.add.rectangle(x, y, 48, 48, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
      .setDepth(DS.depth.inventory + 2);

    hitArea.on('pointerdown', (pointer) => {
      const isTouch = pointer && (pointer.wasTouch || pointer.pointerType === 'touch');
      if (!isTouch && pointer && pointer.rightButtonDown && pointer.rightButtonDown()) {
        this.scene.socket?.emit('sell-seed', { seedId });
        if (this.scene.sound) this.scene.sound.sell();
        return;
      }
      this.scene.selectedSeedId = seedId;
      this.update(inventory, seedId);
      if (this.scene.sound) this.scene.sound.buy();

      if (this.scene.onboarding?.active && this.scene.onboarding.step === 1) {
        this.scene.onboarding.next();
      }
    });

    hitArea.on('pointerover', () => {
      const sell = getSeedSellPrice(plant?.price ?? 6);
      this.showHint(`${plant?.name ?? 'Семя'} · тап: выбрать · ПКМ/удержание: продать за ~${sell}🪙`);
      if (!isActive) {
        bgSlot.clear();
        drawRoundedRect(bgSlot, x - half, y - half, slotSize, slotSize, DS.radius.md,
          DS.colors.brand.light, 1, DS.colors.brand.primary, 2);
      }
      // лёгкий scale
      this.scene.tweens.add({ targets: [g, countText], scale: 1.08, duration: DS.motion.fast, ease: DS.motion.easing.decelerate });
    });

    hitArea.on('pointerout', () => {
      this.hideHint();
      if (!isActive) {
        bgSlot.clear();
        drawRoundedRect(bgSlot, x - half, y - half, slotSize, slotSize, DS.radius.md, bgColor, 1, borderColor, borderWidth);
      }
      this.scene.tweens.add({ targets: [g, countText], scale: 1, duration: DS.motion.fast, ease: DS.motion.easing.decelerate });
    });

    // Long press для продажи на тач
    let pressTimer = null;
    hitArea.on('pointerdown', (pointer) => {
      if (pointer.wasTouch || pointer.pointerType === 'touch') {
        pressTimer = this.scene.time.delayedCall(600, () => {
          const sell = getSeedSellPrice(plant?.price ?? 6);
          this.showHint(`Удержите для продажи за ${sell}🪙`);
          if (this.scene.sound) this.scene.sound.uiClick();
        });
      }
    });
    hitArea.on('pointerup', () => {
      if (pressTimer) { pressTimer.remove(false); pressTimer = null; }
    });
    hitArea.on('pointerout', () => {
      if (pressTimer) { pressTimer.remove(false); pressTimer = null; }
    });

    this.slotsContainer.add([shadow, bgSlot, g, countText, hitArea]);
    if (activeRing) this.slotsContainer.add(activeRing);
  }

  animateActiveRing(graphics, x, y, size) {
    const drawFrame = (progress) => {
      graphics.clear();
      const radius = size / 2 + 4 + Math.sin(progress * Math.PI * 2) * 3;
      const alpha = 0.4 + Math.sin(progress * Math.PI * 2) * 0.2;
      graphics.lineStyle(3, DS.hexToPhaser(DS.colors.brand.primary), alpha);
      graphics.strokeCircle(x, y, radius);
    };

    let t = 0;
    this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        t += 0.02;
        drawFrame(t);
      }
    });
  }

  sellSelected() {
    const seedId = this.scene.selectedSeedId ?? this.activeSeedId;
    if (seedId == null || !(this.scene.inventory?.[seedId] > 0)) {
      this.showHint('Нет выбранного семени для продажи');
      return;
    }
    this.scene.socket?.emit('sell-seed', { seedId });
    if (this.scene.sound) this.scene.sound.sell();
  }

  showHint(text) {
    if (this.hintText) {
      this.hintText.setText(text);
      this.scene.tweens.add({ targets: this.hintText, alpha: 1, duration: DS.motion.fast });
    }
  }

  hideHint() {
    if (this.hintText) {
      this.scene.tweens.add({ targets: this.hintText, alpha: 0, duration: DS.motion.base });
    }
  }

  resize(y) {
    this.container.y = y;
    this.drawShelf();
    if (this.scene.inventory && this.scene.selectedSeedId !== undefined) {
      this.update(this.scene.inventory, this.scene.selectedSeedId);
    }
  }
}