import Phaser from 'phaser';
import { DS } from './DesignSystem.js';
import {
  openOverlay,
  createCard,
  createButton,
  createPill,
  createScrollArea,
  createScrollButtons,
} from './ui-kit.js';
import { UPGRADES, getUpgradeCost } from '../../shared/upgrades.js';

/**
 * Улучшения: три ветки прогрессии.
 *
 * Каждая карточка отвечает на три вопроса игрока без догадок:
 *  — что даёт ветка сейчас (число),
 *  — что даст следующий уровень (было → станет),
 *  — сколько это стоит и хватает ли монет.
 *
 * Шкала уровня подписана (I II III …), чтобы 3/8 читалось как ступени,
 * а не как случайный отрезок.
 */

const ROMAN = ['—', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function roman(n) {
  return ROMAN[Math.max(0, Math.min(ROMAN.length - 1, n))] ?? String(n);
}

/** «Скорость роста» с «−5%» — минус уже в числе, поэтому u.unit = '−'. */
function formatBonus(u, levels) {
  const pct = Math.round(levels * u.perLevel * 100);
  if (u.id === 'growth') return `быстрее на ${pct}%`;
  if (u.id === 'income') return `+${pct}% монет`;
  return `+${pct}% шанс`;
}

export class UpgradesOverlay extends Phaser.GameObjects.Container {
  constructor(scene, coins, upgrades) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.upgrades);
    this.scene = scene;
    this.coins = coins;
    this.upgrades = upgrades || {};
    this._destroyed = false;

    this.ui = openOverlay(scene, {
      title: '⭐ Улучшения',
      subtitle: 'Постоянные бонусы для всего сада',
      depth: DS.overlay.upgrades,
      maxW: 440,
      maxH: 620,
      padding: 20,
      container: this,
      onClose: () => this.destroy(),
    });

    this.render();
  }

  render() {
    const C = this.ui.content;
    this.ui.body.removeAll(true);
    this.scroll && this.scroll.destroy?.();
    this.arrows && this.arrows.destroy?.();

    this.balance = createPill(this.scene, C.left + C.width / 2, C.top + 16,
      Math.min(C.width, 200), 34, `${this.coins} 🪙`, {
        fill: DS.colors.bg.secondary,
        border: DS.colors.ui.border,
        color: DS.colors.text.primary,
        fontFamily: DS.font.family.base,
        fontSize: DS.font.size.base,
      });
    this.ui.body.add(this.balance);

    const scroll = createScrollArea(this.scene, this.ui.body, {
      left: C.left,
      right: C.right,
      top: C.top + 42,
      bottom: C.bottom - 26,
      width: C.width,
    });
    this.scroll = scroll;

    let y = 0;
    const gap = 12;
    UPGRADES.forEach((u) => {
      y += this.buildCard(scroll.view, 0, y, C.width, u) + gap;
    });
    scroll.refresh();

    this.arrows = createScrollButtons(this.scene, this.ui.body, scroll, {
      x: C.left + C.width / 2,
      y: C.bottom - 2,
    });
  }

  buildCard(parent, x, y, w, u) {
    const h = 118;
    const level = this.upgrades[u.id] || 0;
    const isMax = level >= u.maxLevel;
    const cost = isMax ? null : getUpgradeCost(u.id, level);
    const canBuy = cost != null && this.coins >= cost;

    const card = createCard(this.scene, x, y, w, h, {
      radius: DS.radius.lg,
      fill: DS.colors.bg.elevated,
      accent: isMax ? DS.colors.brand.secondary : DS.colors.brand.primary,
    });
    parent.add(card);

    // Медальон с иконкой ветки.
    const badgeX = 34;
    const badgeY = 34;
    const badge = this.scene.add.circle(badgeX, badgeY, 20, DS.colors.bg.secondary, 1)
      .setStrokeStyle(1.5, isMax ? DS.colors.brand.secondary : DS.colors.ui.border, 1);
    const icon = this.scene.add.text(badgeX, badgeY - 1, u.icon, {
      fontSize: '20px',
      fontFamily: DS.font.family.base,
    }).setOrigin(0.5);
    card.body.add([badge, icon]);

    const name = this.scene.add.text(64, 12, u.name, {
      fontSize: `${DS.font.size.md}px`,
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: DS.colors.text.primary,
    }).setOrigin(0, 0);
    card.body.add(name);

    // Уровень ступенями: «III из VIII» вместо «2/8».
    const levelText = this.scene.add.text(w - 14, 14, isMax ? 'МАКС' : `${roman(level)} / ${roman(u.maxLevel)}`, {
      fontSize: `${DS.font.size.xs}px`,
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: isMax ? DS.colors.brand.dark : DS.colors.text.muted,
    }).setOrigin(1, 0);
    card.body.add(levelText);

    // Шкала уровня из восьми насечек — видно, сколько осталось до максимума.
    const steps = u.maxLevel;
    const barW = Math.min(w - 84, 190);
    const barY = 42;
    const segGap = 3;
    const segW = (barW - (steps - 1) * segGap) / steps;
    const segs = this.scene.add.graphics();
    for (let i = 0; i < steps; i++) {
      const sx = 64 + i * (segW + segGap);
      const filled = i < level;
      segs.fillStyle(
        filled
          ? (isMax ? parseInt(DS.colors.brand.secondary.slice(1), 16) : parseInt(DS.colors.brand.primary.slice(1), 16))
          : parseInt(DS.colors.bg.tertiary.slice(1), 16),
        1
      );
      segs.fillRoundedRect(sx, barY, segW, 8, 3);
    }
    card.body.add(segs);

    // Что даёт ветка сейчас и что даст следующий уровень.
    const now = formatBonus(u, level);
    const bonusLine = isMax
      ? `${now} — улучшено полностью`
      : `${now}  →  ${formatBonus(u, level + 1)}`;
    const bonusText = this.scene.add.text(64, 58, bonusLine, {
      fontSize: `${DS.font.size.sm}px`,
      fontFamily: DS.font.family.base,
      color: isMax ? DS.colors.text.muted : DS.colors.text.secondary,
    }).setOrigin(0, 0);
    card.body.add(bonusText);

    // Кнопка / бейдж MAX.
    if (!isMax) {
      const buttonW = 100;
      const buttonH = 44;
      const buttonX = w - buttonW / 2 - 12;
      const buttonY = h / 2 - 10;

      const button = createButton(this.scene, buttonX, buttonY, buttonW, buttonH,
        `${cost} 🪙`, () => this.buy(u.id), {
          variant: canBuy ? 'primary' : 'ghost',
          fontSize: DS.font.size.base,
        });
      card.body.add(button);

      if (!canBuy) {
        const need = this.scene.add.text(buttonX, buttonY + 28, `ещё ${cost - this.coins} 🪙`, {
          fontSize: `${DS.font.size.xs}px`,
          fontFamily: DS.font.family.base,
          color: DS.colors.semantic.error,
        }).setOrigin(0.5, 0);
        card.body.add(need);
      }
    } else {
      const maxPill = createPill(this.scene, w - 58, h / 2 - 10, 80, 30, 'МАКС', {
        fill: DS.colors.brand.light,
        border: DS.colors.brand.primary,
        color: DS.colors.brand.dark,
        fontSize: DS.font.size.xs,
      });
      card.body.add(maxPill);
    }

    return h;
  }

  buy(upgradeId) {
    this.scene.socket?.emit('upgrade-buy', { upgradeId });
  }

  update(coins, upgrades) {
    this.coins = coins;
    this.upgrades = upgrades || this.upgrades;
    this.render();
  }

  destroy(fromScene) {
    if (this._destroyed) return;
    this._destroyed = true;
    const ui = this.ui;
    this.ui = null;
    if (ui) ui.close();
    try { super.destroy(fromScene); } catch {}
  }
}