import Phaser from 'phaser';
import { getPlant } from '../../shared/plants.js';
import { drawPixelPlant } from './PixelArt.js';
import { getSeedSellPrice } from '../../shared/balance.js';
import { DS, drawRoundedRect, drawShadowedRect, createButtonStyle } from './DesignSystem.js';
import { mulberry32 } from './BakeTexture.js';

export class InventoryBar {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} layout результат computeLayout() — единственный источник координат
   */
  constructor(scene, layout) {
    this.scene = scene;
    // Совместимость: раньше сюда передавали число (y). Старые вызовы не должны падать.
    this.layout = (layout && typeof layout === 'object')
      ? layout
      : { w: scene.scale.width, h: scene.scale.height, inventory: { y: layout ?? scene.scale.height - 60, h: 72 } };
    this.container = scene.add.container(0, this.layout.inventory.y).setDepth(DS.depth.inventory);
    this.bg = scene.add.graphics();
    this.drawShelf();
    this.container.add(this.bg);

    this.slotsContainer = scene.add.container(0, 0);
    this.container.add(this.slotsContainer);

    this.activeSeedId = null;
    this.pageIndex = 0;
    this.hintText = null;
  }

  /** высота полки: 72 на обычных экранах, 64 на маленьких (из Layout) */
  get shelfH() {
    return this.layout.inventory.h;
  }

  /** локальный Y центра слота: слот 56 px стоит у верха полки, низ — под тень */
  get slotTopY() {
    return 28;
  }

  drawShelf() {
    const w = this.layout.w;
    const h = this.shelfH;
    this.bg.clear();

    // Полка как деревянный лоток из референса (Stardew Valley, Hay Day):
    // тёплое дерево, тёмная обводка 3 px, светлая кромка сверху и мягкая
    // тень под лотком. Геометрия не меняется — только материал.
    this.bg.fillStyle(0x3D2E20, 0.18);
    this.bg.fillRoundedRect(8, h - 6, w - 16, 10, 14);
    this.bg.fillStyle(0x3D2E20, 0.10);
    this.bg.fillRoundedRect(8, h - 2, w - 16, 12, 16);

    // Дерево: тёмная кайма → тело → светлая верхняя кромка.
    this.bg.fillStyle(0x6E4527, 1);
    this.bg.fillRoundedRect(8, 0, w - 16, h, DS.radius.lg);
    this.bg.fillStyle(0x96663F, 1);
    this.bg.fillRoundedRect(9.5, 1.5, w - 20, h - 3, DS.radius.lg - 2);
    this.bg.fillStyle(0xC9A171, 0.55);
    this.bg.fillRoundedRect(11, 2.5, w - 24, Math.max(4, h * 0.20), DS.radius.md);

    // «Доски»: редкие вертикальные стыки, а не полосы поперёк.
    this.bg.lineStyle(1, 0x6E4527, 0.45);
    for (let i = 1; i < 4; i++) {
      const xLine = 8 + ((w - 16) / 4) * i;
      this.bg.beginPath();
      this.bg.moveTo(xLine, 8);
      this.bg.lineTo(xLine, h - 8);
      this.bg.strokePath();
    }

    // Декор полки: трава по верхней кромке и лоза по краям.
    // Всё внутри существующего прямоугольника — раскладка не меняется.
    const rng = mulberry32(9182);
    for (let x = 22; x < w - 22; x += 26) {
      if (rng() < 0.4) continue;
      const hh = 4 + rng() * 5;
      const sway = (rng() - 0.5) * 3;
      this.bg.fillStyle(0x6FBF87, 0.9);
      this.bg.fillTriangle(x, 2, x + sway, 2 - hh, x + 4, 2);
      this.bg.fillStyle(0x4E9E69, 0.85);
      this.bg.fillTriangle(x + 4, 2, x + 4 + sway, 1 - hh, x + 7, 2);
    }

    // Лоза вьётся по левому и правому торцу полки.
    for (const [dir, edgeX] of [[1, 14], [-1, w - 14]]) {
      this.bg.lineStyle(1.8, 0x4E9E69, 0.8);
      this.bg.beginPath();
      this.bg.moveTo(edgeX, h - 12);
      this.bg.lineTo(edgeX + dir * 5, h - 26);
      this.bg.lineTo(edgeX + dir * 1, h - 40);
      this.bg.strokePath();
      this.bg.fillStyle(0x6FBF87, 0.95);
      this.bg.fillEllipse(edgeX + dir * 9, h - 28, 8, 4.5);
      this.bg.fillEllipse(edgeX + dir * 2, h - 40, 7, 4);
      this.bg.fillStyle(0x8FD3A5, 0.8);
      this.bg.fillEllipse(edgeX + dir * 6, h - 16, 7, 3.6);
    }
  }

  update(inventory, activeSeedId) {
    this.activeSeedId = activeSeedId;
    // Держим последний инвентарь на экземпляре: обработчики слотов создаются
    // в createSeedSlot, где `inventory` ВНЕ области видимости. Раньше там стоял
    // this.update(inventory, seedId) — при тапе по семени это бросало
    // ReferenceError, и выбор семени (а с ним и онбординг) не работал.
    this.inventory = inventory || {};
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
      this.createSeedSlot(x, this.slotTopY, seedId, plant, count, isActive);
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

    // Фон слота: «вырезанное окно» в полке — тёмный край, светлая кромка,
    // золотая обводка у выбранного. Геометрия та же (56×56), меняется материал.
    const bgSlot = this.scene.add.graphics();
    const bgColor = isActive ? 0x468A5D : 0xF7EFE1;
    const borderColor = isActive ? DS.colors.brand.secondary : 0x6E4527;
    const borderWidth = isActive ? 3 : 2.5;

    drawRoundedRect(bgSlot, x - half, y - half, slotSize, slotSize, DS.radius.md, bgColor, 1, borderColor, borderWidth);
    // Внутренняя тень сверху — слот «утоплен» в доску.
    bgSlot.fillStyle(0x3D2E20, 0.14);
    bgSlot.fillRoundedRect(x - half + 3, y - half + 3, slotSize - 6, 7, 5);
    // Блик по верхней кромке.
    bgSlot.fillStyle(0xFFFFFF, isActive ? 0.22 : 0.5);
    bgSlot.fillRoundedRect(x - half + 4, y - half + 2, slotSize - 8, 6, 4);

    // Иконка растения.
    //
    // Было: Graphics на фиксированном (x, y + 4) с масштабом 0.7. У высоких
    // видов (дерево, кристалл, орб) рисунок уходил за верхнюю кромку слота,
    // а у гриба — за нижнюю: семена выглядели «сползшими» с полки.
    // Стало: считаем габарит растения и вписываем его в слот по центру.
    const v = plant.visual || {};
    const stemH = (v.stemHeight || 24);
    const topH = (v.petalLength || 10) * (v.type === 'crystal' ? 1.2 : 1.9);
    const seedScale = Math.min(0.72, 40 / (stemH + topH));
    const iconH = (stemH + topH) * seedScale;

    const g = this.scene.add.graphics();
    // Базовая точка — низ растения; поднимаем так, чтобы иконка стояла
    // по центру слота и не вылезала за его кромки.
    const baseY = y + Math.min(half - 7, iconH / 2);
    g.setPosition(x, baseY);
    // Контур как у растений на грядке: без него иконки в полке «плоские»
    // и сливаются с бумажным фоном слота.
    const OUT = 1.3;
    for (const [dx, dy] of [
      [-OUT, 0], [OUT, 0], [0, -OUT], [0, OUT],
      [-OUT, -OUT], [OUT, -OUT], [-OUT, OUT], [OUT, OUT],
    ]) {
      drawPixelPlant(g, plant, seedScale, 0, null, dx, dy, true);
    }
    drawPixelPlant(g, plant, seedScale, 0, null);

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

    // Единый обработчик pointerdown: объединяем выбор + long-press таймер,
    // чтобы не вызывать update() рекурсивно (removeAll(true) уничтожает hitArea
    // прямо в обработчике → Phaser виснет).
    let pressTimer = null;

    hitArea.on('pointerdown', (pointer) => {
      const isTouch = pointer && (pointer.wasTouch || pointer.pointerType === 'touch');

      // Long-press для продажи на тач
      if (isTouch) {
        pressTimer = this.scene.time.delayedCall(600, () => {
          const sell = getSeedSellPrice(plant?.price ?? 6);
          this.showHint(`Удержите для продажи за ${sell}🪙`);
          if (this.scene.sound) this.scene.sound.uiClick();
        });
      }

      // ПКМ — быстрое продажа на десктопе
      if (!isTouch && pointer && pointer.rightButtonDown && pointer.rightButtonDown()) {
        this.scene.socket?.emit('sell-seed', { seedId });
        if (this.scene.sound) this.scene.sound.sell();
        return;
      }

      // Выбор семени
      this.scene.selectedSeedId = seedId;
      this.activeSeedId = seedId; // обновляем локально, без рекурсивного update()
      if (this.scene.sound) this.scene.sound.buy();

      // Перерисовываем кольцо активности без уничтожения hitArea.
      // Старый способ (this.update(this.inventory, seedId)) вызывал
      // removeAll(true) → уничтожал hitArea прямо в обработчике → зависание.
      // Новый: update с сохранением, а не destroy.
      this.slotsContainer.each((child) => {
        if (child._seedId === seedId) {
          child._bgSlot.clear();
          drawRoundedRect(child._bgSlot, child._x - child._half, child._y - child._half, child._slotSize, child._slotSize, DS.radius.md,
            DS.colors.brand.light, 1, DS.colors.brand.primary, 2);
          if (!child._activeRing) {
            child._activeRing = this.scene.add.graphics();
            child._activeRing.setDepth(DS.depth.inventory + 1);
            this.animateActiveRing(child._activeRing, child._x, child._y, child._slotSize);
            this.slotsContainer.add(child._activeRing);
          }
        } else if (child._activeRing) {
          child._activeRing.destroy();
          child._activeRing = null;
          child._bgSlot.clear();
          drawRoundedRect(child._bgSlot, child._x - child._half, child._y - child._half, child._slotSize, child._slotSize, DS.radius.md,
            child._bgColor, 1, child._borderColor, child._borderWidth);
        }
      });

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

    // Long press для продажи на тач — очистка таймера
    hitArea.on('pointerup', () => {
      if (pressTimer) { pressTimer.remove(false); pressTimer = null; }
    });
    hitArea.on('pointerout', () => {
      if (pressTimer) { pressTimer.remove(false); pressTimer = null; }
    });

    // Метаданные для обновления без пересоздания
    hitArea._seedId = seedId;
    hitArea._bgSlot = bgSlot;
    hitArea._x = x;
    hitArea._y = y;
    hitArea._half = half;
    hitArea._slotSize = slotSize;
    hitArea._bgColor = bgColor;
    hitArea._borderColor = borderColor;
    hitArea._borderWidth = borderWidth;
    hitArea._activeRing = activeRing;

    this.slotsContainer.add([shadow, bgSlot, g, countText, hitArea]);
    if (activeRing) this.slotsContainer.add(activeRing);
  }

  animateActiveRing(graphics, x, y, size) {
    // БЫЛО: вечный addEvent({delay:16}) на каждую перерисовку панели — то есть
    // на каждую посадку и покупку. Через 20 действий в сцене копились десятки
    // 60-кадровых колбэков, часть из них уже писала в уничтоженную графику,
    // и FPS проседал. Теперь живёт строго один твин на панель.
    if (this._ringTween) { this._ringTween.remove(); this._ringTween = null; }

    const drawFrame = (progress) => {
      if (!graphics || !graphics.active) return;
      graphics.clear();
      const radius = size / 2 + 4 + Math.sin(progress * Math.PI * 2) * 3;
      const alpha = 0.4 + Math.sin(progress * Math.PI * 2) * 0.2;
      graphics.lineStyle(3, DS.hexToPhaser(DS.colors.brand.primary), alpha);
      graphics.strokeCircle(x, y, radius);
    };

    this._ringTween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 2000,
      repeat: -1,
      onUpdate: (tw) => drawFrame(tw.getValue()),
      onStop: () => { if (graphics && graphics.active) graphics.clear(); },
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

  resize(layout) {
    // Принимает layout (или число — старый контракт), а не «магическую» y.
    this.layout = (layout && typeof layout === 'object')
      ? layout
      : this.layout;
    const y = (layout && typeof layout === 'object') ? layout.inventory.y : layout;
    this.container.y = y;
    this.drawShelf();
    if (this.scene.inventory && this.scene.selectedSeedId !== undefined) {
      this.update(this.scene.inventory, this.scene.selectedSeedId);
    }
  }
}