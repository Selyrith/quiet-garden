import { getMutation } from '../../shared/mutations.js';

export function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return (Math.round((r + m) * 255) << 16) | (Math.round((g + m) * 255) << 8) | Math.round((b + m) * 255);
}

/**
 * Рисует растение С ТЁМНЫМ КОНТУРОМ — так же, как оно выглядит на грядке.
 *
 * Зачем: в оверлеях (карточка растения, паки, мутации) растения рисовались
 * напрямую, без обводки, и «плавали» на светлом фоне — выглядели плоско и
 * отличались от того же вида в саду. Один хелпер держит стиль единым.
 */
export function drawOutlinedPlant(g, plant, scale, mutationIndex = null, offsetX = 0, offsetY = 0) {
  const o = Math.max(0.9, scale * 1.8);
  const dirs = [
    [-o, 0], [o, 0], [0, -o], [0, o],
    [-o, -o], [o, -o], [-o, o], [o, o],
  ];
  for (const [dx, dy] of dirs) {
    drawPixelPlant(g, plant, scale, 0, mutationIndex, offsetX + dx, offsetY + dy, true);
  }
  drawPixelPlant(g, plant, scale, 0, mutationIndex, offsetX, offsetY, false);
}


export function drawPixelPlant(
  g, plant, scale, sway = 0, mutationIndex = null,
  offsetX = 0, offsetY = 0, isOutline = false
) {
  const v = plant.visual;
  let hue = v.hue;
  let extraScale = 1;
  let glowColor = null;
  let isGold = false;
  let isRainbow = false;

  if (mutationIndex !== null && mutationIndex !== undefined && !isOutline) {
    const mut = getMutation(plant.seed, mutationIndex);
    if (mut) {
      if (mut.type === 'color') hue = mut.hue;
      else if (mut.type === 'size') extraScale = 1.4;
      else if (mut.type === 'glow') glowColor = hsl(mut.hue, 85, 65);
      else if (mut.type === 'gold') isGold = true;
      else if (mut.type === 'rainbow') isRainbow = true;
    }
  }

  let stemColor, leafDark, leafLight, petalDark, petalLight, centerColor, highlight;

  if (isOutline) {
    stemColor = leafDark = leafLight = petalDark = petalLight = centerColor = highlight = 0x1a0f0a;
  } else if (isGold) {
    stemColor = 0x8d6e1d;
    leafDark = 0xdaa520;
    leafLight = 0xffd700;
    petalDark = 0xffb300;
    petalLight = 0xffeb3b;
    centerColor = 0xfff59d;
    highlight = 0xffffff;
  } else if (isRainbow) {
    stemColor = hsl(120, 60, 30);
    leafDark = hsl(120, 70, 40);
    leafLight = hsl(120, 80, 55);
    petalDark = hsl(hue, 90, 55);
    petalLight = hsl((hue + 60) % 360, 90, 70);
    centerColor = hsl((hue + 180) % 360, 90, 60);
    highlight = 0xffffff;
  } else {
    stemColor = hsl(hue, 60, 30);
    leafDark = hsl(hue, 70, 40);
    leafLight = hsl(hue, 80, 55);
    petalDark = hsl(hue, 90, 55);
    petalLight = hsl(hue, 95, 70);
    centerColor = hsl((hue + 40) % 360, 90, 60);
    highlight = hsl(hue, 50, 95);
  }

  const s = scale * extraScale;
  
  if (glowColor !== null) {
    g.fillStyle(glowColor, 0.3);
    g.fillCircle(offsetX, offsetY - (v.stemHeight * s) * 0.8, 30 * s);
    g.fillStyle(glowColor, 0.15);
    g.fillCircle(offsetX, offsetY - (v.stemHeight * s) * 0.8, 45 * s);
  }

  if (v.type === 'cactus') {
    drawCactus(g, v, s, offsetX, offsetY, stemColor, leafLight, isOutline);
  } else if (v.type === 'tree') {
    drawTree(g, v, s, offsetX, offsetY, leafDark, leafLight, isOutline);
  } else if (v.type === 'mushroom') {
    drawMushroom(g, v, s, offsetX, offsetY, petalDark, petalLight, highlight, isOutline);
  } else if (v.type === 'crystal') {
    drawCrystal(g, v, s, offsetX, offsetY, petalDark, petalLight, highlight, isOutline);
  } else if (v.type === 'orb') {
    drawOrb(g, v, s, offsetX, offsetY, stemColor, petalLight, highlight, isOutline);
  } else {
    // 'flower' и 'fern' - базовый цветок
    drawFlower(g, v, s, offsetX, offsetY, sway, stemColor, leafDark, leafLight, petalDark, petalLight, centerColor, highlight, isOutline, isRainbow, hue);
  }
}

function drawFlower(g, v, s, ox, oy, sway, stemColor, leafDark, leafLight, petalDark, petalLight, centerColor, highlight, isOutline, isRainbow, hue) {
  const stemH = v.stemHeight * s;
  const stemW = Math.max(2, v.stemWidth * s);
  const curve = v.stemCurve * s;
  const swayAmp = (sway || 0) * 4;

  const segments = 8;
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const x = ox + curve * t * t + swayAmp * t;
    const y = oy - stemH * t;
    g.fillStyle(stemColor, 1);
    g.fillRect(x - stemW / 2, y - stemH / segments, stemW, stemH / segments + 1);
    if (!isOutline) {
      g.fillStyle(leafLight, 0.5);
      g.fillRect(x - stemW / 2 + 1, y - stemH / segments, 1, stemH / segments + 1);
    }
  }

  const pairs = Math.ceil(v.leafCount / 2);
  for (let i = 0; i < pairs; i++) {
    const t = (i + 1) / (pairs + 1);
    const x = ox + curve * t * t + swayAmp * t;
    const y = oy - stemH * t;
    const size = v.leafSize * s * (1 - t * 0.3);
    const dir = i % 2 === 0 ? 1 : -1;
    g.fillStyle(leafDark, 1);
    g.fillCircle(x + dir * size * 0.9, y, size);
    if (!isOutline) {
      g.fillStyle(leafLight, 1);
      g.fillCircle(x + dir * size * 0.9 - dir * size * 0.25, y - size * 0.25, size * 0.6);
    }
  }

  const flowerX = ox + curve + swayAmp;
  const flowerY = oy - stemH;
  const petals = v.petalCount;
  const petalLen = v.petalLength * s;
  const centerR = v.centerSize * s;

  for (let i = 0; i < petals; i++) {
    const angle = (Math.PI * 2 * i) / petals + (Math.PI / petals);
    const px = flowerX + Math.cos(angle) * petalLen * 0.8;
    const py = flowerY + Math.sin(angle) * petalLen * 0.8;
    g.fillStyle((isRainbow && !isOutline) ? hsl((hue + i * 45 + 180) % 360, 80, 45) : petalDark, 1);
    g.fillCircle(px, py, petalLen * 0.6);
  }

  // Внутренний ряд лепестков: тело + блик у кончика + тонкая прожилка.
  // На грядке 42–55 px это даёт «объёмный цветок», а не плоское пятно.
  for (let i = 0; i < petals; i++) {
    const angle = (Math.PI * 2 * i) / petals;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const px = flowerX + dx * petalLen * 0.5;
    const py = flowerY + dy * petalLen * 0.5;
    const body = (isRainbow && !isOutline) ? hsl((hue + i * 45) % 360, 90, 60) : petalLight;
    g.fillStyle(body, 1);
    g.fillCircle(px, py, petalLen * 0.6);

    if (!isOutline) {
      // Блик к кончику лепестка (свет сверху-слева).
      g.fillStyle(highlight, 0.85);
      g.fillCircle(px - dx * petalLen * 0.18, py - dy * petalLen * 0.18, petalLen * 0.22);
      // Тень у основания — лепесток «входит» в сердцевину.
      g.fillStyle(petalDark, 0.55);
      g.fillCircle(px + dx * petalLen * 0.3, py + dy * petalLen * 0.3, petalLen * 0.2);
      // Прожилка.
      g.lineStyle(Math.max(0.8, petalLen * 0.06), highlight, 0.55);
      g.beginPath();
      g.moveTo(px - dx * petalLen * 0.25, py - dy * petalLen * 0.25);
      g.lineTo(px + dx * petalLen * 0.3, py + dy * petalLen * 0.3);
      g.strokePath();
    }
  }

  // Сердцевина: тёмный ободок, тело, тычинки-точки, блик.
  g.fillStyle(petalDark, 0.9);
  g.fillCircle(flowerX, flowerY, centerR * 1.25);
  g.fillStyle(centerColor, 1);
  g.fillCircle(flowerX, flowerY, centerR);
  if (!isOutline) {
    const stamen = Math.max(3, Math.round(petals / 2));
    for (let i = 0; i < stamen; i++) {
      const a = (Math.PI * 2 * i) / stamen;
      g.fillStyle(highlight, 0.95);
      g.fillCircle(
        flowerX + Math.cos(a) * centerR * 0.6,
        flowerY + Math.sin(a) * centerR * 0.6,
        Math.max(0.8, centerR * 0.16),
      );
    }
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(flowerX - centerR * 0.32, flowerY - centerR * 0.34, centerR * 0.42);
  }
}

function drawCactus(g, v, s, ox, oy, colorStem, colorLight, isOutline) {
  const h = v.stemHeight * s;
  const w = v.stemWidth * s * 1.2;
  
  g.fillStyle(colorStem, 1);
  // Главный ствол
  g.fillRoundedRect(ox - w/2, oy - h, w, h, w*0.4);
  // Левая ветка
  const lw = w*0.7, lh = h*0.35;
  g.fillRoundedRect(ox - w/2 - lw*0.8, oy - h*0.6, lw, h*0.2, lw*0.4);
  g.fillRoundedRect(ox - w/2 - lw*0.8, oy - h*0.6 - lh, lw, lh, lw*0.4);
  // Правая ветка
  const rw = w*0.7, rh = h*0.4;
  g.fillRoundedRect(ox + w/2 - rw*0.2, oy - h*0.7, rw, h*0.2, rw*0.4);
  g.fillRoundedRect(ox + w/2 - rw*0.2, oy - h*0.7 - rh, rw, rh, rw*0.4);

  if (!isOutline) {
    g.fillStyle(colorLight, 0.5);
    g.fillRect(ox - w/2 + 2, oy - h + w*0.4, 2, h - w*0.8);
    // Колючки (маленькие линии)
    g.lineStyle(1, 0xffffff, 0.6);
    for(let i=0; i<h; i+=8*s) {
      g.lineBetween(ox - w/2, oy - i, ox - w/2 - 3*s, oy - i - 2*s);
      g.lineBetween(ox + w/2, oy - i, ox + w/2 + 3*s, oy - i - 2*s);
    }
  }
}

function drawTree(g, v, s, ox, oy, colorLeafD, colorLeafL, isOutline) {
  const h = v.stemHeight * s;
  const w = v.stemWidth * s * 2;
  
  // Ствол: тёмная кора + светлая кромка + развилка.
  g.fillStyle(isOutline ? 0x1a0f0a : 0x5D4037, 1);
  g.fillRoundedRect(ox - w / 2, oy - h, w, h, Math.min(w / 2, 2 * s));
  if (!isOutline) {
    g.fillStyle(0x3E2A1B, 0.55);
    g.fillRect(ox + w * 0.08, oy - h + 2, Math.max(1, w * 0.3), h - 2);
    g.fillStyle(0x8A6A4E, 0.7);
    g.fillRect(ox - w * 0.42, oy - h + 2, Math.max(1, w * 0.16), h * 0.7);
    // Развилка у кроны.
    g.lineStyle(Math.max(1, w * 0.35), 0x5D4037, 1);
    g.lineBetween(ox, oy - h + 2, ox - w * 1.2, oy - h - w * 0.7);
    g.lineBetween(ox, oy - h + 2, ox + w * 1.1, oy - h - w * 0.6);
  }

  // Крона: три слоя — тень, тело, свет.
  const crownY = oy - h;
  const r = v.petalLength * s * 1.8;

  if (!isOutline) {
    // Тёмная подложка снизу-справа.
    g.fillStyle(0x1F3D22, 0.35);
    g.fillCircle(ox + r * 0.1, crownY + r * 0.18, r * 1.05);
  }

  g.fillStyle(isOutline ? 0x1a0f0a : colorLeafD, 1);
  g.fillCircle(ox, crownY, r);
  g.fillCircle(ox - r * 0.6, crownY + r * 0.3, r * 0.7);
  g.fillCircle(ox + r * 0.6, crownY + r * 0.3, r * 0.7);

  if (!isOutline) {
    // Средний слой кроны — объём.
    g.fillStyle(colorLeafL, 1);
    g.fillCircle(ox - r * 0.35, crownY - r * 0.25, r * 0.62);
    g.fillCircle(ox + r * 0.3, crownY - r * 0.05, r * 0.5);

    // Световые пятна (солнце сверху-слева).
    g.fillStyle(0xDFF0B0, 0.75);
    g.fillCircle(ox - r * 0.45, crownY - r * 0.42, r * 0.28);
    g.fillStyle(0xFFFFFF, 0.35);
    g.fillCircle(ox - r * 0.55, crownY - r * 0.5, r * 0.13);

    // Редкие ягодки/цветы в кроне — «живое» дерево.
    const berries = 3 + (v.leafCount % 3);
    for (let i = 0; i < berries; i++) {
      const a = -Math.PI * 0.9 + (Math.PI * 0.8 * i) / berries;
      g.fillStyle(0xE8A2B8, 0.95);
      g.fillCircle(ox + Math.cos(a) * r * 0.55, crownY + Math.sin(a) * r * 0.4, Math.max(1, 1.1 * s));
    }
  }
}

function drawMushroom(g, v, s, ox, oy, colorD, colorL, colorHi, isOutline) {
  const h = v.stemHeight * s;
  const w = v.stemWidth * s * 1.5;
  
  // Ножка: тень с одной стороны + светлая кромка + «юбочка».
  const stemFill = isOutline ? 0x1a0f0a : 0xEEE6D8;
  g.fillStyle(stemFill, 1);
  g.fillRoundedRect(ox - w / 2, oy - h, w, h, Math.min(w / 2, 3 * s));
  if (!isOutline) {
    g.fillStyle(colorD, 0.22);
    g.fillRect(ox + w * 0.1, oy - h + 2, w * 0.35, h - 2);
    g.fillStyle(0xFFFFFF, 0.5);
    g.fillRect(ox - w * 0.42, oy - h + 2, Math.max(1, w * 0.18), h - 2);
    // Юбочка у основания шляпки.
    g.fillStyle(0xFFF6E0, 0.85);
    g.fillEllipse(ox, oy - h + 2 * s, w * 1.5, w * 0.7);
  }

  // Шляпка: тёмная тень снизу, тело, светлый блик сверху.
  const cr = v.petalLength * s * 1.5;
  g.fillStyle(isOutline ? 0x1a0f0a : colorD, 1);
  g.fillEllipse(ox, oy - h, cr * 2, cr);

  if (!isOutline) {
    // Пластинки под шляпкой.
    g.fillStyle(0x2C1B10, 0.35);
    g.fillEllipse(ox, oy - h + cr * 0.34, cr * 1.7, cr * 0.34);
    g.lineStyle(Math.max(0.7, 0.9 * s), 0xFFF6E0, 0.35);
    for (let i = -3; i <= 3; i++) {
      const lx = ox + i * cr * 0.22;
      g.lineBetween(lx, oy - h + cr * 0.2, lx, oy - h + cr * 0.44);
    }
    // Верхний блик — шляпка «глянцевая».
    g.fillStyle(colorL, 1);
    g.fillEllipse(ox - cr * 0.1, oy - h - cr * 0.28, cr * 1.2, cr * 0.42);
    g.fillStyle(0xFFFFFF, 0.4);
    g.fillEllipse(ox - cr * 0.32, oy - h - cr * 0.36, cr * 0.45, cr * 0.18);

    // Пятнышки: у каждого гриба свой рисунок (хвост от семени).
    const spots = 3 + (v.leafCount % 3);
    for (let i = 0; i < spots; i++) {
      const a = -Math.PI + (Math.PI * (i + 0.5)) / spots;
      const rr = cr * (0.35 + ((i * 37) % 40) / 100);
      g.fillStyle(colorHi, 0.9);
      g.fillCircle(ox + Math.cos(a) * rr, oy - h - cr * 0.12 + Math.sin(a) * rr * 0.5, (1.6 + (i % 3) * 0.7) * s);
    }
  }
}

function drawCrystal(g, v, s, ox, oy, colorD, colorL, colorHi, isOutline) {
  const h = v.stemHeight * s;
  const w = v.stemWidth * s * 2;
  
  // Центральный
  g.fillStyle(isOutline ? 0x1a0f0a : colorD, 1);
  g.fillTriangle(ox, oy - h, ox - w/2, oy, ox + w/2, oy);
  
  // Боковые
  g.fillStyle(isOutline ? 0x1a0f0a : colorL, 1);
  g.fillTriangle(ox - w*0.8, oy - h*0.6, ox - w*1.4, oy, ox - w*0.2, oy);
  g.fillTriangle(ox + w*0.8, oy - h*0.7, ox + w*0.2, oy, ox + w*1.4, oy);
  
  if (!isOutline) {
    // Ядро кристалла — самое светлое, «свет внутри камня».
    g.fillStyle(colorHi, 0.85);
    g.fillTriangle(ox, oy - h + 3 * s, ox - w * 0.22, oy - 2 * s, ox + w * 0.1, oy - 2 * s);
    g.fillStyle(0xFFFFFF, 0.55);
    g.fillTriangle(ox, oy - h + 6 * s, ox - w * 0.1, oy - h * 0.45, ox + w * 0.04, oy - h * 0.5);

    // Тёмная грань по правой стороне — объём.
    g.fillStyle(0x2C1B10, 0.22);
    g.fillTriangle(ox, oy - h, ox + w / 2, oy, ox + w * 0.18, oy);

    // Парящие осколки вокруг.
    g.fillStyle(colorL, 0.9);
    g.fillTriangle(ox - w * 1.15, oy - h * 0.75, ox - w * 1.32, oy - h * 0.6, ox - w * 1.02, oy - h * 0.58);
    g.fillTriangle(ox + w * 1.08, oy - h * 0.9, ox + w * 1.26, oy - h * 0.72, ox + w * 0.98, oy - h * 0.7);
    g.fillStyle(0xFFFFFF, 0.75);
    g.fillCircle(ox - w * 1.15, oy - h * 0.85, Math.max(0.8, 1.1 * s));
    g.fillCircle(ox + w * 1.2, oy - h * 0.55, Math.max(0.7, 1 * s));

    // Каменное основание.
    g.fillStyle(colorD, 0.85);
    g.fillEllipse(ox, oy, w * 1.5, w * 0.45);
  }
}

function drawOrb(g, v, s, ox, oy, colorStem, colorOrb, colorHi, isOutline) {
  const h = v.stemHeight * s;
  
  // Тонкий стебель
  g.fillStyle(isOutline ? 0x1a0f0a : colorStem, 1);
  g.fillRect(ox - 1*s, oy - h, 2*s, h);
  
  // Парящий шар
  const r = v.petalLength * s * 1.2;
  g.fillStyle(isOutline ? 0x1a0f0a : colorOrb, 1);
  g.fillCircle(ox, oy - h - r*0.5, r);
  
  if (!isOutline) {
    // Ядро: три круга от светлого к тёмному — шар «светится изнутри».
    g.fillStyle(colorHi, 0.55);
    g.fillCircle(ox, oy - h - r * 0.5, r * 0.75);
    g.fillStyle(colorHi, 0.9);
    g.fillCircle(ox - r * 0.2, oy - h - r * 0.62, r * 0.4);
    g.fillStyle(0xFFFFFF, 0.95);
    g.fillCircle(ox - r * 0.32, oy - h - r * 0.72, r * 0.2);

    // Магическое кольцо (наклонный эллипс) + орбитальные точки.
    g.lineStyle(Math.max(1.2, 1.6 * s), colorHi, 0.55);
    g.strokeEllipse(ox, oy - h - r * 0.5, r * 2.6, r * 0.85);
    g.fillStyle(0xFFFFFF, 0.9);
    g.fillCircle(ox + r * 1.15, oy - h - r * 0.42, Math.max(1, 1.1 * s));
    g.fillCircle(ox - r * 1.05, oy - h - r * 0.6, Math.max(0.8, 0.9 * s));
  }
}
