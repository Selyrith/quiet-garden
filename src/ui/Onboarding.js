export class Onboarding {
  constructor(scene) {
    this.scene = scene;
    this.step = 0;
    this.hint = null;
    this.pulse = null;
    this.active = false;
  }

  start() {
    if (localStorage.getItem('qg_onboarded') === '1') return;
    this.active = true;
    this.showStep(1);
  }

  showStep(n) {
    this.step = n;
    this.clear();
    const scene = this.scene;

    if (n === 1) {
      // Подсветка инвентаря внизу — unified color pulse
      this.hint = scene.add.text(scene.scale.width / 2, scene.scale.height - 150,
        '👆 Выбери семя в инвентаре', { fontSize: '16px', color: '#ffffff', backgroundColor: '#0f172acc',
        padding: { x: 12, y: 6 }, fontStyle: 'bold' }).setOrigin(0.5).setDepth(400);
    } else if (n === 2) {
      // Подсветка центральной грядки (2,3) — unified color pulse
      const tile = scene.tiles.get('2,3');
      if (tile && tile.rect) {
        this.pulse = scene.add.rectangle(tile.rect.x, tile.rect.y, scene.tileSize, scene.tileSize, 0xd8a494, 0.4).setDepth(3);
        scene.tweens.add({ targets: this.pulse, alpha: { from: 0.2, to: 0.6 }, duration: 800, yoyo: true, repeat: -1 });
      }
      this.hint = scene.add.text(scene.scale.width / 2, scene.scale.height - 150,
        '👆 Тапни по грядке (2,3)', { fontSize: '16px', color: '#ffffff', backgroundColor: '#0f172acc',
        padding: { x: 12, y: 6 }, fontStyle: 'bold' }).setOrigin(0.5).setDepth(400);
    } else if (n === 3) {
      // Подсветка кнопки "Полить" — unified color pulse
      const waterBtn = scene.toolButtons.get('water');
      if (waterBtn && waterBtn.gfx) {
        this.pulse = scene.add.circle(waterBtn.x, waterBtn.y, 40, 0xd8a494, 0.4).setDepth(149);
        scene.tweens.add({ targets: this.pulse, scale: { from: 0.9, to: 1.2 }, duration: 800, yoyo: true, repeat: -1 });
      }
      this.hint = scene.add.text(scene.scale.width / 2, scene.scale.height - 150,
        '💧 Полей растение, чтобы ускорить рост', { fontSize: '16px', color: '#ffffff', backgroundColor: '#0f172acc',
        padding: { x: 12, y: 6 }, fontStyle: 'bold' }).setOrigin(0.5).setDepth(400);
    }
  }

  next() { this.showStep(this.step + 1); }

  finish() {
    this.active = false;
    this.clear();
    localStorage.setItem('qg_onboarded', '1');
    if (this.scene.showToast) this.scene.showToast('Онбординг пройден!');
  }

  clear() {
    if (this.hint) { this.hint.destroy(); this.hint = null; }
    if (this.pulse) { this.scene.tweens.killTweensOf(this.pulse); this.pulse.destroy(); this.pulse = null; }
  }

  dispose() { this.clear(); }
}
