import Phaser from 'phaser';
import { DS } from './DesignSystem.js';
import { openOverlay, createButton, createCard, color } from './ui-kit.js';

/**
 * Выбор персонажа перед первым входом в сад.
 *
 * Было: панель с двумя картинками и общей кнопкой «Готово», где выбор
 * подсвечивался еле заметным кольцом. Стало: две «рамки портрета»,
 * выбранная приподнята и золотится, кнопка называет выбор по имени —
 * «Войти как Малинка».
 */
export class GenderSelectionOverlay extends Phaser.GameObjects.Container {
  constructor(scene, onSelect) {
    const cam = scene.cameras.main;
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.gender);
    this.scene = scene;
    this.onSelect = onSelect;
    this._destroyed = false;
    this.selectedGender = 'male';

    this.ui = openOverlay(scene, {
      title: 'Кто вы в этом саду?',
      subtitle: 'Это будет ваш аватар на грядках',
      depth: DS.overlay.gender,
      maxW: 460,
      maxH: 520,
      padding: 20,
      container: this,
      closeOnScrim: false,
      onClose: () => this.destroy(),
    });

    this.render();
  }

  render() {
    const scene = this.scene;
    const C = this.ui.content;
    this.ui.body.removeAll(true);

    const options = [
      { id: 'male', tex: 'avatar-male', name: 'Лучик', desc: 'Тёплый и спокойный' },
      { id: 'female', tex: 'avatar-female', name: 'Малинка', desc: 'Нежная и решительная' },
    ];

    // Две рамки портрета рядом.
    const gap = 14;
    const cardW = (C.width - gap) / 2;
    const cardH = Math.min(250, C.width * 0.62);
    const top = C.top + 12;

    this.optionCards = new Map();

    options.forEach((opt, i) => {
      const x = C.left + i * (cardW + gap);
      const card = this.buildOption(opt, x, top, cardW, cardH);
      this.ui.body.add(card);
      this.optionCards.set(opt.id, card);
    });

    // Кнопка подтверждения.
    const button = createButton(scene, C.left + C.width / 2, C.bottom - 30, C.width, 54, 'Войти как Лучик', () => {
      scene.registry.set('playerGender', this.selectedGender);
      try { localStorage.setItem('qg_player_gender', this.selectedGender); } catch {}
      try { scene.socket?.emit('gender-set', { gender: this.selectedGender }); } catch {}
      const chosen = this.selectedGender;
      this.destroy();
      if (typeof this.onSelect === 'function') this.onSelect(chosen);
    }, {
      variant: 'primary',
      fontSize: DS.font.size.lg,
    });
    this.confirmButton = button;
    this.ui.body.add(button);

    this.refreshSelection();
  }

  buildOption(opt, x, y, w, h) {
    const scene = this.scene;
    const card = createCard(scene, x, y, w, h, {
      radius: DS.radius.xl,
      fill: DS.colors.bg.secondary,
      interactive: true,
      onClick: () => {
        this.selectedGender = opt.id;
        this.refreshSelection();
      },
    });

    // Портретная «рама».
    const frameR = Math.min(w, h - 70) / 2 - 10;
    const frameY = (h - 46) / 2;
    const frame = scene.add.circle(w / 2, frameY, frameR + 6, color(DS.colors.bg.elevated), 1)
      .setStrokeStyle(2, color(DS.colors.ui.border), 1);
    card.body.add(frame);

    if (scene.textures.exists(opt.tex)) {
      const img = scene.add.image(w / 2, frameY, opt.tex);
      img.setDisplaySize(frameR * 1.75, frameR * 1.75);
      card.body.add(img);
    } else {
      const fallback = scene.add.text(w / 2, frameY, opt.id === 'female' ? '👩‍🌾' : '👨‍🌾', {
        fontSize: `${frameR}px`,
        fontFamily: DS.font.family.base,
      }).setOrigin(0.5);
      card.body.add(fallback);
    }

    const name = scene.add.text(w / 2, h - 58, opt.name, {
      fontSize: `${DS.font.size.md}px`,
      fontFamily: DS.font.family.title,
      color: DS.colors.text.primary,
    }).setOrigin(0.5);
    card.body.add(name);

    const desc = scene.add.text(w / 2, h - 34, opt.desc, {
      fontSize: `${DS.font.size.xs}px`,
      fontFamily: DS.font.family.base,
      color: DS.colors.text.muted,
      align: 'center',
      wordWrap: { width: w - 16 },
    }).setOrigin(0.5);
    card.body.add(desc);

    // Галочка выбора — приходит сверху справа.
    const check = scene.add.text(w - 16, 16, '✓', {
      fontSize: `${DS.font.size.md}px`,
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: DS.colors.brand.dark,
    }).setOrigin(0.5).setVisible(false);
    card.body.add(check);

    card.check = check;
    card.optionId = opt.id;
    card.frame = frame;
    card.frameRadius = frameR + 6;
    return card;
  }

  refreshSelection() {
    for (const [id, card] of this.optionCards) {
      const active = id === this.selectedGender;
      card.check.setVisible(active);
      card.frame.setStrokeStyle(
        active ? 3 : 2,
        active ? color(DS.colors.brand.secondary) : color(DS.colors.ui.border),
        1
      );
      // Внутренняя подсветка выбранной рамки — мягкое золотое свечение.
      card.frame.setFillStyle(active ? 0xfff7e2 : color(DS.colors.bg.elevated), 1);
      card.redraw?.(active ? 'hover' : 'idle');
    }

    const name = this.selectedGender === 'female' ? 'Малинка' : 'Лучик';
    this.confirmButton?.setLabel(`Войти как ${name}`);
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