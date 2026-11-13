import Phaser from 'phaser';
import { DS } from './DesignSystem.js';
import {
  openOverlay,
  createCard,
  createButton,
  createPill,
  createScrollArea,
  createScrollButtons,
  color,
} from './ui-kit.js';
import { PACKS } from '../../shared/packs.js';
import { RARITIES } from '../../shared/plants.js';

/**
 * Магазин наборов семян.
 *
 * Было: панель 340×400 с карточками 84 px, кнопка «Купить» уезжала за текст,
 * а при нехватке монет — только серое пятно. Стало: скелет оверлея, карточки
 * с составом набора в человекочитаемом виде (обычные / редкие / ...), живой
 * баланс в шапке и честное «ещё N монет», когда покупка не по карману.
 */

const RARITY_LABEL = Object.fromEntries(RARITIES.map((r) => [r.id, r.name]));

function rarityChip(scene, x, y, rarityId, weightPct) {
  const rar = DS.colors.rarity?.[rarityId];
  const border = rar ? rar.border : DS.colors.ui.border;
  const fill = rar ? rar.bg : DS.colors.bg.secondary;
  const textColor = rar ? rar.text : DS.colors.text.muted;
  const label = `${RARITY_LABEL[rarityId] || rarityId} · ${weightPct}%`;

  const c = scene.add.container(x, y);
  const text = scene.add.text(0, 0, label, {
    fontSize: `${DS.font.size.xs}px`,
    fontFamily: DS.font.family.base,
    fontStyle: 'bold',
    color: textColor,
  }).setOrigin(0, 0.5);
  const w = text.width + 14;
  const h = 20;
  const g = scene.add.graphics();
  g.fillStyle(color(fill), 0.9);
  g.fillRoundedRect(0, -h / 2, w, h, h / 2);
  g.lineStyle(1, color(border), 1);
  g.strokeRoundedRect(0, -h / 2, w, h, h / 2);
  text.setX(7);
  c.add([g, text]);
  c.chipW = w;
  return c;
}

export class ShopOverlay extends Phaser.GameObjects.Container {
  constructor(scene, coins) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.shop);
    this.scene = scene;
    this.coins = coins;
    this._destroyed = false;

    this.ui = openOverlay(scene, {
      title: '🛒 Магазин семян',
      subtitle: 'Наборы открывают новые виды растений',
      depth: DS.overlay.shop,
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

    // Баланс — «пилюля» в шапке по центру.
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

    const gap = 12;
    let y = 0;

    for (const pack of Object.values(PACKS)) {
      y += this.buildPackCard(scroll.view, 0, y, C.width, pack) + gap;
    }

    scroll.refresh();

    this.arrows = createScrollButtons(this.scene, this.ui.body, scroll, {
      x: C.left + C.width / 2,
      y: C.bottom - 2,
    });
  }

  buildPackCard(parent, x, y, w, pack) {
    const h = 116;
    const affordable = this.coins >= pack.price;
    const card = createCard(this.scene, x, y, w, h, {
      radius: DS.radius.lg,
      fill: DS.colors.bg.elevated,
      accent: affordable ? DS.colors.brand.primary : DS.colors.ui.border,
    });
    parent.add(card);

    const title = this.scene.add.text(14, 12, pack.name, {
      fontSize: `${DS.font.size.md}px`,
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: DS.colors.text.primary,
      wordWrap: { width: w - 150 },
    }).setOrigin(0, 0);
    card.body.add(title);

    const desc = this.scene.add.text(14, 35, pack.desc, {
      fontSize: `${DS.font.size.sm}px`,
      fontFamily: DS.font.family.base,
      color: DS.colors.text.muted,
      wordWrap: { width: w - 150 },
    }).setOrigin(0, 0);
    card.body.add(desc);

    // Состав набора: доля редкостей как чипы с процентами — игрок видит,
    // за что платит, не открывая пак.
    const entries = Object.entries(pack.weights || {});
    if (entries.length) {
      const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;
      let cx = 14;
      const chipY = h - 26;
      for (const [rarityId, weight] of entries) {
        const pct = Math.round((weight / total) * 100);
        const chip = rarityChip(this.scene, cx, chipY, rarityId, pct);
        if (cx + chip.chipW > w - 130) break;
        card.body.add(chip);
        cx += chip.chipW + 6;
      }
      const countText = this.scene.add.text(14, h - 48, `В наборе: ${pack.count} семян`, {
        fontSize: `${DS.font.size.xs}px`,
        fontFamily: DS.font.family.base,
        color: DS.colors.text.muted,
      }).setOrigin(0, 0.5);
      card.body.add(countText);
    }

    // Кнопка покупки: цена на кнопке, причина отказа — под ней.
    const buttonW = Math.min(116, w * 0.34);
    const buttonH = 44;
    const buttonX = w - buttonW / 2 - 12;
    const buttonY = h / 2 - (affordable ? 0 : 6);

    const button = createButton(this.scene, buttonX, buttonY, buttonW, buttonH,
      `${pack.price} 🪙`, () => {
        if (this.scene.coins >= pack.price) {
          this.scene.socket?.emit('buy-pack', { packId: pack.id });
          this.destroy();
        } else {
          this.scene.showToast?.(`Не хватает ${pack.price - this.scene.coins} монет`);
          this.scene.sound?.error?.();
        }
      }, {
        variant: affordable ? 'primary' : 'ghost',
        fontSize: DS.font.size.base,
      });
    card.body.add(button);

    if (!affordable) {
      const need = this.scene.add.text(buttonX, buttonY + 30, `ещё ${pack.price - this.coins} 🪙`, {
        fontSize: `${DS.font.size.xs}px`,
        fontFamily: DS.font.family.base,
        color: DS.colors.semantic.error,
      }).setOrigin(0.5, 0);
      card.body.add(need);
    }

    return h;
  }

  updateCoins(coins) {
    this.coins = coins;
    if (this.balance) this.balance.setLabel(`${coins} 🪙`);
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