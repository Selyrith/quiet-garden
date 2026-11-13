import Phaser from 'phaser';
import { DS } from '../ui/DesignSystem.js';
import { openOverlay, createButton } from '../ui/ui-kit.js';

/**
 * Пауза — отдельная сцена поверх замершего сада.
 *
 * Почему отдельная сцена: scene.pause() отключает инпут и update у
 * GameScene, поэтому окно паузы должно жить в активной сцене.
 *
 * Визуально — то же окно, что и остальные (ui-kit), только без крестика
 * в углу: здесь честнее один явный выбор «Продолжить».
 */
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data) {
    this.parentKey = (data && data.parent) || 'GameScene';
    this.socket = (data && data.socket) || null;
  }

  create() {
    const cam = this.cameras.main;
    this._destroyed = false;

    this.ui = openOverlay(this, {
      title: 'Пауза',
      subtitle: 'Сад подождёт — он никуда не спешит',
      depth: DS.overlay.menu,
      maxW: 400,
      maxH: 440,
      widthRatio: 0.9,
      heightRatio: 0.7,
      padding: 24,
      closeOnScrim: false,
      restoreSignpost: false,
    });

    const C = this.ui.content;

    // Кнопка «Продолжить» — главное действие, крупная и первая.
    const resume = createButton(this, C.left + C.width / 2, C.top + 44, C.width, 56, 'Продолжить', () => this.resumeGame(), {
      variant: 'primary',
      fontSize: DS.font.size.lg,
    });
    this.ui.body.add(resume);

    // «В меню» — тихая, но с пояснением последствий.
    const toMenu = createButton(this, C.left + C.width / 2, C.top + 118, C.width, 48, 'Выйти в меню', () => this.leaveRoom(), {
      variant: 'ghost',
      fontSize: DS.font.size.base,
    });
    this.ui.body.add(toMenu);

    const hint = this.add.text(C.left + C.width / 2, C.top + 170, 'ESC или пробел — вернуться в игру', {
      fontSize: `${DS.font.size.xs}px`,
      fontFamily: DS.font.family.base,
      color: DS.colors.text.muted,
      align: 'center',
    }).setOrigin(0.5, 0);
    this.ui.body.add(hint);

    this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
    this.input.keyboard.on('keydown-SPACE', () => this.resumeGame());
  }

  leaveRoom() {
    if (!this.socket) {
      window.location.replace(window.location.origin + window.location.pathname);
      return;
    }
    const done = () => {
      window.location.replace(window.location.origin + window.location.pathname);
    };
    const timer = setTimeout(done, 3000);
    this.socket.once('left-room', () => {
      clearTimeout(timer);
      done();
    });
    this.socket.emit('leave-room');
  }

  resumeGame() {
    // Сначала оживляем родителя, потом гасим себя.
    // Обратный порядок оставляет ScenePlugin в невалидном состоянии.
    this.scene.resume(this.parentKey);
    this.scene.stop();
  }
}