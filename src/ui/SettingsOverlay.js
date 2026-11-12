import { createUnifiedButton, createUnifiedToggle } from './ui-unified.js';

export class SettingsOverlay {
  constructor(scene) {
    this.scene = scene;
    this.active = true;

    scene.hideSignpost?.();
    if (scene.signpostDom) { scene.signpostDom.destroy(); scene.signpostDom = null; }

    const w = scene.scale.width;
    const h = scene.scale.height;

    const panelW = Math.min(360, w - 40);
    const panelH = 380;
    const panelX = w / 2;
    const panelY = h / 2;

    this.bg = scene.add.rectangle(w / 2, h / 2, w, h, 0x5c4a3a, 0.9)
      .setDepth(310);

    this.closeHit = scene.add.rectangle(w / 2, h / 2, w, h, 0x5c4a3a, 0.001)
      .setDepth(320);
      .setInteractive();
    this.closeHit.on('pointerdown', (pointer) => {
      const hw = panelW / 2;
      const hh = panelH / 2;
      const dx = Math.abs(pointer.x - panelX);
      const dy = Math.abs(pointer.y - panelY);
      if (dx > hw || dy > hh) {
        this.destroy();
      }
    });

    this.escKey = scene.input.keyboard.addKey('ESC', false);
    this.escKey.once('down', () => this.destroy());

    this.panel = scene.add.container(panelX, panelY).setDepth(330);

    const bgPanel = scene.add.rectangle(0, 0, panelW, panelH, 0xf8f4ee, 0.98).setStrokeStyle(2, 0xc9a884);
    this.panel.add(bgPanel);

    const title = scene.add.text(0, -panelH / 2 + 24, '⚙ Настройки', {
      fontSize: '20px', color: '#5c4a3a', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.panel.add(title);

    const closeBtn = scene.add.text(panelW / 2 - 20, -panelH / 2 + 20, '✕', {
      fontSize: '18px', color: '#8e7b63'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.destroy());
    this.panel.add(closeBtn);

    let y = -panelH / 2 + 70;

    // --- Тумблер звука ---
    const soundMuted = localStorage.getItem('qg_mute') === '1';
    const soundLabel = scene.add.text(-panelW / 2 + 24, y, soundMuted ? '🔇 Звук выкл' : '🔊 Звук вкл', {
      fontSize: '16px', color: '#5c4a3a'
    }).setOrigin(0, 0.5);
    this.panel.add(soundLabel);

    const soundToggle = createUnifiedToggle(scene, panelW / 2 - 30, y, '', !soundMuted, (on) => {
      localStorage.setItem('qg_mute', on ? '0' : '1');
      scene.sound.toggleMute();
      soundLabel.setText(on ? '🔊 Звук вкл' : '🔇 Звук выкл');
    });
    this.panel.add(soundToggle);

    y += 50;

    // --- Тумблер уменьшения движения ---
    const reduceMotion = localStorage.getItem('qg_reduce_motion') === '1';
    const motionLabel = scene.add.text(-panelW / 2 + 24, y, reduceMotion ? '🍃 Уменьшение движения вкл' : '🍃 Уменьшение движения выкл', {
      fontSize: '16px', color: '#5c4a3a'
    }).setOrigin(0, 0.5);
    this.panel.add(motionLabel);

    const motionToggle = createUnifiedToggle(scene, panelW / 2 - 30, y, '', !reduceMotion, (on) => {
      localStorage.setItem('qg_reduce_motion', on ? '0' : '1');
      motionLabel.setText(on ? '🍃 Уменьшение движения вкл' : '🍃 Уменьшение движения выкл');
      this.scene.showToast(on ? 'Анимации отключены — перезайдите для применения' : 'Анимации включены — перезайдите для применения');
    });
    this.panel.add(motionToggle);

    y += 55;

    // --- Кнопка сброса онбординга (деструктивная — error цвет) ---
    const resetBtn = scene.add.rectangle(0, y, panelW - 48, 44, 0xcb8a6b).setStrokeStyle(2, 0xc9a884).setInteractive({ useHandCursor: true });
    const resetText = scene.add.text(0, y, 'Сбросить онбординг', { fontSize: '15px', color: '#f8f4ee', fontStyle: 'bold' }).setOrigin(0.5);
    resetBtn.on('pointerdown', () => {
      localStorage.removeItem('qg_onboarded');
      this.scene.showToast('Онбординг сброшен');
    });
    this.panel.add([resetBtn, resetText]);

    y += 55;

    // --- Кнопка закрытия (единый цвет) ---
    const closeBottomBtn = createUnifiedButton(scene, 0, y, panelW - 48, 44, 'Закрыть', () => this.destroy());
    this.panel.add(closeBottomBtn);
  }

  destroy() {
    if (!this.active) return;
    this.active = false;
    this.scene.showSignpost?.();
    try { if (this.escKey) this.escKey.off('down'); } catch {}
    if (this.panel) this.panel.destroy();
    if (this.bg) this.bg.destroy();
    if (this.closeHit) this.closeHit.destroy();
    try {
      if (this.scene && this.scene.events) this.scene.events.emit('settings-destroyed');
    } catch {}
  }
}
