import Phaser from 'phaser';

/**
 * Сезонные атмосферные частицы: лепестки весной, пыльца летом, листья осенью.
 * Зимой снег уже реализован в WeatherEffects, чтобы не дублировать.
 */
export class AmbientEffects {
  constructor(scene) {
    this.scene = scene;
    this.cam = scene.cameras.main;
    this.currentSeason = null;
    this.petals = null;
    this.pollen = null;
    this.leaves = null;
    this.createTextures();
  }

  createTextures() {
    // Лепесток — розовый овал (весна)
    const g1 = this.scene.make.graphics();
    g1.fillStyle(0xffb0d0, 1);
    g1.fillEllipse(4, 4, 6, 4);
    g1.fillStyle(0xffe0ec, 1);
    g1.fillEllipse(3, 3, 3, 2);
    g1.generateTexture('ambient_petal', 8, 8);
    g1.destroy();

    // Пыльца — жёлтая точка (лето)
    const g2 = this.scene.make.graphics();
    g2.fillStyle(0xffe066, 1);
    g2.fillCircle(3, 3, 2);
    g2.generateTexture('ambient_pollen', 6, 6);
    g2.destroy();

    // Лист — оранжевый с прожилкой (осень)
    const g3 = this.scene.make.graphics();
    g3.fillStyle(0xff8c42, 1);
    g3.fillEllipse(5, 5, 7, 4);
    g3.fillStyle(0xb85c1e, 0.8);
    g3.fillRect(4, 3, 2, 4);
    g3.generateTexture('ambient_leaf', 10, 10);
    g3.destroy();
  }

  startSeason(seasonId) {
    this.stopAll();
    this.currentSeason = seasonId;
    if (seasonId === 'spring') this.startPetals();
    else if (seasonId === 'summer') this.startPollen();
    else if (seasonId === 'autumn') this.startLeaves();
    // winter — снег уже есть в WeatherEffects
  }

  startPetals() {
    this.petals = this.scene.add.particles(0, 0, 'ambient_petal', {
      x: { min: 0, max: this.cam.width },
      y: -20,
      lifespan: 9000,
      speedX: { min: -30, max: -10 },
      speedY: { min: 40, max: 80 },
      rotation: { min: 0, max: 360 },
      rotate: { min: -90, max: 90 },
      scale: { min: 0.8, max: 1.4 },
      alpha: { start: 0.9, end: 0.3 },
      frequency: 700,
      quantity: 1
    }).setDepth(70);
  }

  startPollen() {
    this.pollen = this.scene.add.particles(0, 0, 'ambient_pollen', {
      x: { min: 0, max: this.cam.width },
      y: { min: 0, max: this.cam.height },
      lifespan: 6000,
      speedX: { min: -15, max: 15 },
      speedY: { min: -10, max: -30 },
      scale: { min: 0.5, max: 1.2 },
      alpha: { start: 0.7, end: 0 },
      frequency: 900,
      quantity: 1,
      blendMode: 'ADD'
    }).setDepth(70);
  }

  startLeaves() {
    this.leaves = this.scene.add.particles(0, 0, 'ambient_leaf', {
      x: { min: 0, max: this.cam.width },
      y: -20,
      lifespan: 8000,
      speedX: { min: 20, max: 60 },
      speedY: { min: 50, max: 100 },
      rotation: { min: 0, max: 360 },
      rotate: { min: -180, max: 180 },
      scale: { min: 0.8, max: 1.5 },
      alpha: { start: 0.95, end: 0.4 },
      frequency: 500,
      quantity: 1
    }).setDepth(70);
  }

  update(world) {
    if (!world || !world.season) return;
    const seasonId = world.season.id;
    if (this.currentSeason === seasonId) return;
    this.startSeason(seasonId);
  }

  stopAll() {
    if (this.petals) { this.petals.destroy(); this.petals = null; }
    if (this.pollen) { this.pollen.destroy(); this.pollen = null; }
    if (this.leaves) { this.leaves.destroy(); this.leaves = null; }
  }

  dispose() {
    this.stopAll();
  }
}
