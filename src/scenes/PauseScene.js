import Phaser from 'phaser';

/**
 * Параллельная сцена паузы. Не трогает GameScene — только рисует оверлей
 * и управляет переходом resume/stop.
 *
 * Почему отдельная сцена, а не Container в GameScene?
 * Потому что scene.pause() отключает инпут и update у GameScene.
 * Overlay должен продолжать принимать клики и клавиши — для этого он
 * должен быть в активной сцене.
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
    const W = cam.width;
    const H = cam.height;

    this.add.rectangle(0, 0, W, H, 0x000000, 0.72).setOrigin(0).setInteractive();

    this.add.text(W / 2, H * 0.32, 'Пауза', {
      fontSize: '36px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setShadow(0, 3, '#000000', 6);

    this.add.text(W / 2, H * 0.4, 'Можно вернуться в любой момент', {
      fontSize: '13px', color: '#cbd5e1'
    }).setOrigin(0.5);

    this._createButton(W / 2, H * 0.52, 'Продолжить', 0x2ecc71, () => this.resumeGame());
    this._createButton(W / 2, H * 0.62, 'В меню', 0x475569, () => {
      if (!this.socket) {
        window.location.replace(window.location.origin + window.location.pathname);
        return;
      }
      const done = () => {
        window.location.replace(window.location.origin + window.location.pathname);
      };
      // Ждём подтверждения от сервера (макс 3с), чтобы точно выйти из комнаты
      const timer = setTimeout(done, 3000);
      this.socket.once('left-room', () => {
        clearTimeout(timer);
        done();
      });
      this.socket.emit('leave-room');
    });

    this.add.text(W / 2, H * 0.72, 'ESC — вернуться в игру', {
      fontSize: '12px', color: '#94a3b8'
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
    this.input.keyboard.on('keydown-SPACE', () => this.resumeGame());
  }

  _createButton(x, y, label, color, onClick) {
    const w = Math.min(240, this.cameras.main.width - 60);
    const h = 54;
    const bg = this.add.rectangle(x, y, w, h, color)
      .setStrokeStyle(2, 0xffffff, 0.85)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: '17px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    bg.on('pointerdown', onClick);
  }

  resumeGame() {
    // Сначала оживляем родителя, потом гасим себя.
    // Обратный порядок оставляет ScenePlugin в невалидном состоянии.
    this.scene.resume(this.parentKey);
    this.scene.stop();
  }
}
