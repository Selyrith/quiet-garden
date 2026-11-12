import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, rowCenters, LAYOUT } from '../src/ui/Layout.js';

const SCREENS = [
  { name: 'iPhone SE', w: 320, h: 568 },
  { name: 'iPhone 14', w: 390, h: 844 },
  { name: 'iPad', w: 768, h: 1024 },
  { name: 'Desktop', w: 1920, h: 1080 },
];

test('сетка 8x8 целиком помещается на экран при любом размере', () => {
  for (const s of SCREENS) {
    const L = computeLayout(s.w, s.h);
    assert.equal(L.grid.size, L.grid.tileSize * 8, s.name);
    assert.ok(L.grid.tileSize >= LAYOUT.tileMin, `${s.name}: tile ${L.grid.tileSize} < ${LAYOUT.tileMin}`);
    assert.ok(L.grid.x >= 0, `${s.name}: grid.x=${L.grid.x} выходит влево`);
    assert.ok(L.grid.right <= s.w, `${s.name}: grid.right=${L.grid.right} > ${s.w}`);
    assert.ok(L.grid.y >= 0, `${s.name}: grid.y=${L.grid.y} выходит вверх`);
    assert.ok(L.grid.bottom <= s.h, `${s.name}: grid.bottom=${L.grid.bottom} > ${s.h}`);
  }
});

test('регресс отчёта: сетка 336 px больше не вылезает на экране 320 px', () => {
  const L = computeLayout(320, 568);
  assert.ok(L.grid.size <= 320 - L.margin * 2 + 1, `grid ${L.grid.size} не влезает в 320`);
  assert.ok(L.grid.right <= 320);
});

test('нижний стек не перекрывается: полка ниже панели инструментов', () => {
  for (const s of SCREENS) {
    const L = computeLayout(s.w, s.h);
    const toolTop = L.toolbar.y - L.toolbar.size / 2;
    assert.ok(toolTop < L.inventory.y, `${s.name}: toolbar.top=${toolTop} должен быть ВЫШЕ (меньше) shelf.y=${L.inventory.y}`);
    assert.ok(L.inventory.bottom <= s.h, `${s.name}: shelf.bottom=${L.inventory.bottom} > ${s.h}`);
  }
});

test('полка инвентаря не срезается снизу (было height-60 при высоте полки 72)', () => {
  for (const s of SCREENS) {
    const L = computeLayout(s.w, s.h);
    assert.equal(L.inventory.bottom, s.h - L.margin, s.name);
    assert.ok(L.inventory.h >= 64);
  }
});

test('верхняя панель и сетка не накладываются', () => {
  for (const s of SCREENS) {
    const L = computeLayout(s.w, s.h);
    assert.ok(L.grid.y > L.hudH, `${s.name}: grid.y=${L.grid.y} наезжает на hud ${L.hudH}`);
    assert.ok(L.signpost.y >= L.hudH, `${s.name}: signpost.y=${L.signpost.y} заезжает под hud ${L.hudH}`);
  }
});

test('нижняя кромка сетки не залезает под панель инструментов', () => {
  for (const s of SCREENS) {
    const L = computeLayout(s.w, s.h);
    assert.ok(L.grid.bottom <= L.toolbar.y - L.toolbar.size / 2, s.name);
  }
});

test('на узком экране боковые кнопки не конфликтуют с сеткой', () => {
  const narrow = computeLayout(320, 568);
  assert.equal(narrow.side.mode, 'row');
  assert.equal(narrow.rail, 0);
  assert.ok(narrow.grid.bottom < narrow.side.y - narrow.side.size / 2, 'сетка должна заканчиваться выше ряда кнопок');

  const wide = computeLayout(768, 1024);
  assert.equal(wide.side.mode, 'rail');
  assert.ok(wide.grid.right <= wide.w - wide.margin - wide.rail + 0.5, 'в рельсе сетка не должна выходить за rail');
});

test('кнопки наблюдения/питомца/эмоций всегда внутри экрана', () => {
  for (const s of SCREENS) {
    const L = computeLayout(s.w, s.h);
    for (const y of [L.side.emoteY, L.side.watchY, L.side.petY]) {
      assert.ok(y > 0 && y < s.h, `${s.name}: y=${y} вне экрана`);
    }
    assert.ok(L.side.x <= s.w && L.side.x >= 0);
  }
});

test('вырожденные размеры не ломают раскладку (NaN/отрицательные исключены)', () => {
  for (const [w, h] of [[1, 1], [200, 200], [320, 400], [2560, 1440], [360, 640], [280, 653]]) {
    const L = computeLayout(w, h);
    for (const v of [L.hudH, L.grid.tileSize, L.grid.x, L.grid.y, L.toolbar.y, L.inventory.y, L.hintY]) {
      assert.ok(Number.isFinite(v), `[${w}x${h}] не-число в раскладке`);
    }
    assert.ok(L.grid.tileSize >= LAYOUT.tileMin, `[${w}x${h}] tile ${L.grid.tileSize}`);
  }
});

test('rowCenters центрирует ряд кнопок и не даёт дыр', () => {
  const pts = rowCenters(4, 195, 400, 56, 8);
  assert.equal(pts.length, 4);
  assert.equal(pts[0].x + pts[3].x, pts[1].x + pts[2].x); // симметрия
  assert.equal(pts[1].x - pts[0].x, 64);
  assert.ok(pts.every((p) => p.y === 400));
});

test('раскладка детерминирована: один вход — один выход', () => {
  const a = JSON.stringify(computeLayout(390, 844));
  const b = JSON.stringify(computeLayout(390, 844));
  assert.equal(a, b);
});