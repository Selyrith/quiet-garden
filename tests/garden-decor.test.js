import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeLayout } from '../src/ui/Layout.js';
import { computeDecorBands } from '../src/ui/GardenFrame.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenePath = path.resolve(__dirname, '../src/scenes/GameScene.js');
const decorPath = path.resolve(__dirname, '../src/ui/GardenDecor.js');
const framePath = path.resolve(__dirname, '../src/ui/GardenFrame.js');

const SCREENS = [
  { name: 'iPhone SE', w: 320, h: 568 },
  { name: 'iPhone 14', w: 390, h: 844 },
  { name: 'iPad', w: 768, h: 1024 },
  { name: 'Desktop', w: 1920, h: 1080 },
];

test('сад не тянет растровые спрайты из внешних паков', () => {
  const src = fs.readFileSync(scenePath, 'utf8');
  assert.ok(!/magic-garden/.test(src), 'GameScene не должен грузить /assets/sprites/magic-garden');
  assert.ok(!/GARDEN_SPRITES/.test(src), 'таблица GARDEN_SPRITES удалена');
});

test('декор сада процедурный и лежит в отдельном модуле', () => {
  const src = fs.readFileSync(scenePath, 'utf8');
  assert.ok(/createGardenDecor/.test(src), 'GameScene должен создавать декор');
  assert.ok(/GardenDecor\.js/.test(src), 'декор вынесен в отдельный модуль');

  const mod = fs.readFileSync(decorPath, 'utf8');
  assert.ok(/bakePondTexture/.test(mod) && /bakeLanternTexture/.test(mod) && /bakeBenchTexture/.test(mod),
    'есть процедурные текстуры пруда, фонаря и скамейки');
  assert.ok(!/load\.image/.test(mod), 'модуль декора не грузит внешние ассеты');

  const bake = fs.readFileSync(path.resolve(__dirname, '../src/ui/BakeTexture.js'), 'utf8');
  assert.ok(/generateTexture/.test(bake), 'графика запекается в текстуру один раз');
  assert.ok(/textures\.exists/.test(bake), 'повторное запекание не создаёт текстуру заново');
});

test('декор стоит в полосах платформы, а не под грядками', () => {
  const decor = fs.readFileSync(decorPath, 'utf8');
  assert.ok(/decorGeometry/.test(decor), 'декор позиционируется из геометрии платформы');

  const frame = fs.readFileSync(framePath, 'utf8');
  assert.ok(/computeDecorBands/.test(frame), 'ширины полос считаются отдельно');
  assert.ok(/decorGeometry/.test(frame), 'геометрия полос отдаётся декору');
});

test('полосы декора не перекрывают HUD и не выходят за экран', () => {
  for (const s of SCREENS) {
    const L = computeLayout(s.w, s.h);
    const bands = computeDecorBands(L);
    assert.ok(bands.side >= 0 && bands.bottom >= 0, `${s.name}: отрицательная полоса`);

    // Полоса снизу должна закончиться ДО подсказки над тулбаром.
    const decorBottom = L.grid.bottom + bands.bottom;
    assert.ok(decorBottom <= L.hintY, `${s.name}: декор (${decorBottom}) заходит на подсказку (${L.hintY})`);

    // Боковые полосы не должны выходить за поля экрана.
    assert.ok(L.grid.x - bands.side >= 0, `${s.name}: левая полоса за краем`);
    assert.ok(L.grid.right + bands.side <= s.w, `${s.name}: правая полоса за краем`);
  }
});
