/**
 * Общие функции отрисовки растений.
 * Используются в GameScene и BookOverlay.
 */

export function drawPlantIntoGraphics(g, plant, scale) {
  const { visual } = plant;
  const hue = visual.hue;
  const stemColor = hslToHex(hue, 45, 35);
  const leafColor = hslToHex(hue, 50, 45);
  const petalColor = hslToHex(hue, 65, 60);
  const centerColor = hslToHex((hue + 40) % 360, 70, 55);

  const s = scale;
  const stemH = visual.stemHeight * s;
  const stemW = Math.max(1, visual.stemWidth * s);
  const curve = visual.stemCurve * s;

  const segments = 6;
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const x = curve * t;
    const y = -stemH * t;
    g.fillStyle(stemColor, 1);
    g.fillRect(x - stemW / 2, y - stemH / segments, stemW, stemH / segments + 1);
  }

  const pairs = Math.ceil(visual.leafCount / 2);
  for (let i = 0; i < pairs; i++) {
    const t = (i + 1) / (pairs + 1);
    const x = curve * t;
    const y = -stemH * t;
    const size = visual.leafSize * s * (1 - t * 0.4);
    const dir = i % 2 === 0 ? 1 : -1;
    g.fillStyle(leafColor, 1);
    g.fillCircle(x + dir * size * 0.9, y, size);
  }

  const flowerX = curve;
  const flowerY = -stemH;
  const petals = visual.petalCount;
  const petalLen = visual.petalLength * s;
  const centerR = visual.centerSize * s;

  for (let i = 0; i < petals; i++) {
    const angle = (Math.PI * 2 * i) / petals;
    const px = flowerX + Math.cos(angle) * petalLen * 0.6;
    const py = flowerY + Math.sin(angle) * petalLen * 0.6;
    g.fillStyle(petalColor, 1);
    g.fillCircle(px, py, petalLen * 0.5);
  }

  g.fillStyle(centerColor, 1);
  g.fillCircle(flowerX, flowerY, centerR);
}

export function plantTileColor(plant) {
  if (!plant) return 0x5aa04a;
  return plant.rarity.color;
}

export function hslToHex(h, s, l) {
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
