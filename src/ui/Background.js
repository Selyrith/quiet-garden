/**
 * Красивый процедурный фон: небо, солнце, луна, звезды и облака.
 */
export function drawBackground(scene) {
  const cam = scene.cameras.main;
  const W = scene.scale.width;
  const H = scene.scale.height;

  // 1. Небо (градиент полосами)
  const sky = scene.add.graphics().setDepth(-20);
  for (let i = 0; i < 10; i++) {
    const t = i / 10;
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x4facfe),
      Phaser.Display.Color.ValueToColor(0xa1c4fd),
      10, i
    );
    sky.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
    sky.fillRect(0, Math.floor(H * t), W, Math.ceil(H / 10) + 1);
  }

  // 2. Холмы (3 слоя глубины)
  const hillsFar = scene.add.graphics().setDepth(-19);
  hillsFar.fillStyle(0x86b88c, 1); // Светло-зеленый
  hillsFar.fillEllipse(W * 0.2, H * 0.8, W * 1.2, H * 0.6);
  hillsFar.fillEllipse(W * 0.8, H * 0.8, W * 1.2, H * 0.6);

  const hillsMid = scene.add.graphics().setDepth(-18);
  hillsMid.fillStyle(0x6da573, 1); // Средний
  hillsMid.fillEllipse(W * 0.5, H * 0.9, W * 1.5, H * 0.7);

  const hillsNear = scene.add.graphics().setDepth(-17);
  hillsNear.fillStyle(0x558a5c, 1); // Темнее
  hillsNear.fillEllipse(W * 0.1, H * 1.05, W * 1.0, H * 0.5);
  hillsNear.fillEllipse(W * 0.9, H * 1.05, W * 1.0, H * 0.5);

  // 3. Солнце, Луна и Звезды
  const skyContainer = scene.add.container(0, 0).setDepth(-5);

  const sun = scene.add.graphics();
  sun.fillStyle(0xFFFACD, 0.8);
  sun.fillCircle(W * 0.85, H * 0.15, 40);
  sun.fillStyle(0xFFFACD, 0.3);
  sun.fillCircle(W * 0.85, H * 0.15, 60);
  skyContainer.add(sun);

  const moon = scene.add.graphics();
  moon.fillStyle(0xE0E0E0, 1);
  moon.fillCircle(W * 0.15, H * 0.15, 35);
  moon.fillStyle(0xFFFFFF, 0.2);
  moon.fillCircle(W * 0.15, H * 0.15, 55);
  moon.fillStyle(0xBDBDBD, 1);
  moon.fillCircle(W * 0.15 - 10, H * 0.15 - 5, 6);
  moon.fillCircle(W * 0.15 + 12, H * 0.15 + 8, 4);
  moon.fillCircle(W * 0.15 + 5, H * 0.15 - 12, 3);
  moon.setAlpha(0);
  skyContainer.add(moon);

  const stars = scene.add.graphics();
  for (let i = 0; i < 40; i++) {
    const sx = Math.random() * W;
    const sy = Math.random() * (H * 0.5);
    const size = Math.random() * 1.5 + 0.5;
    stars.fillStyle(0xFFFFFF, Math.random() * 0.6 + 0.4);
    stars.fillCircle(sx, sy, size);
  }
  stars.setAlpha(0);
  skyContainer.add(stars);

  // 4. Пиксельные облака
  const createCloud = (x, y, scale, speed) => {
    const g = scene.add.graphics().setDepth(-15);
    g.fillStyle(0xffffff, 0.85);
    g.fillRect(0, 10 * scale, 40 * scale, 15 * scale);
    g.fillRect(10 * scale, 0, 20 * scale, 10 * scale);
    g.fillRect(30 * scale, 5, 15 * scale, 10 * scale);
    g.setPosition(x, y);

    scene.tweens.add({
      targets: g,
      x: W + 100,
      duration: speed,
      repeat: -1,
      onRepeat: () => { g.x = -100; }
    });
  };

  createCloud(-50, H * 0.1, 1.5, 40000);
  createCloud(W * 0.4, H * 0.15, 1.0, 55000);
  createCloud(W * 0.7, H * 0.05, 2.0, 70000);

  // Сохраняем ссылки для анимации неба
  sky.sun = sun;
  sky.moon = moon;
  sky.stars = stars;
  sky.skyContainer = skyContainer;
  sky.W = W;
  sky.H = H;

  return { sun, moon, stars, skyContainer, sky };
}

/**
 * Плавно анимирует солнце/луну/звёзды по небу в зависимости от фазы дня.
 * Утро: восход (слева-вверх), День: зенит (центр-верх), Вечер: закат (справа-вверх),
 * Ночь: луна и звёзды на небе, солнце скрыто.
 *
 * Оптимизация: твины и перекраска запускаются только при смене фазы или погоды,
 * а не при каждом тике мира. Это предотвращает накопление твинов и лишнюю
 * перерисовку градиента неба.
 */
export function updateSky(scene, bg, world) {
  if (!bg || !world) return;

  const phase = world.phase.id;
  const weatherId = world.weather?.id || 'sunny';
  const isBadWeather = ['rain', 'fog', 'cloudy'].includes(weatherId);

  // Не пересоздаём твины, если фаза и погода не изменились
  if (bg._lastPhase === phase && bg._lastWeather === weatherId && bg._skyTweensRunning) return;

  const W = bg.W;
  const H = bg.H;
  const { sun, moon, stars } = bg;

  // Целевые позиции солнца по фазе (x, y в долях W/H)
  let sunX = 0.85, sunY = 0.15;
  let moonX = 0.15, moonY = 0.15;
  let sunAlpha = 1, moonAlpha = 0, starsAlpha = 0;

  if (phase === 'morning') {
    sunX = 0.30; sunY = 0.25;
    sunAlpha = 1;
    moonAlpha = 0;
    starsAlpha = 0;
  } else if (phase === 'day') {
    sunX = 0.85; sunY = 0.15;
    sunAlpha = 1;
    moonAlpha = 0;
    starsAlpha = 0;
  } else if (phase === 'evening') {
    sunX = 0.92; sunY = 0.35;
    sunAlpha = isBadWeather ? 0 : 0.6;
    moonAlpha = 0.4;
    starsAlpha = 0.1;
  } else if (phase === 'night') {
    sunAlpha = 0;
    moonAlpha = 1;
    starsAlpha = isBadWeather ? 0.2 : 1;
  }

  // Погода скрывает светила
  if (isBadWeather && phase !== 'night') {
    sunAlpha = 0;
    moonAlpha = 0.2;
    starsAlpha = 0;
  }

  // Анимируем позиции солнца и луны плавно (3 сек)
  scene.tweens.killTweensOf(sun);
  scene.tweens.killTweensOf(moon);
  scene.tweens.killTweensOf(stars);
  scene.tweens.add({
    targets: sun,
    x: W * sunX, y: H * sunY,
    alpha: sunAlpha,
    duration: 3000, ease: 'Sine.easeInOut'
  });
  scene.tweens.add({
    targets: moon,
    x: W * moonX, y: H * moonY,
    alpha: moonAlpha,
    duration: 3000, ease: 'Sine.easeInOut'
  });
  scene.tweens.add({
    targets: stars,
    alpha: starsAlpha,
    duration: 3000, ease: 'Sine.easeInOut'
  });

  bg._lastPhase = phase;
  bg._lastWeather = weatherId;
  bg._skyTweensRunning = true;

  // Перекрашиваем небо под фазу дня (только при смене фазы)
  _recolorSky(bg, phase);
}

/**
 * Перекрашивает градиент неба под фазу дня.
 * Оптимизация: перерисовка происходит только при смене фазы,
 * кэшируется в bg._lastSkyPhase.
 */
function _recolorSky(bg, phase) {
  const { sky } = bg;
  if (!sky) return;
  if (bg._lastSkyPhase === phase) return;

  // Цветовые пары для каждой фазы (верх -> низ)
  const gradients = {
    morning: [0xfff0d0, 0xb5e2ff],  // мягкий рассвет
    day:     [0x4facfe, 0xa1c4fd],  // ясный день
    evening: [0xff9050, 0x4facfe],  // закатный оранжево-синий
    night:   [0x1a1a4a, 0x0a0a2a]   // тёмная ночь
  };

  const [topColor, bottomColor] = gradients[phase] || gradients.day;
  const W = bg.W, H = bg.H;

  // Очищаем старый градиент и рисуем новый
  sky.clear();
  sky.setDepth(-20);
  for (let i = 0; i < 10; i++) {
    const t = i / 10;
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(topColor),
      Phaser.Display.Color.ValueToColor(bottomColor),
      10, i
    );
    sky.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
    sky.fillRect(0, Math.floor(H * t), W, Math.ceil(H / 10) + 1);
  }

  bg._lastSkyPhase = phase;
}


