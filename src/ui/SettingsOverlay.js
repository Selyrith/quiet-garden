import Phaser from 'phaser';
import { DS } from './DesignSystem.js';
import {
  openOverlay,
  createButton,
  createToggle,
  createListRow,
} from './ui-kit.js';

/**
 * Настройки звука и движения.
 *
 * Было: класс без контейнера, который рисовал панель отдельными объектами
 * поверх сцены, сам ловил ESC и сам уничтожал части. Теперь — обычный
 * оверлей на общем скелете: та же шапка, тот же крестик, закрытие по
 * фону, ESC обрабатывается здесь же.
 */
export class SettingsOverlay extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.settings);
    this.scene = scene;
    this._destroyed = false;

    this.ui = openOverlay(scene, {
      title: '⚙ Настройки',
      subtitle: 'Тишина, движение и начало заново',
      depth: DS.overlay.settings,
      maxW: 420,
      maxH: 520,
      padding: 20,
      container: this,
      onClose: () => this.destroy(),
    });

    this.render();

    this.escKey = scene.input.keyboard.addKey('ESC', false);
    this.escKey.once('down', () => this.destroy());
  }

  render() {
    const scene = this.scene;
    const C = this.ui.content;
    this.ui.body.removeAll(true);

    const rowH = 58;
    const gap = 12;
    let y = C.top;

    // --- Звук ---
    const soundOn = localStorage.getItem('qg_mute') !== '1';
    const soundRow = createListRow(scene, C.left, y, C.width, rowH, {
      icon: soundOn ? '🔊' : '🔇',
      label: soundOn ? 'Звук включён' : 'Звук выключен',
    });
    this.soundRow = soundRow;
    this.ui.body.add(soundRow);

    const soundToggle = createToggle(scene, C.right - 40, y + rowH / 2, soundOn, (on) => {
      localStorage.setItem('qg_mute', on ? '0' : '1');
      scene.sound.toggleMute?.();
      soundRow.setLabel(on ? 'Звук включён' : 'Звук выключен');
      soundRow.iconText?.setText(on ? '🔊' : '🔇');
    });
    this.ui.body.add(soundToggle);
    y += rowH + gap;

    // --- Уменьшение движения ---
    const motionOn = localStorage.getItem('qg_reduce_motion') !== '1';
    const motionRow = createListRow(scene, C.left, y, C.width, rowH, {
      icon: '🍃',
      label: motionOn ? 'Анимации включены' : 'Анимации уменьшены',
    });
    this.ui.body.add(motionRow);

    const motionToggle = createToggle(scene, C.right - 40, y + rowH / 2, motionOn, (on) => {
      localStorage.setItem('qg_reduce_motion', on ? '0' : '1');
      motionRow.setLabel(on ? 'Анимации включены' : 'Анимации уменьшены');
      scene.showToast?.(on ? 'Анимации включены — перезайдите для применения' : 'Анимации уменьшены — перезайдите для применения');
    });
    this.ui.body.add(motionToggle);
    y += rowH + gap + 10;

    // --- Сброс онбординга (деструктивно, но не страшно) ---
    const reset = createButton(scene, C.left + C.width / 2, y + 24, C.width, 46,
      'Пройти обучение заново', () => {
        localStorage.removeItem('qg_onboarded');
        scene.showToast?.('Обучение включено — перезайдите в игру');
      }, {
        variant: 'danger',
        fontSize: DS.font.size.base,
      });
    this.ui.body.add(reset);

    const hint = scene.add.text(C.left + C.width / 2, y + 58, 'Обучение покажет основы сада в первый же вход', {
      fontSize: `${DS.font.size.xs}px`,
      fontFamily: DS.font.family.base,
      color: DS.colors.text.muted,
      align: 'center',
      wordWrap: { width: C.width },
    }).setOrigin(0.5, 0);
    this.ui.body.add(hint);

    // --- Закрыть ---
    const closeButton = createButton(scene, C.left + C.width / 2, C.bottom - 26, C.width, 48, 'Готово', () => this.destroy(), {
      variant: 'ghost',
      fontSize: DS.font.size.base,
    });
    this.ui.body.add(closeButton);
  }

  destroy(fromScene) {
    if (this._destroyed) return;
    this._destroyed = true;
    try { this.escKey?.off('down'); } catch {}
    const ui = this.ui;
    this.ui = null;
    if (ui) ui.close();
    try { this.scene?.events?.emit('settings-destroyed'); } catch {}
    try { super.destroy(fromScene); } catch {}
  }
}