import Phaser from 'phaser';
import { DS } from './DesignSystem.js';
import { openOverlay, createCard, createButton, color } from './ui-kit.js';
import { ROLES } from '../../shared/roles.js';

/**
 * Роли: выбор пассивного бонуса для команды.
 *
 * Было: панель без прокрутки с карточками-прямоугольниками без иерархии;
 * текущая роль отличалась оттенком, который глаз не ловил. Теперь у каждой
 * роли медальон с иконкой, бонус вынесен в отдельную «пилюлю», текущая роль
 * помечена явно, а нижняя кнопка объясняет, что роль можно менять.
 */
export class RolesOverlay extends Phaser.GameObjects.Container {
  constructor(scene, currentRole) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.roles);
    this.scene = scene;
    this.currentRole = currentRole || null;
    this._destroyed = false;

    const hasCurrent = !!this.currentRole;
    this.ui = openOverlay(scene, {
      title: hasCurrent ? '🎭 Ваша роль' : '🎭 Выберите роль',
      subtitle: hasCurrent
        ? 'Роль даёт пассивный бонус всей команде'
        : 'Можно пропустить и выбрать позже в меню',
      depth: DS.overlay.roles,
      maxW: 420,
      maxH: 560,
      padding: 20,
      container: this,
      closeOnScrim: hasCurrent,
      onClose: () => this.destroy(),
    });

    this.render();
  }

  render() {
    const C = this.ui.content;
    this.ui.body.removeAll(true);

    const cardH = 92;
    const gap = 10;
    let y = C.top;

    ROLES.forEach((role) => {
      const isCurrent = role.id === this.currentRole;
      const card = this.buildRoleCard(role, isCurrent, C.width, cardH);
      card.setPosition(C.left, y);
      this.ui.body.add(card);
      y += cardH + gap;
    });

    // Нижняя кнопка: позже / закрыть.
    const buttonY = Math.min(y + 8, C.bottom - 24);
    if (this.currentRole) {
      const close = createButton(this.scene, C.left + C.width / 2, buttonY, C.width, 48, 'Готово', () => this.destroy(), {
        variant: 'ghost',
        fontSize: DS.font.size.base,
      });
      this.ui.body.add(close);
    } else {
      const skip = createButton(this.scene, C.left + C.width / 2, buttonY, C.width, 48, 'Решу позже', () => {
        this.scene.socket?.emit('role-set', { roleId: 'gardener' });
        this.destroy();
      }, {
        variant: 'ghost',
        fontSize: DS.font.size.base,
      });
      this.ui.body.add(skip);
    }
  }

  buildRoleCard(role, isCurrent, w, h) {
    const scene = this.scene;
    const card = createCard(scene, 0, 0, w, h, {
      radius: DS.radius.lg,
      fill: isCurrent ? DS.colors.brand.light : DS.colors.bg.elevated,
      border: isCurrent ? DS.colors.brand.primary : DS.colors.ui.border,
      interactive: true,
      accent: isCurrent ? DS.colors.brand.primary : null,
      onClick: () => {
        this.scene.socket?.emit('role-set', { roleId: role.id });
        this.destroy();
      },
    });

    // Медальон роли.
    const badgeX = 40;
    const badgeY = h / 2;
    const badge = scene.add.circle(badgeX, badgeY, 24, color(DS.colors.bg.elevated), 1)
      .setStrokeStyle(isCurrent ? 2.5 : 1.5, isCurrent ? color(DS.colors.brand.primary) : color(DS.colors.ui.border), 1);
    const icon = scene.add.text(badgeX, badgeY - 1, role.icon, {
      fontSize: '22px',
      fontFamily: DS.font.family.base,
    }).setOrigin(0.5);
    card.body.add([badge, icon]);

    const name = scene.add.text(78, 18, role.name, {
      fontSize: `${DS.font.size.md}px`,
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: DS.colors.text.primary,
    }).setOrigin(0, 0);
    card.body.add(name);

    // Бонус — «пилюля»: главное, что игрок покупает ролью.
    const bonusText = scene.add.text(78, 44, role.desc, {
      fontSize: `${DS.font.size.sm}px`,
      fontFamily: DS.font.family.base,
      color: DS.colors.text.secondary,
      wordWrap: { width: w - 150 },
    }).setOrigin(0, 0);
    card.body.add(bonusText);

    if (isCurrent) {
      const marker = scene.add.text(w - 16, 18, '✓ ваша', {
        fontSize: `${DS.font.size.xs}px`,
        fontFamily: DS.font.family.base,
        fontStyle: 'bold',
        color: DS.colors.brand.dark,
      }).setOrigin(1, 0);
      card.body.add(marker);
    } else {
      const choose = scene.add.text(w - 16, h / 2, 'выбрать ›', {
        fontSize: `${DS.font.size.sm}px`,
        fontFamily: DS.font.family.base,
        fontStyle: 'bold',
        color: DS.colors.text.muted,
      }).setOrigin(1, 0.5);
      card.body.add(choose);
    }

    return card;
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