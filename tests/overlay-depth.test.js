import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DS } from '../src/ui/DesignSystem.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI = path.resolve(__dirname, '../src/ui');

/**
 * Порядок оверлеев должен быть корректным ПО СВОЙСТВУ, а не случайным.
 *
 * До правки глубины задавались вручную и перекрывали друг друга:
 * PlantDetailOverlay (560) рисовался ПОВЕРХ BookOverlay (200), который его
 * открыл, а ShopOverlay (650) оказывался выше карточки растения.
 * Кнопки createUnifiedButton имели жёсткую глубину 9999 — выше всех оверлеев.
 */

test('overlay depths follow a strict, documented ordering', () => {
  const o = DS.overlay;
  // «Дочерние» окна всегда выше «родительских».
  assert.ok(o.detail > o.book, 'plant detail must render above the book');
  assert.ok(o.shop > o.menu, 'shop must render above the main menu');
  assert.ok(o.goals > o.menu, 'goals must render above the main menu');
  assert.ok(o.pack > o.shop, 'pack opening must render above the shop');
  // Выбор пола — самый верхний «блокирующий» слой.
  assert.ok(o.gender > o.pack, 'gender selection must be above gameplay overlays');
  // И ни один обычный оверлей не должен залезать в слой тостов/подсказок.
  // `fatal` — намеренное исключение: аварийное сообщение обязано быть
  // поверх всего, иначе игрок видит «мёртвый» экран без объяснения.
  for (const [name, value] of Object.entries(o)) {
    if (name === 'fatal') continue;
    assert.ok(
      value > DS.depth.toasts,
      `${name} (${value}) must stay above toasts (${DS.depth.toasts})`
    );
  }
  assert.ok(o.fatal > o.gender, 'fatal overlay is the topmost layer');
});

test('every overlay declares its depth from DS.overlay, not a magic number', () => {
  const offenders = [];
  for (const file of fs.readdirSync(UI)) {
    if (!file.endsWith('Overlay.js')) continue;
    const src = fs.readFileSync(path.join(UI, file), 'utf8');
    // ищем setDepth(<литерал>) — числовые «магические» глубины
    const m = src.match(/\.setDepth\((\d{2,})\)/g);
    if (m) offenders.push(`${file}: ${m.join(', ')}`);
  }
  assert.deepEqual(offenders, [], `hardcoded depths:\n${offenders.join('\n')}`);
});

test('DS.overlay exposes a fatal layer that nothing else may claim', () => {
  assert.equal(DS.overlay.fatal, 9999);
  const others = Object.entries(DS.overlay)
    .filter(([k]) => k !== 'fatal')
    .map(([, v]) => v);
  assert.ok(Math.max(...others) < DS.overlay.fatal);
});

test('unified buttons do not sit above every overlay', () => {
  const src = fs.readFileSync(path.join(UI, 'ui-unified.js'), 'utf8');
  assert.ok(!/setDepth\(9999\)/.test(src), 'must not hardcode 9999');
  assert.ok(/DS\.overlay/.test(src), 'button depth must come from DS.overlay');
});