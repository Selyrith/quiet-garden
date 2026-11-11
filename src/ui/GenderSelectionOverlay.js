import Phaser from 'phaser';
import { UNIFIED, createUnifiedButton } from './ui-unified.js';

export class GenderSelectionOverlay extends Phaser.GameObjects.Container {
  constructor(scene, onSelect) {
    const cam = scene.cameras.main;
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(9000);
    this.scene = scene;
    this.onSelect = onSelect;

    // Затемнение фона
    this.bg = scene.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.6)
      .setOrigin(0).setInteractive();
    this.bg.on('pointerdown', () => {});
    this.add(this.bg);

    // Панель
    const panelW = Math.min(cam.width * 0.85, 520);
    const panelH = 320;
    const panelX = cam.width / 2;
    const panelY = cam.height / 2;

    this.panel = scene.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1f2b, 0.98)
      .setStrokeStyle(3, 0x4a5a6a).setInteractive();
    this.add(this.panel);

    // Заголовок
    this.title = scene.add.text(panelX, panelY - panelH / 2 + 40, 'Выберите персонажа', {
      fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add(this.title);

    // Подсказка
    this.subtitle = scene.add.text(panelX, panelY - panelH / 2 + 80, 'Это будет ваш аватар в саду', {
      fontSize: '15px', color: '#c9a884'
    }).setOrigin(0.5);
    this.add(this.subtitle);

    // Аватар-картинки (мужской / женский)
    const avatarSize = 96;
    const gap = 40;
    const totalW = avatarSize * 2 + gap;
    const startX = panelX - totalW / 2 + avatarSize / 2;
    const avatarY = panelY + 10;

    // Мужской аватар
    this.maleImg = scene.add.image(startX, avatarY, 'avatar-male')
      .setDisplaySize(avatarSize, avatarSize)
      .setInteractive({ useHandCursor: true })
      .setDepth(9001);
    this.maleBorder = scene.add.circle(startX, avatarY, avatarSize / 2 + 6, UNIFIED.color)
      .setStrokeStyle(4, UNIFIED.colorHi)
      .setAlpha(0);
    this.add([this.maleBorder, this.maleImg]);

    // Женский аватар
    this.femaleImg = scene.add.image(startX + avatarSize + gap, avatarY, 'avatar-female')
      .setDisplaySize(avatarSize, avatarSize)
      .setInteractive({ useHandCursor: true })
      .setDepth(9001);
    this.femaleBorder = scene.add.circle(startX + avatarSize + gap, avatarY, avatarSize / 2 + 6, UNIFIED.color)
      .setStrokeStyle(4, UNIFIED.colorHi)
      .setAlpha(0);
    this.add([this.femaleBorder, this.femaleImg]);

    // Подписи под аватарами
    this.maleLabel = scene.add.text(startX, avatarY + avatarSize / 2 + 20, 'Мужской', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.femaleLabel = scene.add.text(startX + avatarSize + gap, avatarY + avatarSize / 2 + 20, 'Женский', {
      fontSize: '16px', color: '#c9a884', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add([this.maleLabel, this.femaleLabel]);

    let selectedGender = 'male';

    const select = (gender) => {
      selectedGender = gender;
      if (gender === 'male') {
        this.maleBorder.setAlpha(1);
        this.femaleBorder.setAlpha(0);
        this.maleLabel.setColor('#ffffff');
        this.femaleLabel.setColor('#c9a884');
      } else {
        this.maleBorder.setAlpha(0);
        this.femaleBorder.setAlpha(1);
        this.maleLabel.setColor('#c9a884');
        this.femaleLabel.setColor('#ffffff');
      }
    };

    this.maleImg.on('pointerdown', () => select('male'));
    this.femaleImg.on('pointerdown', () => select('female'));

    // Кнопка подтверждения
    this.confirmBtn = createUnifiedButton(scene, panelX, panelY + panelH / 2 - 55, 200, 48, 'Готово', () => {
      // Сохраняем выбор в registry и localStorage
      scene.registry.set('playerGender', selectedGender);
      try { localStorage.setItem('qg_player_gender', selectedGender); } catch {}
      // Отправляем выбор пола на сервер, чтобы другие игроки видели правильный аватар
      try { scene.socket?.emit('gender-set', { gender: selectedGender }); } catch {}
      this.destroy();
      if (typeof onSelect === 'function') onSelect(selectedGender);
    });
    this.add(this.confirmBtn);

    // Выбираем мужского по умолчанию
    select('male');
  }

  destroy(fromScene) {
    super.destroy(fromScene);
  }
}
