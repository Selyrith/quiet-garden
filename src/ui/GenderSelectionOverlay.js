import Phaser from 'phaser';
import { UNIFIED, createUnifiedButton } from './ui-unified.js';
import { DS } from './DesignSystem.js';
import { MOBILE } from './MobileScale.js';
import { UI, drawPanel } from './ui-theme.js';

export class GenderSelectionOverlay extends Phaser.GameObjects.Container {
  constructor(scene, onSelect) {
    const cam = scene.cameras.main;
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.gender);
    this.scene = scene;
    this.onSelect = onSelect;

    // Затемнение фона
    this.bg = scene.add.rectangle(0, 0, cam.width, cam.height, 0x231912, 0.58)
      .setOrigin(0).setInteractive();
    this.bg.on('pointerdown', () => {});
    this.add(this.bg);

    // Панель
    const panelW = Math.min(cam.width * 0.85, 520);
    const panelH = 320;
    const panelX = cam.width / 2;
    const panelY = cam.height / 2;

    this.panel = scene.add.graphics();
    drawPanel(this.panel, panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, MOBILE.radiusPanel, true);
    this.panel.setInteractive(new Phaser.Geom.Rectangle(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH), Phaser.Geom.Rectangle.Contains);
    this.add(this.panel);

    // Заголовок
    this.title = scene.add.text(panelX, panelY - panelH / 2 + 40, 'Выберите персонажа', {
      fontSize: `${DS.font.size.xl}px`, color: UI.css.textDark, fontStyle: 'bold', fontFamily: UI.fontTitle
    }).setOrigin(0.5);
    this.add(this.title);

    // Подсказка
    this.subtitle = scene.add.text(panelX, panelY - panelH / 2 + 80, 'Это будет ваш аватар в саду', {
      fontSize: `${DS.font.size.base}px`, color: UI.css.textMuted
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
      .setDepth(DS.overlay.gender + 1);
    this.maleBorder = scene.add.circle(startX, avatarY, avatarSize / 2 + 6, UNIFIED.color)
      .setStrokeStyle(4, UNIFIED.colorHi)
      .setAlpha(0);
    this.add([this.maleBorder, this.maleImg]);

    // Женский аватар
    this.femaleImg = scene.add.image(startX + avatarSize + gap, avatarY, 'avatar-female')
      .setDisplaySize(avatarSize, avatarSize)
      .setInteractive({ useHandCursor: true })
      .setDepth(DS.overlay.gender + 1);
    this.femaleBorder = scene.add.circle(startX + avatarSize + gap, avatarY, avatarSize / 2 + 6, UNIFIED.color)
      .setStrokeStyle(4, UNIFIED.colorHi)
      .setAlpha(0);
    this.add([this.femaleBorder, this.femaleImg]);

    // Подписи под аватарами
    this.maleLabel = scene.add.text(startX, avatarY + avatarSize / 2 + 20, 'Мужской', {
      fontSize: `${DS.font.size.base}px`, color: UI.css.textDark, fontStyle: 'bold'
    }).setOrigin(0.5);
    this.femaleLabel = scene.add.text(startX + avatarSize + gap, avatarY + avatarSize / 2 + 20, 'Женский', {
      fontSize: `${DS.font.size.base}px`, color: UI.css.textMuted, fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add([this.maleLabel, this.femaleLabel]);

    let selectedGender = 'male';

    const select = (gender) => {
      selectedGender = gender;
      if (gender === 'male') {
        this.maleBorder.setAlpha(1);
        this.femaleBorder.setAlpha(0);
        this.maleLabel.setColor(UI.textDark);
        this.femaleLabel.setColor(UI.textMuted);
      } else {
        this.maleBorder.setAlpha(0);
        this.femaleBorder.setAlpha(1);
        this.maleLabel.setColor(UI.textMuted);
        this.femaleLabel.setColor(UI.textDark);
      }
    };

    this.maleImg.on('pointerdown', () => select('male'));
    this.femaleImg.on('pointerdown', () => select('female'));

    // Кнопка подтверждения
    this.confirmBtn = createUnifiedButton(scene, panelX, panelY + panelH / 2 - 55, 200, MOBILE.buttonH, 'Готово', () => {
      // Сохраняем выбор в registry и localStorage
      scene.registry.set('playerGender', selectedGender);
      try { localStorage.setItem('qg_player_gender', selectedGender); } catch {}
      // Отправляем выбор пола на сервер, чтобы другие игроки видели правильный аватар
      try { scene.socket?.emit('gender-set', { gender: selectedGender }); } catch {}
      this.destroy();
      if (typeof onSelect === 'function') onSelect(selectedGender);
    });
    this.confirmBtn.setDepth(DS.overlay.gender + 2);
    this.add(this.confirmBtn);

    // Выбираем мужского по умолчанию
    select('male');
  }

  destroy(fromScene) {
    super.destroy(fromScene);
  }
}
