import Phaser from 'phaser';
import { DS } from './DesignSystem.js';
import {
  openOverlay,
  createCard,
  createPill,
  createButton,
  color,
} from './ui-kit.js';

/**
 * Главное меню — «стол садовника»: карточки разделов вместо однородной
 * плитки кнопок.
 *
 * Было: восемь кнопок одного цвета и размера, заголовок вразнобой с другими
 * окнами, крестик своего вида. Стало: тот же скелет оверлея, что у всех
 * (ui-kit), и карточки с иконкой-медальоном, названием и короткой подписью —
 * игрок понимает, что откроет, ещё до нажатия.
 */

const SECTIONS = [
  {
    id: 'onBook',
    icon: '📖',
    title: 'Книга растений',
    desc: 'Все открытые виды',
    accent: DS.colors.brand.primary,
  },
  {
    id: 'onShop',
    icon: '🛒',
    title: 'Магазин',
    desc: 'Наборы семян',
    accent: DS.colors.brand.secondary,
  },
  {
    id: 'onGoals',
    icon: '🎯',
    title: 'Цели',
    desc: 'Награда дня и серия',
    accent: DS.colors.semantic.info,
  },
  {
    id: 'onUpgrades',
    icon: '⭐',
    title: 'Улучшения',
    desc: 'Рост, удача, доход',
    accent: DS.colors.semantic.warning,
  },
  {
    id: 'onRoles',
    icon: '🎭',
    title: 'Роли',
    desc: 'Бонусы команде',
    accent: DS.colors.text.accent,
  },
  {
    id: 'onSettings',
    icon: '⚙️',
    title: 'Настройки',
    desc: 'Звук и обучение',
    accent: DS.colors.text.muted,
  },
];

export class MainMenuOverlay extends Phaser.GameObjects.Container {
  constructor(scene, callbacks) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.menu);
    this.scene = scene;
    this.callbacks = callbacks || {};
    this._destroyed = false;

    this.ui = openOverlay(scene, {
      title: 'Quiet Garden',
      subtitle: 'Уютный сад для вас и друзей',
      depth: DS.overlay.menu,
      maxW: 460,
      maxH: 700,
      padding: 20,
      container: this,
      onClose: () => this.destroy(),
    });

    this.render();
  }

  render() {
    const scene = this.scene;
    const C = this.ui.content;

    // --- Карточки разделов: 2 колонки ---
    const gap = 10;
    const cardW = (C.width - gap) / 2;
    const cardH = 92;
    const startY = C.top + 2;

    SECTIONS.forEach((s, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = C.left + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      this.buildSectionCard(x, y, cardW, cardH, s, () => {
        const fn = this.callbacks[s.id];
        this.destroy();
        if (typeof fn === 'function') fn();
      });
    });

    const rows = Math.ceil(SECTIONS.length / 2);
    let y = startY + rows * (cardH + gap) + 6;

    // --- Код комнаты: главная «социальная» кнопка ---
    const roomCode = scene.roomCode || '—';
    const codeCard = createCard(scene, C.left, y, C.width, 58, {
      radius: DS.radius.lg,
      fill: DS.colors.brand.light,
      border: DS.colors.brand.primary,
      interactive: true,
      onClick: () => this.copyRoomCode(roomCode),
    });
    codeCard.body.add(scene.add.text(16, 12, 'Код сада', {
      fontSize: `${DS.font.size.xs}px`,
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: DS.colors.brand.dark,
    }).setOrigin(0, 0));
    codeCard.body.add(scene.add.text(16, 28, roomCode, {
      fontSize: `${DS.font.size.lg}px`,
      fontFamily: DS.font.family.mono,
      fontStyle: 'bold',
      color: DS.colors.text.primary,
      letterSpacing: 3,
    }).setOrigin(0, 0));
    codeCard.body.add(scene.add.text(C.width - 16, 29, 'поделиться', {
      fontSize: `${DS.font.size.xs}px`,
      fontFamily: DS.font.family.base,
      color: DS.colors.brand.dark,
    }).setOrigin(1, 0));
    this.ui.body.add(codeCard);
    y += 58 + 10;

    // --- Пауза: тихая нижняя строка ---
    const pause = createButton(scene, C.left + C.width / 2, y + 22, C.width, 46, '⏸  Пауза', () => {
      this.destroy();
      this.callbacks.onPause?.();
    }, {
      variant: 'ghost',
      fontSize: DS.font.size.base,
    });
    this.ui.body.add(pause);
  }

  buildSectionCard(x, y, w, h, section, onClick) {
    const scene = this.scene;
    const card = createCard(scene, x, y, w, h, {
      radius: DS.radius.lg,
      interactive: true,
      onClick,
      accent: section.accent,
    });

    // Медальон с иконкой.
    const badgeX = 30;
    const badgeY = 34;
    const badge = scene.add.circle(badgeX, badgeY, 18, color(DS.colors.bg.secondary), 1)
      .setStrokeStyle(1.5, section.accent, 0.45);
    const icon = scene.add.text(badgeX, badgeY - 1, section.icon, {
      fontSize: '18px',
      fontFamily: DS.font.family.base,
    }).setOrigin(0.5);
    card.body.add([badge, icon]);

    const title = scene.add.text(12, 58, section.title, {
      fontSize: `${DS.font.size.sm}px`,
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: DS.colors.text.primary,
      wordWrap: { width: w - 24 },
    }).setOrigin(0, 0);
    card.body.add(title);

    const desc = scene.add.text(12, 74, section.desc, {
      fontSize: `${DS.font.size.xs}px`,
      fontFamily: DS.font.family.base,
      color: DS.colors.text.muted,
      wordWrap: { width: w - 24 },
    }).setOrigin(0, 0);
    card.body.add(desc);

    this.ui.body.add(card);
    return card;
  }

  async copyRoomCode(code) {
    const text = String(code || '');
    if (!text || text === '—') return;
    try {
      await navigator.clipboard?.writeText(text);
      this.scene.showToast?.('Код сада скопирован');
    } catch {
      this.scene.showToast?.(`Код сада: ${text}`);
    }
    this.scene.sound?.uiClick?.();
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