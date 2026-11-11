export function createWorldTint(scene) {
  const cam = scene.cameras.main;
  return scene.add.rectangle(0, 0, cam.width, cam.height, 0xffffff, 0)
    .setOrigin(0).setDepth(80).setScrollFactor(0);
}

export function applyWorldTint(scene, tintRect, world) {
  if (!tintRect || !world) return;

  const phaseAlpha = world.phase?.tintAlpha || 0;
  const seasonAlpha = world.season?.tintAlpha || 0;
  
  let targetColor = 0xffffff;
  let targetAlpha = 0;

  // Выбираем доминирующий тон
  if (phaseAlpha >= seasonAlpha && phaseAlpha > 0) {
    targetColor = world.phase.tint;
    targetAlpha = phaseAlpha;
  } else if (seasonAlpha > 0) {
    targetColor = world.season.tint;
    targetAlpha = seasonAlpha;
  }

  // Создаем прокси-объект для плавной интерполяции, если его нет
  if (!tintRect.tweenProxy) {
    tintRect.tweenProxy = { r: 255, g: 255, b: 255, a: targetAlpha };
  }

  const r = (targetColor >> 16) & 255;
  const g = (targetColor >> 8) & 255;
  const b = targetColor & 255;

  // Плавно меняем значения в течение 3 секунд. Останавливаем предыдущий твин,
  // чтобы при частых world-updated не накапливались перекрывающиеся твины.
  if (tintRect._tween) { tintRect._tween.stop(); tintRect._tween = null; }
  tintRect._tween = scene.tweens.add({
    targets: tintRect.tweenProxy,
    r: r,
    g: g,
    b: b,
    a: targetAlpha,
    duration: 3000,
    ease: 'Sine.easeInOut',
    onComplete: () => { tintRect._tween = null; },
    onUpdate: () => {
      const p = tintRect.tweenProxy;
      const color = (Math.round(p.r) << 16) | (Math.round(p.g) << 8) | Math.round(p.b);
      tintRect.setFillStyle(color, p.a);
    }
  });
}

export function worldIconsString(world) {
  if (!world) return '';
  const phase = world.phase?.icon || '';
  const weather = world.weather?.icon || '';
  const season = world.season?.icon || '';
  return `${phase}${weather}${season}`;
}
