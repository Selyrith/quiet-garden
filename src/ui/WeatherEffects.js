import Phaser from 'phaser';

export class WeatherEffects {
  constructor(scene) {
    this.scene = scene;
    this.cam = scene.cameras.main;

    this.createTextures();

    this.currentWeather = null;
    this.currentSeason = null;
    this.currentPhase = null;

    // 1. Оверлей для погоды (дождь = темно-синий, туман = серый)
    this.weatherTint = scene.add.rectangle(0, 0, this.cam.width, this.cam.height, 0x000000, 0)
      .setOrigin(0).setDepth(81);

    // Лужи/рябь при дожде (лёгкая графика, без postFX)
    this.puddles = scene.add.graphics().setDepth(82);
    this._puddleT = 0;

    // 2. ДОЖДЬ
    this.rain = scene.add.particles(0, 0, 'raindrop', {
      x: { min: 0, max: this.cam.width },
      y: -20,
      lifespan: 600,
      speedY: { min: 600, max: 900 },
      speedX: { min: -50, max: -100 },
      scale: { min: 0.8, max: 1.5 },
      quantity: 3,
      frequency: 15,
      blendMode: 'NORMAL'
    }).setDepth(190).setAlpha(0);

    // 3. ТУМАН
    this.fog = scene.add.particles(0, 0, 'fog_cloud', {
      x: { min: -100, max: this.cam.width },
      y: { min: 100, max: this.cam.height },
      lifespan: 12000,
      speedX: { min: 10, max: 30 },
      speedY: { min: -5, max: 5 },
      scale: { start: 2, end: 4 },
      alpha: { start: 0, peak: 0.25, end: 0 },
      quantity: 1,
      frequency: 800,
      blendMode: 'NORMAL'
    }).setDepth(85).setAlpha(0);

    // 4. СНЕГ (Зима)
    this.snow = scene.add.particles(0, 0, 'snowflake', {
      x: { min: 0, max: this.cam.width },
      y: -20,
      lifespan: 4000,
      speedY: { min: 60, max: 120 },
      speedX: { min: -20, max: 20 },
      scale: { min: 0.6, max: 1.5 },
      alpha: { start: 0.8, end: 0.1 },
      quantity: 1,
      frequency: 100
    }).setDepth(200).setAlpha(0);

    // 5. СВЕТЛЯЧКИ (Ночь)
    this.fireflies = scene.add.particles(0, 0, 'firefly', {
      x: { min: 0, max: this.cam.width },
      y: { min: 100, max: this.cam.height },
      lifespan: 6000,
      speedX: { min: -8, max: 8 },
      speedY: { min: -8, max: 8 },
      scale: { start: 0.4, end: 1.0 },
      alpha: { start: 0, peak: 0.8, end: 0 },
      quantity: 1,
      frequency: 1500,
      blendMode: 'ADD'
    }).setDepth(90).setAlpha(0);
  }

  createTextures() {
    // Дождь (синяя линия)
    const g1 = this.scene.make.graphics();
    g1.fillStyle(0x4fc3f7, 0.8);
    g1.fillRect(0, 0, 2, 12);
    g1.generateTexture('raindrop', 2, 12);
    g1.destroy();

    // Туман (белое пятно)
    const g2 = this.scene.make.graphics();
    g2.fillStyle(0xffffff, 0.4);
    g2.fillCircle(16, 16, 16);
    g2.fillStyle(0xffffff, 0.8);
    g2.fillCircle(16, 16, 10);
    g2.generateTexture('fog_cloud', 32, 32);
    g2.destroy();

    // Снежинка
    const g3 = this.scene.make.graphics();
    g3.fillStyle(0xffffff, 1);
    g3.fillCircle(4, 4, 4);
    g3.generateTexture('snowflake', 8, 8);
    g3.destroy();

    // Светлячок
    const g4 = this.scene.make.graphics();
    g4.fillStyle(0xffd54f, 0.15);
    g4.fillCircle(8, 8, 8);
    g4.fillStyle(0xffeb3b, 0.5);
    g4.fillCircle(8, 8, 5);
    g4.fillStyle(0xffffff, 1);
    g4.fillCircle(8, 8, 2);
    g4.generateTexture('firefly', 16, 16);
    g4.destroy();
  }

  update(world) {
    if (!world) return;

    // 1. Погода (дождь, туман)
    if (this.currentWeather !== world.weather.id) {
      this.currentWeather = world.weather.id;
      this.setWeather(this.currentWeather);
    }
    // Анимируем лёгкую рябь/лужи при дожде
    if (this.currentWeather === 'rain') {
      this._puddleT += 0.05;
      this.puddles.clear();
      const w = this.cam.width, h = this.cam.height;
      for (let i = 0; i < 6; i++) {
        const px = (w * (i + 1)) / 7 + Math.sin(this._puddleT + i) * 6;
        const py = h * 0.75 + (i % 3) * 18;
        this.puddles.fillStyle(0x6fb7e8, 0.12 + 0.04 * Math.sin(this._puddleT * 2 + i));
        this.puddles.fillEllipse(px, py, 60 + i * 6, 18 + (i % 2) * 4);
      }
    } else if (this.puddles) {
      this.puddles.clear();
    }

    // 2. Сезон (снег зимой)
    if (this.currentSeason !== world.season.id) {
      this.currentSeason = world.season.id;
      this.scene.tweens.add({
        targets: this.snow,
        alpha: this.currentSeason === 'winter' ? 1 : 0,
        duration: 2000
      });
    }

    // 3. Время суток (светлячки ночью)
    if (this.currentPhase !== world.phase.id) {
      this.currentPhase = world.phase.id;
      this.scene.tweens.add({
        targets: this.fireflies,
        alpha: this.currentPhase === 'night' ? 1 : 0,
        duration: 2000
      });
    }
  }

  setWeather(weatherId) {
    // Сбрасываем предыдущие твины
    this.scene.tweens.killTweensOf([this.rain, this.fog, this.weatherTint]);

    // СНАЧАЛА сбрасываем дождь и туман во всех случаях
    this.scene.tweens.add({ targets: this.rain, alpha: 0, duration: 1000 });
    this.scene.tweens.add({ targets: this.fog, alpha: 0, duration: 1000 });

    // Дождь
    if (weatherId === 'rain') {
      this.scene.tweens.add({ targets: this.rain, alpha: 1, duration: 1000 });
      this.weatherTint.setFillStyle(0x1a2b3c); // Темно-синий
      this.scene.tweens.add({ targets: this.weatherTint, alpha: 0.35, duration: 1500 });
    } 
    // Туман
    else if (weatherId === 'fog') {
      this.scene.tweens.add({ targets: this.fog, alpha: 1, duration: 1000 });
      this.weatherTint.setFillStyle(0xbbbbbb); // Серый
      this.scene.tweens.add({ targets: this.weatherTint, alpha: 0.2, duration: 1500 });
    } 
    // Облачно
    else if (weatherId === 'cloudy') {
      this.weatherTint.setFillStyle(0x555555); // Легкое затемнение
      this.scene.tweens.add({ targets: this.weatherTint, alpha: 0.15, duration: 1500 });
    } 
    // Солнечно
    else {
      this.scene.tweens.add({ targets: this.weatherTint, alpha: 0, duration: 1500 });
    }
  }

  resize() {
    const w = this.cam.width;
    const h = this.cam.height;
    this.weatherTint.setSize(w, h);

    const resizeZone = (emitter, width, height) => {
      if (!emitter || !emitter.emitZones || emitter.emitZones.length === 0) return;
      const zone = emitter.emitZones[0];
      if (zone && typeof zone.resize === 'function') {
        zone.resize(width, height);
      } else if (zone && zone.source && typeof zone.source.setSize === 'function') {
        zone.source.setSize(width, height);
      }
    };

    if (this.rain) resizeZone(this.rain, w, 1);
    if (this.fog) resizeZone(this.fog, w + 200, h);
    if (this.snow) resizeZone(this.snow, w, 1);
    if (this.fireflies) resizeZone(this.fireflies, w, h);
  }
}
