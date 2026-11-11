import Phaser from 'phaser';
import { ROLES } from '../../shared/roles.js';
import { UNIFIED } from './ui-unified.js';

export class RolesOverlay extends Phaser.GameObjects.Container {
  constructor(scene, currentRole) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(530);
    this.scene = scene;

    scene.hideSignpost?.();
    if (scene.signpostDom) { scene.signpostDom.destroy(); scene.signpostDom = null; }

    const cam = scene.cameras.main;
    this.bg = scene.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.85)
      .setOrigin(0).setInteractive();
    // Убрали закрытие по фону
    this.add(this.bg);

    const panelW = Math.min(340, cam.width - 20);
    const panelH = Math.min(460, cam.height - 20);
    this.panel = scene.add.rectangle(
      cam.width / 2, cam.height / 2, panelW, panelH, 0x1a1f2b, 0.98
    ).setStrokeStyle(2, 0x4a5a6a);
    this.add(this.panel);

    const titleText = currentRole ? 'Сменить роль' : 'Выберите роль';
    this.add(scene.add.text(
      cam.width / 2, cam.height / 2 - panelH / 2 + 14, titleText,
      { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }
    ).setOrigin(0.5, 0));

    this.add(scene.add.text(
      cam.width / 2, cam.height / 2 - panelH / 2 + 38,
      'Роль даёт пассивные бонусы',
      { fontSize: '12px', color: '#aaaaaa' }
    ).setOrigin(0.5, 0));

    if (currentRole) {
      const closeHitArea = scene.add.rectangle(cam.width / 2 + panelW / 2 - 24, cam.height / 2 - panelH / 2 + 24, 44, 44, UNIFIED.color).setInteractive({ useHandCursor: true });
      closeHitArea.setStrokeStyle(2, UNIFIED.colorHi);
      const closeBtn = scene.add.text(
        cam.width / 2 + panelW / 2 - 24,
        cam.height / 2 - panelH / 2 + 12, '✕',
        { fontSize: '22px', color: '#3e2723', fontStyle: 'bold' }
      ).setOrigin(0.5, 0);
      closeHitArea.on('pointerdown', () => this.destroy());
      this.add([closeHitArea, closeBtn]);
    } else {
      const skipHit = scene.add.rectangle(cam.width / 2, cam.height / 2 + panelH / 2 - 24, 100, 44, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      const skipBtn = scene.add.text(
        cam.width / 2, cam.height / 2 + panelH / 2 - 20, 'Пропустить',
        { fontSize: '14px', color: '#ffffff', fontStyle: 'bold' }
      ).setOrigin(0.5);
      skipHit.on('pointerdown', () => {
        this.scene.socket?.emit('role-set', { roleId: 'gardener' });
        this.destroy();
      });
      this.add([skipHit, skipBtn]);
    }

    this.destroy = () => {
      this.scene.showSignpost?.();
      super.destroy();
    };

    const cardH = 90;
    const cardGap = 8;
    const startY = cam.height / 2 - panelH / 2 + 60;
    const startX = cam.width / 2 - panelW / 2 + 16;
    const cardW = panelW - 32;

    ROLES.forEach((role, i) => {
      const y = startY + i * (cardH + cardGap);
      const isCurrent = role.id === currentRole;

      // Карта роли: unified color когда текущая, secondary когда не текущая
      const card = scene.add.rectangle(
        startX + cardW / 2, y + cardH / 2, cardW, cardH,
        isCurrent ? 0xd8a494 : 0x8e7b63, isCurrent ? 1 : 0.9
      ).setStrokeStyle(2, isCurrent ? 0xffffff : 0x5c4a3a);

      card.setInteractive({ useHandCursor: true });

      card.on('pointerdown', () => {
        this.scene.socket?.emit('role-set', { roleId: role.id });
        this.destroy();
      });
      this.add(card);

      this.add(scene.add.text(
        startX + 16, y + 14, `${role.icon} ${role.name}`,
        { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }
      ));
      this.add(scene.add.text(
        startX + 16, y + 42, role.desc,
        { fontSize: '12px', color: '#f8f4ee', wordWrap: { width: cardW - 32 } }
      ));
    });
  }
}
