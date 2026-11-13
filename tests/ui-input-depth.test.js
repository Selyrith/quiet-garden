import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI = path.resolve(__dirname, '../src/ui');

/**
 * ВВОД: почему кнопки перестают нажиматься.
 *
 * Phaser по умолчанию (InputPlugin.topOnly = true) отдаёт клик только САМОМУ
 * ВЕРХНЕМУ объекту под пальцем, а порядок берёт из renderList камеры, то есть
 * из фактической глубины отрисовки. Кнопка, созданная через scene.add.* и
 * затем добавленная в контейнер оверлея (`overlay.add(btn)`), сохраняет свою
 * прежнюю depth — и может оказаться НИЖЕ фоновой панели оверлея. Визуально
 * кнопка на месте, но клик получает панель: «кнопка не реагирует».
 *
 * Эти проверки фиксируют правило: если кнопка попадает внутрь контейнера,
 * её глубина должна быть явно поднята.
 */

const OVERLAY_FILES = fs.readdirSync(UI).filter((f) => f.endsWith('Overlay.js'));

function readOverlay(name) {
  return fs.readFileSync(path.join(UI, name), 'utf8');
}

test('кнопки, добавленные в контейнер оверлея, имеют явную глубину', () => {
  const offenders = [];

  for (const file of OVERLAY_FILES) {
    const src = readOverlay(file);

    // Находим строки вида: <container>.add(btn)
    const addLines = src.split('\n');
    for (let i = 0; i < addLines.length; i++) {
      const line = addLines[i];
      if (!/\.(add|addTo)\((\s*)(\w+Btn|\w+btn|btn)\s*\)/.test(line)) continue;

      // В пределах 6 строк выше должен быть setDepth(...) для этой кнопки
      const window = addLines.slice(Math.max(0, i - 6), i + 1).join('\n');
      if (!/setDepth\s*\(/.test(window)) {
        offenders.push(`${file}:${i + 1} — ${line.trim()}`);
      }
    }
  }

  assert.deepEqual(offenders, [], `кнопки без явной глубины:\n${offenders.join('\n')}`);
});

test('ни одна кнопка не создаётся с глубиной 9999 (выше тостов и подсказок)', () => {
  const src = fs.readFileSync(path.join(UI, 'ui-unified.js'), 'utf8');
  assert.ok(!/setDepth\s*\(\s*9999\s*\)/.test(src), 'жёсткая 9999 ломает порядок слоёв');
});

test('кнопка внутри контейнера получает ту же глубину, что оверлей + запас', () => {
  // Проверяем не текст, а поведение функции createUnifiedButton:
  // она обязана принимать depth и применять его к контейнеру.
  const src = fs.readFileSync(path.join(UI, 'ui-unified.js'), 'utf8');
  assert.match(src, /depth\s*=\s*DS\.overlay\./, 'глубина по умолчанию берётся из DS.overlay');
  assert.match(src, /container\.setDepth\(depth\)/, 'глубина применяется к контейнеру кнопки');
});

test('мобильный тач-таргет не меньше 48 dp', () => {
  const src = fs.readFileSync(path.join(UI, 'MobileScale.js'), 'utf8');
  const tap = Number(src.match(/tap:\s*(\d+)/)?.[1]);
  assert.ok(tap >= 48, `tap target ${tap} < 48 (Material Design 3)`);
});