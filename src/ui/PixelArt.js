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

  for (let i = 0; i < petals; i++) {
    const angle = (Math.PI * 2 * i) / petals;
    const px = flowerX + Math.cos(angle) * petalLen * 0.5;
    const py = flowerY + Math.sin(angle) * petalLen * 0.5;
    g.fillStyle((isRainbow && !isOutline) ? hsl((hue + i * 45) % 360, 90, 60) : petalLight, 1);
    g.fillCircle(px, py, petalLen * 0.6);
    if (!isOutline) {
      g.fillStyle(highlight, 0.8);
      g.fillCircle(px - petalLen * 0.15, py - petalLen * 0.15, petalLen * 0.2);
    }
  }

  g.fillStyle(centerColor, 1);
  g.fillCircle(flowerX, flowerY, centerR);
  if (!isOutline) {
    g.fillStyle(highlight, 0.9);
    g.fillCircle(flowerX - centerR * 0.3, flowerY - centerR * 0.3, centerR * 0.4);
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
  
  // Ствол (коричневый)
  g.fillStyle(isOutline ? 0x1a0f0a : 0x5d4037, 1);
  g.fillRect(ox - w/2, oy - h, w, h);
  
  // Крона
  const crownY = oy - h;
  const r = v.petalLength * s * 1.8;
  
  g.fillStyle(isOutline ? 0x1a0f0a : colorLeafD, 1);
  g.fillCircle(ox, crownY, r);
  g.fillCircle(ox - r*0.6, crownY + r*0.3, r*0.7);
  g.fillCircle(ox + r*0.6, crownY + r*0.3, r*0.7);
  
  if (!isOutline) {
    g.fillStyle(colorLeafL, 0.8);
    g.fillCircle(ox - r*0.3, crownY - r*0.3, r*0.4);
    g.fillCircle(ox + r*0.2, crownY - r*0.1, r*0.3);
  }
}

function drawMushroom(g, v, s, ox, oy, colorD, colorL, colorHi, isOutline) {
  const h = v.stemHeight * s;
  const w = v.stemWidth * s * 1.5;
  
  // Ножка (белая)
  g.fillStyle(isOutline ? 0x1a0f0a : 0xeeeeee, 1);
  g.fillRect(ox - w/2, oy - h, w, h);
  
  // Шляпка
  const cr = v.petalLength * s * 1.5;
  g.fillStyle(isOutline ? 0x1a0f0a : colorD, 1);
  g.fillEllipse(ox, oy - h, cr*2, cr);
  
  // Точки на шляпке
  if (!isOutline) {
    g.fillStyle(colorHi, 0.8);
    g.fillCircle(ox - cr*0.4, oy - h - cr*0.2, 2.5*s);
    g.fillCircle(ox + cr*0.5, oy - h - cr*0.3, 2*s);
    g.fillCircle(ox, oy - h - cr*0.6, 1.5*s);
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
    g.fillStyle(colorHi, 0.6);
    g.fillTriangle(ox, oy - h + 4*s, ox - w*0.2, oy - 4*s, ox + w*0.1, oy - 4*s);
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
    g.fillStyle(colorHi, 0.8);
    g.fillCircle(ox - r*0.3, oy - h - r*0.8, r*0.3);
    // Магическое кольцо
    g.lineStyle(2*s, colorHi, 0.5);
    g.strokeEllipse(ox, oy - h - r*0.5, r*2.5, r*0.8);
  }
}
